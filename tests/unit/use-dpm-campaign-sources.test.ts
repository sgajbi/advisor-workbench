import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { useDpmCampaignSources } from "../../src/features/workbench/use-dpm-campaign-sources";
import {
  getDpmCampaignApprovalDecisions,
  getDpmCampaignAssignmentActions,
  getDpmCampaignAssignmentTasks,
  getDpmCampaignDefinitionLifecycleEvents,
  getDpmCampaignMakerCheckerControls,
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
}));

const rowA = campaignRow("campaign-a", "1");
const rowB = campaignRow("campaign-b", "2");

describe("useDpmCampaignSources", () => {
  beforeEach(() => vi.clearAllMocks());

  it("keeps a late prior-campaign response outside the selected campaign", async () => {
    const pendingA = deferred<DpmCampaignDefinitionGatewayResponse>();
    vi.mocked(getDpmCampaignDefinitionLifecycleEvents).mockImplementation(({ campaignId }) =>
      campaignId === "campaign-a"
        ? pendingA.promise
        : Promise.resolve(definitionResponse("campaign-b")),
    );
    const queryClient = createTestQueryClient();
    queryClient.setDefaultOptions({ queries: { retry: false, staleTime: 30_000 } });
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
    await waitFor(() => expect(result.current.lifecycle?.data.campaign_id).toBe("campaign-b"));
    await act(async () => pendingA.resolve(definitionResponse("campaign-a")));
    await requestA;
    expect(result.current.lifecycle?.data.campaign_id).toBe("campaign-b");
  });

  it("loads four governance sources into one exact campaign evidence record", async () => {
    const responses = ["approval", "action", "task", "control"].map(workflowResponse);
    vi.mocked(getDpmCampaignApprovalDecisions).mockResolvedValue(responses[0]);
    vi.mocked(getDpmCampaignAssignmentActions).mockResolvedValue(responses[1]);
    vi.mocked(getDpmCampaignAssignmentTasks).mockResolvedValue(responses[2]);
    vi.mocked(getDpmCampaignMakerCheckerControls).mockResolvedValue(responses[3]);
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
    await waitFor(() => expect(result.current.workflow?.approvalDecisions).toBe(responses[0]));
    expect(result.current.workflow?.makerCheckerControls).toBe(responses[3]);
  });
});

function campaignRow(campaignId: string, campaignVersion: string): DpmCampaignDefinitionRow {
  return {
    key: `${campaignId}:${campaignVersion}`,
    campaignId,
    campaignVersion,
    asOfDate: "2026-05-10",
  } as DpmCampaignDefinitionRow;
}

function definitionResponse(campaignId: string): DpmCampaignDefinitionGatewayResponse {
  return {
    correlation_id: `corr-${campaignId}`,
    contract_version: "v1",
    source_service: "lotus-manage",
    upstream_status: 200,
    data: { campaign_id: campaignId },
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
