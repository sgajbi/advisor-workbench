import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { useDpmCampaignSources } from "../../src/features/workbench/use-dpm-campaign-sources";
import { useDpmCampaignDefinitionsSource } from "../../src/features/workbench/use-dpm-campaign-definitions-source";
import { dpmCampaignQueryKeys } from "../../src/features/workbench/dpm-campaign-query-keys";
import {
  getDpmCampaignApprovalDecisions,
  getDpmCampaignAssignmentActions,
  getDpmCampaignAssignmentTasks,
  getDpmCampaignDefinitionLaunchPackage,
  getDpmCampaignDefinitionLifecycleEvents,
  getDpmCampaignDefinitionPreviewReadiness,
  getDpmCampaignMakerCheckerControls,
  listDpmCampaignDefinitions,
} from "../../src/features/workbench/dpm-wave-api";
import type { DpmCampaignDefinitionRow } from "../../src/features/workbench/dpm-wave-command-center-view-model";
import type {
  DpmCampaignDefinitionGatewayResponse,
  DpmCampaignWorkflowGatewayResponse,
} from "../../src/features/workbench/types";
import {
  createQueryClientWrapper,
  createTestQueryClient,
} from "../helpers/query-client-test-harness";

vi.mock("../../src/features/workbench/dpm-wave-api", () => ({
  getDpmCampaignApprovalDecisions: vi.fn(),
  getDpmCampaignAssignmentActions: vi.fn(),
  getDpmCampaignAssignmentTasks: vi.fn(),
  getDpmCampaignDefinitionLaunchHistory: vi.fn(),
  getDpmCampaignDefinitionLaunchPackage: vi.fn(),
  getDpmCampaignDefinitionLifecycleEvents: vi.fn(),
  getDpmCampaignDefinitionPreviewReadiness: vi.fn(),
  getDpmCampaignMakerCheckerControls: vi.fn(),
  listDpmCampaignDefinitions: vi.fn(),
}));

const rowA = campaignRow("campaign-a", "1");
const rowB = campaignRow("campaign-b", "2");

describe("useDpmCampaignSources", () => {
  beforeEach(() => vi.clearAllMocks());

  it("keeps a late prior-campaign response outside the selected campaign", async () => {
    const pendingA = deferred<DpmCampaignDefinitionGatewayResponse>();
    vi.mocked(getDpmCampaignDefinitionLifecycleEvents).mockImplementation(
      ({ campaignId }) =>
        campaignId === "campaign-a"
          ? pendingA.promise
          : Promise.resolve(definitionResponse("campaign-b")),
    );
    const queryClient = createTestQueryClient();
    queryClient.setDefaultOptions({
      queries: { retry: false, staleTime: 30_000 },
    });
    const { result, rerender } = renderHook(
      ({ selectedCampaign }) =>
        useDpmCampaignSources({
          selectedCampaign,
          initialCampaignKey: null,
          initialWorkflowEvidence: emptyWorkflowEvidence(),
        }),
      {
        initialProps: { selectedCampaign: rowA },
        wrapper: createQueryClientWrapper(queryClient),
      },
    );

    let requestA!: Promise<unknown>;
    act(() => {
      requestA = result.current.loadLifecycle(rowA);
    });
    rerender({ selectedCampaign: rowB });
    await act(async () => result.current.loadLifecycle(rowB));
    await waitFor(() =>
      expect(result.current.lifecycle?.data.campaign_id).toBe("campaign-b"),
    );
    await act(async () => pendingA.resolve(definitionResponse("campaign-a")));
    await requestA;
    expect(result.current.lifecycle?.data.campaign_id).toBe("campaign-b");
  });

  it("loads four governance sources into one exact campaign evidence record", async () => {
    const responses = ["approval", "action", "task", "control"].map(
      workflowResponse,
    );
    vi.mocked(getDpmCampaignApprovalDecisions).mockResolvedValue(responses[0]);
    vi.mocked(getDpmCampaignAssignmentActions).mockResolvedValue(responses[1]);
    vi.mocked(getDpmCampaignAssignmentTasks).mockResolvedValue(responses[2]);
    vi.mocked(getDpmCampaignMakerCheckerControls).mockResolvedValue(
      responses[3],
    );
    const { result } = renderHook(
      () =>
        useDpmCampaignSources({
          selectedCampaign: rowA,
          initialCampaignKey: null,
          initialWorkflowEvidence: emptyWorkflowEvidence(),
        }),
      { wrapper: createQueryClientWrapper() },
    );

    await act(async () => result.current.loadWorkflow(rowA));
    await waitFor(() =>
      expect(result.current.workflow?.approvalDecisions).toBe(responses[0]),
    );
    expect(result.current.workflow?.makerCheckerControls).toBe(responses[3]);
  });

  it("publishes a newer server definitions response over retained query data", async () => {
    const queryClient = createTestQueryClient();
    const prior = definitionResponse("campaign-prior");
    const current = definitionResponse("campaign-current");
    queryClient.setQueryData(dpmCampaignQueryKeys.definitions(), prior);

    const { result } = renderHook(
      () => useDpmCampaignDefinitionsSource(current, "source-read-current"),
      { wrapper: createQueryClientWrapper(queryClient) },
    );

    await waitFor(() => expect(result.current).toEqual(current));
    expect(result.current?.correlation_id).toBe("corr-campaign-current");
    expect(
      queryClient.getQueryData(dpmCampaignQueryKeys.definitions()),
    ).toEqual(current);
  });

  it("suppresses retained definitions when the current server read is unavailable", () => {
    const queryClient = createTestQueryClient();
    queryClient.setQueryData(
      dpmCampaignQueryKeys.definitions(),
      definitionResponse("campaign-prior"),
    );

    const { result } = renderHook(
      () => useDpmCampaignDefinitionsSource(null, "source-read-unavailable"),
      { wrapper: createQueryClientWrapper(queryClient) },
    );

    expect(result.current).toBeNull();
  });

  it("publishes newer server workflow evidence over retained query data", async () => {
    const queryClient = createTestQueryClient();
    const prior = ["approval-old", "action-old", "task-old", "control-old"].map(
      workflowResponse,
    );
    const current = ["approval-new", "action-new", "task-new", "control-new"].map(
      workflowResponse,
    );
    queryClient.setQueryData(dpmCampaignQueryKeys.workflow(rowA), {
      approvalDecisions: prior[0],
      assignmentActions: prior[1],
      assignmentTasks: prior[2],
      makerCheckerControls: prior[3],
    });

    const { result } = renderHook(
      () =>
        useDpmCampaignSources({
          selectedCampaign: rowA,
          initialCampaignKey: rowA.key,
          initialWorkflowEvidence: {
            readId: "workflow-read-new",
            approvalDecisions: current[0],
            assignmentActions: current[1],
            assignmentTasks: current[2],
            makerCheckerControls: current[3],
          },
        }),
      { wrapper: createQueryClientWrapper(queryClient) },
    );

    await waitFor(() =>
      expect(result.current.workflow?.approvalDecisions).toEqual(current[0]),
    );
    expect(
      result.current.workflow?.approvalDecisions.data.items,
    ).toEqual([{ evidence_ref: "approval-new" }]);
    expect(
      queryClient.getQueryData<{
        approvalDecisions: DpmCampaignWorkflowGatewayResponse;
      }>(dpmCampaignQueryKeys.workflow(rowA))?.approvalDecisions,
    ).toEqual(current[0]);
  });

  it("preserves client-confirmed workflow evidence when the initial campaign is reselected", async () => {
    const initial = ["approval-old", "action-old", "task-old", "control-old"].map(
      workflowResponse,
    );
    const confirmed = ["approval-new", "action-new", "task-new", "control-new"].map(
      workflowResponse,
    );
    vi.mocked(getDpmCampaignApprovalDecisions).mockResolvedValue(confirmed[0]);
    vi.mocked(getDpmCampaignAssignmentActions).mockResolvedValue(confirmed[1]);
    vi.mocked(getDpmCampaignAssignmentTasks).mockResolvedValue(confirmed[2]);
    vi.mocked(getDpmCampaignMakerCheckerControls).mockResolvedValue(confirmed[3]);
    const queryClient = createTestQueryClient();
    const { result, rerender } = renderHook(
      ({ selectedCampaign }) =>
        useDpmCampaignSources({
          selectedCampaign,
          initialCampaignKey: rowA.key,
          initialWorkflowEvidence: {
            readId: "workflow-read-1",
            approvalDecisions: initial[0],
            assignmentActions: initial[1],
            assignmentTasks: initial[2],
            makerCheckerControls: initial[3],
          },
        }),
      {
        initialProps: { selectedCampaign: rowA },
        wrapper: createQueryClientWrapper(queryClient),
      },
    );
    await waitFor(() =>
      expect(
        queryClient.getQueryData<{ readId: string }>(
          dpmCampaignQueryKeys.workflowServerRead(rowA),
        )?.readId,
      ).toBe("workflow-read-1"),
    );

    await act(async () => result.current.refreshWorkflow(rowA));
    await waitFor(() =>
      expect(result.current.workflow?.approvalDecisions).toEqual(confirmed[0]),
    );

    rerender({ selectedCampaign: rowB });
    rerender({ selectedCampaign: rowA });

    expect(result.current.workflow?.approvalDecisions).toEqual(confirmed[0]);
    expect(getDpmCampaignApprovalDecisions).toHaveBeenCalledTimes(1);
  });

  it("fences an in-flight client workflow read before admitting a newer server read", async () => {
    const initial = ["approval-old", "action-old", "task-old", "control-old"].map(
      workflowResponse,
    );
    const server = ["approval-server", "action-server", "task-server", "control-server"].map(
      workflowResponse,
    );
    const obsoleteReads = ["approval", "action", "task", "control"].map(() =>
      deferred<DpmCampaignWorkflowGatewayResponse>(),
    );
    vi.mocked(getDpmCampaignApprovalDecisions).mockReturnValue(
      obsoleteReads[0].promise,
    );
    vi.mocked(getDpmCampaignAssignmentActions).mockReturnValue(
      obsoleteReads[1].promise,
    );
    vi.mocked(getDpmCampaignAssignmentTasks).mockReturnValue(
      obsoleteReads[2].promise,
    );
    vi.mocked(getDpmCampaignMakerCheckerControls).mockReturnValue(
      obsoleteReads[3].promise,
    );
    const queryClient = createTestQueryClient();
    const { result, rerender } = renderHook(
      ({ readId, evidence }) =>
        useDpmCampaignSources({
          selectedCampaign: rowA,
          initialCampaignKey: rowA.key,
          initialWorkflowEvidence: {
            readId,
            approvalDecisions: evidence[0],
            assignmentActions: evidence[1],
            assignmentTasks: evidence[2],
            makerCheckerControls: evidence[3],
          },
        }),
      {
        initialProps: { readId: "workflow-read-1", evidence: initial },
        wrapper: createQueryClientWrapper(queryClient),
      },
    );
    await waitFor(() =>
      expect(
        queryClient.getQueryData<{ readId: string }>(
          dpmCampaignQueryKeys.workflowServerRead(rowA),
        )?.readId,
      ).toBe("workflow-read-1"),
    );

    let obsoleteRefresh!: Promise<unknown>;
    act(() => {
      obsoleteRefresh = result.current.refreshWorkflow(rowA).catch(() => undefined);
    });
    await waitFor(() =>
      expect(getDpmCampaignApprovalDecisions).toHaveBeenCalledTimes(1),
    );

    rerender({ readId: "workflow-read-2", evidence: server });
    expect(result.current.workflow?.approvalDecisions).toEqual(server[0]);
    await waitFor(() =>
      expect(
        queryClient.getQueryData<{
          approvalDecisions: DpmCampaignWorkflowGatewayResponse;
        }>(dpmCampaignQueryKeys.workflow(rowA))?.approvalDecisions,
      ).toEqual(server[0]),
    );

    obsoleteReads.forEach((pending, index) =>
      pending.resolve(workflowResponse(`obsolete-${index}`)),
    );
    await obsoleteRefresh;

    expect(result.current.workflow?.approvalDecisions).toEqual(server[0]);
    expect(
      queryClient.getQueryData<{
        approvalDecisions: DpmCampaignWorkflowGatewayResponse;
      }>(dpmCampaignQueryKeys.workflow(rowA))?.approvalDecisions,
    ).toEqual(server[0]);
  });

  it("keeps confirmed workflow evidence ahead of a late pre-command navigation snapshot", async () => {
    const beforeCommand = ["approval-before", "action-before", "task-before", "control-before"].map(
      workflowResponse,
    );
    const confirmed = [
      "approval-confirmed",
      "action-confirmed",
      "task-confirmed",
      "control-confirmed",
    ].map(workflowResponse);
    vi.mocked(getDpmCampaignApprovalDecisions).mockResolvedValue(confirmed[0]);
    vi.mocked(getDpmCampaignAssignmentActions).mockResolvedValue(confirmed[1]);
    vi.mocked(getDpmCampaignAssignmentTasks).mockResolvedValue(confirmed[2]);
    vi.mocked(getDpmCampaignMakerCheckerControls).mockResolvedValue(confirmed[3]);
    const queryClient = createTestQueryClient();
    const { result, rerender } = renderHook(
      ({ readId, evidence }) =>
        useDpmCampaignSources({
          selectedCampaign: rowA,
          initialCampaignKey: rowA.key,
          initialWorkflowEvidence: {
            readId,
            approvalDecisions: evidence[0],
            assignmentActions: evidence[1],
            assignmentTasks: evidence[2],
            makerCheckerControls: evidence[3],
          },
        }),
      {
        initialProps: {
          readId: "navigation-before-command",
          evidence: beforeCommand,
        },
        wrapper: createQueryClientWrapper(queryClient),
      },
    );
    await waitFor(() =>
      expect(
        queryClient.getQueryData<{ readId: string }>(
          dpmCampaignQueryKeys.workflowServerRead(rowA),
        )?.readId,
      ).toBe("navigation-before-command"),
    );

    await act(async () =>
      result.current.refreshWorkflow(rowA, {
        evidenceRef: "task-confirmed",
        source: "assignmentTasks",
        transition: false,
      }),
    );
    await waitFor(() =>
      expect(result.current.workflow?.assignmentTasks).toEqual(confirmed[2]),
    );

    rerender({
      readId: "navigation-finishes-after-command",
      evidence: beforeCommand,
    });
    expect(result.current.workflow?.assignmentTasks).toEqual(confirmed[2]);
    await waitFor(() =>
      expect(
        queryClient.getQueryData<{ readId: string }>(
          dpmCampaignQueryKeys.workflowServerRead(rowA),
        )?.readId,
      ).toBe("navigation-finishes-after-command"),
    );
    expect(
      queryClient.getQueryData<{
        assignmentTasks: DpmCampaignWorkflowGatewayResponse;
      }>(dpmCampaignQueryKeys.workflow(rowA))?.assignmentTasks,
    ).toEqual(confirmed[2]);

    const afterCommandPage = {
      ...beforeCommand[2],
      correlation_id: "corr-task-after-command-page",
      data: {
        items: [{ task_ref: "newer-task-outside-confirmation-page" }],
        total_count: 12,
      },
    };
    rerender({
      readId: "navigation-after-receipt-paged-out",
      evidence: [
        beforeCommand[0],
        beforeCommand[1],
        afterCommandPage,
        beforeCommand[3],
      ],
    });
    expect(result.current.workflow?.assignmentTasks).toEqual(afterCommandPage);
    await waitFor(() =>
      expect(
        queryClient.getQueryData<{
          assignmentTasks: DpmCampaignWorkflowGatewayResponse;
        }>(dpmCampaignQueryKeys.workflow(rowA))?.assignmentTasks,
      ).toEqual(afterCommandPage),
    );
  });

  it("does not confirm a task transition from the pre-existing task reference", async () => {
    const beforeTransition = [
      "approval-before",
      "action-before",
      "task-before",
      "control-before",
    ].map(workflowResponse);
    const taskWithoutTransition = {
      ...workflowResponse("task-review-001"),
      data: {
        items: [{ task_ref: "task-review-001" }],
        total_count: 1,
      },
    };
    vi.mocked(getDpmCampaignApprovalDecisions).mockResolvedValue(
      beforeTransition[0],
    );
    vi.mocked(getDpmCampaignAssignmentActions).mockResolvedValue(
      beforeTransition[1],
    );
    vi.mocked(getDpmCampaignAssignmentTasks).mockResolvedValue(
      taskWithoutTransition,
    );
    vi.mocked(getDpmCampaignMakerCheckerControls).mockResolvedValue(
      beforeTransition[3],
    );
    const { result } = renderHook(
      () =>
        useDpmCampaignSources({
          selectedCampaign: rowA,
          initialCampaignKey: rowA.key,
          initialWorkflowEvidence: {
            readId: "before-transition",
            approvalDecisions: beforeTransition[0],
            assignmentActions: beforeTransition[1],
            assignmentTasks: taskWithoutTransition,
            makerCheckerControls: beforeTransition[3],
          },
        }),
      { wrapper: createQueryClientWrapper() },
    );

    await act(async () => {
      await result.current
        .refreshWorkflow(rowA, {
          evidenceRef: "task-review-001:acknowledged",
          source: "assignmentTasks",
          transition: true,
        })
        .catch(() => undefined);
    });

    await waitFor(() =>
      expect(result.current.workflowError).toContain(
        "Governance action was recorded",
      ),
    );
  });

  it("suppresses retained workflow when current source evidence is incomplete", async () => {
    const queryClient = createTestQueryClient();
    const prior = ["approval-old", "action-old", "task-old", "control-old"].map(
      workflowResponse,
    );
    const current = ["approval-new", "action-new", "task-new", "control-new"].map(
      workflowResponse,
    );
    queryClient.setQueryData(dpmCampaignQueryKeys.workflow(rowA), {
      approvalDecisions: prior[0],
      assignmentActions: prior[1],
      assignmentTasks: prior[2],
      makerCheckerControls: prior[3],
    });
    vi.mocked(getDpmCampaignApprovalDecisions).mockResolvedValue(current[0]);
    vi.mocked(getDpmCampaignAssignmentActions).mockResolvedValue(current[1]);
    vi.mocked(getDpmCampaignAssignmentTasks).mockResolvedValue(current[2]);
    vi.mocked(getDpmCampaignMakerCheckerControls).mockResolvedValue(current[3]);

    const { result } = renderHook(
      () =>
        useDpmCampaignSources({
          selectedCampaign: rowA,
          initialCampaignKey: rowA.key,
          initialWorkflowEvidence: {
            readId: "workflow-read-incomplete",
            approvalDecisions: current[0],
            assignmentActions: null,
            assignmentTasks: current[2],
            makerCheckerControls: current[3],
          },
        }),
      { wrapper: createQueryClientWrapper(queryClient) },
    );

    expect(result.current.workflow).toBeNull();
    expect(result.current.workflowResolved).toBe(false);
    await waitFor(() => expect(result.current.workflowPending).toBe(false));

    await act(async () => result.current.loadWorkflow(rowA));
    await waitFor(() =>
      expect(result.current.workflow?.assignmentActions).toEqual(current[1]),
    );
    expect(result.current.workflowResolved).toBe(true);
  });

  it("requires recovery again when a new server read repeats unavailable workflow evidence", async () => {
    const current = ["approval-new", "action-new", "task-new", "control-new"].map(
      workflowResponse,
    );
    vi.mocked(getDpmCampaignApprovalDecisions).mockResolvedValue(current[0]);
    vi.mocked(getDpmCampaignAssignmentActions).mockResolvedValue(current[1]);
    vi.mocked(getDpmCampaignAssignmentTasks).mockResolvedValue(current[2]);
    vi.mocked(getDpmCampaignMakerCheckerControls).mockResolvedValue(current[3]);
    const queryClient = createTestQueryClient();
    const { result, rerender } = renderHook(
      ({ readId }) =>
        useDpmCampaignSources({
          selectedCampaign: rowA,
          initialCampaignKey: rowA.key,
          initialWorkflowEvidence: {
            ...emptyWorkflowEvidence(),
            readId,
          },
        }),
      {
        initialProps: { readId: "workflow-read-1" },
        wrapper: createQueryClientWrapper(queryClient),
      },
    );

    expect(result.current.workflow).toBeNull();
    expect(result.current.workflowResolved).toBe(false);
    await waitFor(() => expect(result.current.workflowPending).toBe(false));

    await act(async () => result.current.loadWorkflow(rowA));
    await waitFor(() => expect(result.current.workflowResolved).toBe(true));

    rerender({ readId: "workflow-read-2" });

    expect(result.current.workflow).toBeNull();
    expect(result.current.workflowResolved).toBe(false);
    await waitFor(() =>
      expect(
        queryClient.getQueryData(dpmCampaignQueryKeys.workflow(rowA)),
      ).toBeUndefined(),
    );
  });

  it("keeps workflow confirmation locked when lifecycle recovery succeeds", async () => {
    vi.mocked(getDpmCampaignApprovalDecisions).mockRejectedValue(
      new Error("Workflow evidence unavailable"),
    );
    vi.mocked(getDpmCampaignAssignmentActions).mockResolvedValue(
      workflowResponse("action"),
    );
    vi.mocked(getDpmCampaignAssignmentTasks).mockResolvedValue(
      workflowResponse("task"),
    );
    vi.mocked(getDpmCampaignMakerCheckerControls).mockResolvedValue(
      workflowResponse("control"),
    );
    vi.mocked(getDpmCampaignDefinitionLifecycleEvents).mockResolvedValue(
      definitionResponse("campaign-a"),
    );
    vi.mocked(listDpmCampaignDefinitions).mockResolvedValue(
      definitionResponse("campaign-a"),
    );
    const { result } = renderHook(
      () =>
        useDpmCampaignSources({
          selectedCampaign: rowA,
          initialCampaignKey: null,
          initialWorkflowEvidence: emptyWorkflowEvidence(),
        }),
      { wrapper: createQueryClientWrapper() },
    );

    await act(async () => {
      await result.current.refreshWorkflow(rowA).catch(() => undefined);
    });
    await waitFor(() =>
      expect(result.current.workflowError).toContain(
        "Governance action was recorded",
      ),
    );
    await act(async () => result.current.refreshLifecycle(rowA));

    expect(result.current.lifecycleError).toBeNull();
    expect(result.current.workflowError).toContain(
      "Governance action was recorded",
    );
  });

  it("does not publish refreshed definitions when lifecycle confirmation fails", async () => {
    const queryClient = createTestQueryClient();
    const priorDefinitions = definitionResponse("campaign-prior");
    queryClient.setQueryData(
      dpmCampaignQueryKeys.definitions(),
      priorDefinitions,
    );
    vi.mocked(getDpmCampaignDefinitionLifecycleEvents).mockRejectedValue(
      new Error("Lifecycle evidence unavailable"),
    );
    vi.mocked(listDpmCampaignDefinitions).mockResolvedValue(
      definitionResponse("campaign-refreshed"),
    );
    const { result } = renderHook(
      () =>
        useDpmCampaignSources({
          selectedCampaign: rowA,
          initialCampaignKey: null,
          initialWorkflowEvidence: emptyWorkflowEvidence(),
        }),
      { wrapper: createQueryClientWrapper(queryClient) },
    );

    await act(async () => {
      await result.current.refreshLifecycle(rowA).catch(() => undefined);
    });

    expect(
      queryClient.getQueryData(dpmCampaignQueryKeys.definitions()),
    ).toEqual(priorDefinitions);
    expect(result.current.lifecycle).toBeNull();
    await waitFor(() =>
      expect(result.current.lifecycleError).toContain(
        "Lifecycle action was recorded",
      ),
    );
  });

  it("reuses the retained lifecycle receipt when confirmation is retried", async () => {
    const queryClient = createTestQueryClient();
    const confirmedDefinitions = definitionListResponse("SUPERSEDED", "2");
    queryClient.setQueryData(
      dpmCampaignQueryKeys.definitions(),
      confirmedDefinitions,
    );
    queryClient.setQueryData(
      dpmCampaignQueryKeys.lifecycleConfirmationReceipt(rowA),
      {
        campaignId: rowA.campaignId,
        campaignVersion: rowA.campaignVersion,
        status: "SUPERSEDED",
        replacementCampaignVersion: "2",
      },
    );
    queryClient.setQueryData(
      dpmCampaignQueryKeys.confirmationLock(rowA, "lifecycle"),
      { message: "Awaiting source confirmation." },
    );
    vi.mocked(getDpmCampaignDefinitionLifecycleEvents).mockResolvedValue(
      definitionResponse("campaign-a", "ACTIVE"),
    );
    vi.mocked(listDpmCampaignDefinitions).mockResolvedValue(
      definitionListResponse("ACTIVE"),
    );
    const { result } = renderHook(
      () =>
        useDpmCampaignSources({
          selectedCampaign: rowA,
          initialCampaignKey: null,
          initialWorkflowEvidence: emptyWorkflowEvidence(),
        }),
      { wrapper: createQueryClientWrapper(queryClient) },
    );

    await act(async () => {
      await result.current.loadLifecycle(rowA).catch(() => undefined);
    });

    expect(
      queryClient.getQueryData(dpmCampaignQueryKeys.definitions()),
    ).toEqual(confirmedDefinitions);
    expect(result.current.lifecycle).toBeNull();
    await waitFor(() =>
      expect(result.current.lifecycleError).toContain(
        "Lifecycle action was recorded",
      ),
    );
  });

  it("does not use another campaign receipt to clear a retained lifecycle lock", async () => {
    const queryClient = createTestQueryClient();
    const confirmedDefinitions = definitionListResponse("SUPERSEDED", "2");
    queryClient.setQueryData(
      dpmCampaignQueryKeys.definitions(),
      confirmedDefinitions,
    );
    queryClient.setQueryData(
      dpmCampaignQueryKeys.lifecycleConfirmationReceipt(rowA),
      {
        campaignId: rowA.campaignId,
        campaignVersion: rowA.campaignVersion,
        status: "SUPERSEDED",
        replacementCampaignVersion: "2",
      },
    );
    queryClient.setQueryData(
      dpmCampaignQueryKeys.lifecycleConfirmationReceipt(rowB),
      {
        campaignId: rowB.campaignId,
        campaignVersion: rowB.campaignVersion,
        status: "SUPERSEDED",
        replacementCampaignVersion: "3",
      },
    );
    queryClient.setQueryData(
      dpmCampaignQueryKeys.confirmationLock(rowA, "lifecycle"),
      { message: "Awaiting source confirmation." },
    );
    vi.mocked(getDpmCampaignDefinitionLifecycleEvents).mockResolvedValue(
      definitionResponse("campaign-a", "ACTIVE"),
    );
    vi.mocked(listDpmCampaignDefinitions).mockResolvedValue({
      ...definitionResponse("campaign-b"),
      data: {
        items: [
          {
            campaign_id: "campaign-b",
            campaign_version: "2",
            status: "SUPERSEDED",
            superseded_by_campaign_version: "3",
          },
        ],
      },
    });
    const { result } = renderHook(
      () =>
        useDpmCampaignSources({
          selectedCampaign: rowA,
          initialCampaignKey: null,
          initialWorkflowEvidence: emptyWorkflowEvidence(),
        }),
      { wrapper: createQueryClientWrapper(queryClient) },
    );

    await act(async () => {
      await result.current.loadLifecycle(rowA).catch(() => undefined);
    });

    expect(
      queryClient.getQueryData(dpmCampaignQueryKeys.definitions()),
    ).toEqual(confirmedDefinitions);
    expect(result.current.lifecycle).toBeNull();
    await waitFor(() =>
      expect(result.current.lifecycleError).toContain(
        "Lifecycle action was recorded",
      ),
    );
  });

  it("deduplicates concurrent lifecycle confirmation reads", async () => {
    const pendingLifecycle = deferred<DpmCampaignDefinitionGatewayResponse>();
    vi.mocked(getDpmCampaignDefinitionLifecycleEvents).mockReturnValue(
      pendingLifecycle.promise,
    );
    vi.mocked(listDpmCampaignDefinitions).mockResolvedValue(
      definitionResponse("campaign-refreshed"),
    );
    const { result } = renderHook(
      () =>
        useDpmCampaignSources({
          selectedCampaign: rowA,
          initialCampaignKey: null,
          initialWorkflowEvidence: emptyWorkflowEvidence(),
        }),
      { wrapper: createQueryClientWrapper() },
    );

    let first!: Promise<unknown>;
    let second!: Promise<unknown>;
    act(() => {
      first = result.current.refreshLifecycle(rowA);
      second = result.current.refreshLifecycle(rowA);
    });
    await waitFor(() => expect(result.current.lifecyclePending).toBe(true));
    expect(getDpmCampaignDefinitionLifecycleEvents).toHaveBeenCalledTimes(1);
    expect(listDpmCampaignDefinitions).toHaveBeenCalledTimes(2);

    pendingLifecycle.resolve(definitionResponse("campaign-a", "CONFIRMED"));
    await act(async () => Promise.all([first, second]));

    await waitFor(() => expect(result.current.lifecyclePending).toBe(false));
    expect(result.current.lifecycle?.data.status).toBe("CONFIRMED");
  });

  it("keeps an older lifecycle confirmation behind a newer server definitions read", async () => {
    const pendingLifecycle = deferred<DpmCampaignDefinitionGatewayResponse>();
    const earlierDefinitions = definitionResponse("campaign-earlier", "PENDING");
    const newerDefinitions = definitionResponse("campaign-newer", "CONFIRMED");
    vi.mocked(getDpmCampaignDefinitionLifecycleEvents).mockReturnValue(
      pendingLifecycle.promise,
    );
    vi.mocked(listDpmCampaignDefinitions).mockResolvedValue(earlierDefinitions);
    const queryClient = createTestQueryClient();
    const { result, rerender } = renderHook(
      ({ definitions, readId }) => ({
        definitions: useDpmCampaignDefinitionsSource(definitions, readId),
        sources: useDpmCampaignSources({
          selectedCampaign: rowA,
          initialCampaignKey: null,
          initialWorkflowEvidence: emptyWorkflowEvidence(),
        }),
      }),
      {
        initialProps: {
          definitions: earlierDefinitions,
          readId: "source-read-earlier",
        },
        wrapper: createQueryClientWrapper(queryClient),
      },
    );
    await waitFor(() =>
      expect(
        queryClient.getQueryData<{ readId: string }>(
          dpmCampaignQueryKeys.definitionsServerRead(),
        )?.readId,
      ).toBe("source-read-earlier"),
    );

    let earlierConfirmation!: Promise<unknown>;
    act(() => {
      earlierConfirmation = result.current.sources
        .refreshLifecycle(rowA)
        .catch(() => undefined);
    });
    await waitFor(() =>
      expect(getDpmCampaignDefinitionLifecycleEvents).toHaveBeenCalledTimes(1),
    );

    rerender({
      definitions: newerDefinitions,
      readId: "source-read-newer",
    });
    await waitFor(() =>
      expect(
        queryClient.getQueryData<DpmCampaignDefinitionGatewayResponse>(
          dpmCampaignQueryKeys.definitions(),
        ),
      ).toEqual(newerDefinitions),
    );

    pendingLifecycle.resolve(definitionResponse("campaign-a", "OBSOLETE"));
    await earlierConfirmation;

    expect(result.current.definitions).toEqual(newerDefinitions);
    expect(
      queryClient.getQueryData(dpmCampaignQueryKeys.definitions()),
    ).toEqual(newerDefinitions);
    expect(result.current.sources.lifecycle).toBeNull();
  });

  it("publishes the full active collection after exact lifecycle confirmation", async () => {
    const beforeCommand = definitionListResponse("ACTIVE");
    const confirmedDefinitions = definitionListResponse("SUPERSEDED", "2");
    const activeDefinitions = {
      ...definitionListResponse("ACTIVE"),
      correlation_id: "corr-active-after-command",
      data: {
        items: [
          {
            campaign_id: "campaign-b",
            campaign_version: "2",
            status: "ACTIVE",
          },
        ],
      },
    };
    const reconciledDefinitions = {
      ...activeDefinitions,
      data: {
        items: [
          ...(confirmedDefinitions.data.items as Array<Record<string, unknown>>),
          ...(activeDefinitions.data.items as Array<Record<string, unknown>>),
        ],
      },
    };
    vi.mocked(getDpmCampaignDefinitionLifecycleEvents).mockResolvedValue(
      definitionResponse("campaign-a", "SUPERSEDED"),
    );
    vi.mocked(listDpmCampaignDefinitions)
      .mockResolvedValueOnce(confirmedDefinitions)
      .mockResolvedValueOnce(activeDefinitions);
    const queryClient = createTestQueryClient();
    const { result, rerender } = renderHook(
      ({ definitions, readId }) => ({
        definitions: useDpmCampaignDefinitionsSource(definitions, readId),
        sources: useDpmCampaignSources({
          selectedCampaign: rowA,
          initialCampaignKey: null,
          initialWorkflowEvidence: emptyWorkflowEvidence(),
        }),
      }),
      {
        initialProps: {
          definitions: beforeCommand,
          readId: "definitions-before-command",
        },
        wrapper: createQueryClientWrapper(queryClient),
      },
    );
    await waitFor(() =>
      expect(
        queryClient.getQueryData<{ readId: string }>(
          dpmCampaignQueryKeys.definitionsServerRead(),
        )?.readId,
      ).toBe("definitions-before-command"),
    );

    await act(async () =>
      result.current.sources.refreshLifecycle(rowA, {
        campaignId: rowA.campaignId,
        campaignVersion: rowA.campaignVersion,
        status: "SUPERSEDED",
        replacementCampaignVersion: "2",
      }),
    );
    await waitFor(() =>
      expect(result.current.definitions).toEqual(reconciledDefinitions),
    );

    rerender({
      definitions: beforeCommand,
      readId: "definitions-finishes-after-command",
    });
    expect(result.current.definitions).toEqual(reconciledDefinitions);
    await waitFor(() =>
      expect(
        queryClient.getQueryData<{ readId: string }>(
          dpmCampaignQueryKeys.definitionsServerRead(),
        )?.readId,
      ).toBe("definitions-finishes-after-command"),
    );
    expect(
      queryClient.getQueryData(dpmCampaignQueryKeys.definitions()),
    ).toEqual(reconciledDefinitions);

    const activeListAfterTerminalRemoval = {
      ...confirmedDefinitions,
      correlation_id: "corr-active-list-after-terminal-removal",
      data: activeDefinitions.data,
    };
    rerender({
      definitions: activeListAfterTerminalRemoval,
      readId: "definitions-after-terminal-removal",
    });
    await waitFor(() =>
      expect(result.current.definitions).toEqual(
        activeListAfterTerminalRemoval,
      ),
    );
    expect(
      queryClient.getQueryData(dpmCampaignQueryKeys.definitions()),
    ).toEqual(activeListAfterTerminalRemoval);
  });

  it("clears a prior launch package when newer readiness blocks launch", async () => {
    vi.mocked(getDpmCampaignDefinitionPreviewReadiness)
      .mockResolvedValueOnce(readinessResponse("READY"))
      .mockResolvedValueOnce(readinessResponse("BLOCKED"));
    vi.mocked(getDpmCampaignDefinitionLaunchPackage).mockResolvedValue(
      definitionResponse("campaign-a"),
    );
    const { result } = renderHook(
      () =>
        useDpmCampaignSources({
          selectedCampaign: rowA,
          initialCampaignKey: null,
          initialWorkflowEvidence: emptyWorkflowEvidence(),
        }),
      { wrapper: createQueryClientWrapper() },
    );

    await act(async () => result.current.loadLaunchReadiness(rowA));
    await waitFor(() => expect(result.current.launchPackage).not.toBeNull());

    await act(async () => result.current.loadLaunchReadiness(rowA));

    await waitFor(() => {
      expect(result.current.previewReadiness?.data.supportability_state).toBe(
        "BLOCKED",
      );
      expect(result.current.launchPackage).toBeNull();
    });
    expect(getDpmCampaignDefinitionLaunchPackage).toHaveBeenCalledTimes(1);
  });

  it("clears a prior launch package when renewed package evidence fails", async () => {
    vi.mocked(getDpmCampaignDefinitionPreviewReadiness).mockResolvedValue(
      readinessResponse("READY"),
    );
    vi.mocked(getDpmCampaignDefinitionLaunchPackage)
      .mockResolvedValueOnce(definitionResponse("campaign-a"))
      .mockRejectedValueOnce(new Error("Launch package unavailable"));
    const { result } = renderHook(
      () =>
        useDpmCampaignSources({
          selectedCampaign: rowA,
          initialCampaignKey: null,
          initialWorkflowEvidence: emptyWorkflowEvidence(),
        }),
      { wrapper: createQueryClientWrapper() },
    );

    await act(async () => result.current.loadLaunchReadiness(rowA));
    await waitFor(() => expect(result.current.launchPackage).not.toBeNull());

    await act(async () => {
      await result.current.loadLaunchReadiness(rowA).catch(() => undefined);
    });

    await waitFor(() => {
      expect(result.current.launchPackage).toBeNull();
      expect(result.current.launchPackageError).toBe(
        "Launch package unavailable",
      );
    });
  });

  it("does not restore cached launch authorization after a workspace remount", async () => {
    vi.mocked(getDpmCampaignDefinitionPreviewReadiness).mockResolvedValue(
      readinessResponse("READY"),
    );
    vi.mocked(getDpmCampaignDefinitionLaunchPackage).mockResolvedValue(
      definitionResponse("campaign-a"),
    );
    const queryClient = createTestQueryClient();
    const first = renderHook(
      () =>
        useDpmCampaignSources({
          selectedCampaign: rowA,
          initialCampaignKey: null,
          initialWorkflowEvidence: emptyWorkflowEvidence(),
        }),
      { wrapper: createQueryClientWrapper(queryClient) },
    );

    await act(async () => first.result.current.loadLaunchReadiness(rowA));
    await waitFor(() => expect(first.result.current.launchPackage).not.toBeNull());
    first.unmount();
    await waitFor(() =>
      expect(
        queryClient.getQueryData(
          dpmCampaignQueryKeys.launchPackage(rowA, rowA.asOfDate),
        ),
      ).toBeUndefined(),
    );

    const second = renderHook(
      () =>
        useDpmCampaignSources({
          selectedCampaign: rowA,
          initialCampaignKey: null,
          initialWorkflowEvidence: emptyWorkflowEvidence(),
        }),
      { wrapper: createQueryClientWrapper(queryClient) },
    );
    expect(second.result.current.previewReadiness).toBeNull();
    expect(second.result.current.launchPackage).toBeNull();
  });

  it("supersedes an in-flight lifecycle read before post-command confirmation", async () => {
    const priorRead = deferred<DpmCampaignDefinitionGatewayResponse>();
    const confirmed = definitionResponse("campaign-a", "CONFIRMED");
    vi.mocked(getDpmCampaignDefinitionLifecycleEvents)
      .mockImplementationOnce(() => priorRead.promise)
      .mockResolvedValueOnce(confirmed);
    vi.mocked(listDpmCampaignDefinitions).mockResolvedValue(
      definitionResponse("campaign-a"),
    );
    const { result } = renderHook(
      () =>
        useDpmCampaignSources({
          selectedCampaign: rowA,
          initialCampaignKey: null,
          initialWorkflowEvidence: emptyWorkflowEvidence(),
        }),
      { wrapper: createQueryClientWrapper() },
    );

    let obsoleteRead!: Promise<unknown>;
    act(() => {
      obsoleteRead = result.current.loadLifecycle(rowA).catch(() => undefined);
    });
    await waitFor(() =>
      expect(getDpmCampaignDefinitionLifecycleEvents).toHaveBeenCalledTimes(1),
    );
    await act(async () => result.current.refreshLifecycle(rowA));

    expect(getDpmCampaignDefinitionLifecycleEvents).toHaveBeenCalledTimes(2);
    await waitFor(() => expect(result.current.lifecycle).toBe(confirmed));
    priorRead.resolve(definitionResponse("campaign-a", "OBSOLETE"));
    await obsoleteRead;
    expect(result.current.lifecycle).toBe(confirmed);
  });

  it("supersedes in-flight workflow reads before post-command confirmation", async () => {
    const priorReads = ["approval", "action", "task", "control"].map(() =>
      deferred<DpmCampaignWorkflowGatewayResponse>(),
    );
    const confirmed = ["approval-new", "action-new", "task-new", "control-new"].map(
      workflowResponse,
    );
    const mocks = [
      vi.mocked(getDpmCampaignApprovalDecisions),
      vi.mocked(getDpmCampaignAssignmentActions),
      vi.mocked(getDpmCampaignAssignmentTasks),
      vi.mocked(getDpmCampaignMakerCheckerControls),
    ];
    mocks.forEach((mock, index) => {
      mock
        .mockImplementationOnce(() => priorReads[index].promise)
        .mockResolvedValueOnce(confirmed[index]);
    });
    const { result } = renderHook(
      () =>
        useDpmCampaignSources({
          selectedCampaign: rowA,
          initialCampaignKey: null,
          initialWorkflowEvidence: emptyWorkflowEvidence(),
        }),
      { wrapper: createQueryClientWrapper() },
    );

    let obsoleteRead!: Promise<unknown>;
    act(() => {
      obsoleteRead = result.current.loadWorkflow(rowA).catch(() => undefined);
    });
    await waitFor(() =>
      expect(getDpmCampaignApprovalDecisions).toHaveBeenCalledTimes(1),
    );
    await act(async () => result.current.refreshWorkflow(rowA));

    expect(getDpmCampaignApprovalDecisions).toHaveBeenCalledTimes(2);
    await waitFor(() =>
      expect(result.current.workflow?.approvalDecisions).toBe(confirmed[0]),
    );
    priorReads.forEach((pending, index) =>
      pending.resolve(workflowResponse(`obsolete-${index}`)),
    );
    await obsoleteRead;
    expect(result.current.workflow?.approvalDecisions).toBe(confirmed[0]);
  });
});

function campaignRow(
  campaignId: string,
  campaignVersion: string,
): DpmCampaignDefinitionRow {
  return {
    key: `${campaignId}:${campaignVersion}`,
    campaignId,
    campaignVersion,
    asOfDate: "2026-05-10",
  } as DpmCampaignDefinitionRow;
}

function definitionResponse(
  campaignId: string,
  status?: string,
): DpmCampaignDefinitionGatewayResponse {
  return {
    correlation_id: `corr-${campaignId}`,
    contract_version: "v1",
    source_service: "lotus-manage",
    upstream_status: 200,
    data: { campaign_id: campaignId, status },
  };
}

function definitionListResponse(
  status: string,
  replacementCampaignVersion?: string,
): DpmCampaignDefinitionGatewayResponse {
  return {
    ...definitionResponse("campaign-a", status),
    data: {
      items: [
        {
          campaign_id: "campaign-a",
          campaign_version: "1",
          status,
          ...(replacementCampaignVersion
            ? {
                superseded_by_campaign_version: replacementCampaignVersion,
              }
            : {}),
        },
      ],
    },
  };
}

function readinessResponse(
  state: "READY" | "BLOCKED",
): DpmCampaignDefinitionGatewayResponse {
  return {
    ...definitionResponse("campaign-a"),
    data: {
      campaign_id: "campaign-a",
      campaign_version: "1",
      supportability_state: state,
    },
  };
}

function workflowResponse(id: string): DpmCampaignWorkflowGatewayResponse {
  return {
    correlation_id: `corr-${id}`,
    contract_version: "v1",
    source_service: "lotus-manage",
    upstream_status: 200,
    data: { items: [{ evidence_ref: id }] },
  };
}

function emptyWorkflowEvidence() {
  return {
    readId: "workflow-read-default",
    approvalDecisions: null,
    assignmentActions: null,
    assignmentTasks: null,
    makerCheckerControls: null,
  };
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((complete) => {
    resolve = complete;
  });
  return { promise, resolve };
}
