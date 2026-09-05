import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  useDpmCampaignDefinitionsSource,
  useDpmCampaignSources,
} from "../../src/features/workbench/use-dpm-campaign-sources";
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
      () => useDpmCampaignDefinitionsSource(current),
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
      () => useDpmCampaignDefinitionsSource(null),
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

    await act(async () => result.current.loadWorkflow(rowA));
    await waitFor(() =>
      expect(result.current.workflow?.assignmentActions).toEqual(current[1]),
    );
    expect(result.current.workflowResolved).toBe(true);
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
