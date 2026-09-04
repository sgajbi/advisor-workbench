import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { useDpmWaveCommandCenterActions } from "../../src/features/workbench/use-dpm-wave-command-center-actions";
import { dpmWaveQueryKeys } from "../../src/features/workbench/dpm-wave-query-keys";
import {
  approveDpmWave,
  createDpmCampaignApprovalDecision,
  createDpmCampaignAssignmentAction,
  createDpmCampaignAssignmentTask,
  createDpmCampaignAssignmentTaskTransition,
  createDpmCampaignMakerCheckerControl,
  createDpmWave,
  getDpmCampaignApprovalDecisions,
  getDpmCampaignAssignmentActions,
  getDpmCampaignAssignmentTasks,
  getDpmCampaignDefinitionLaunchHistory,
  getDpmCampaignDefinitionLaunchPackage,
  getDpmCampaignDefinitionLifecycleEvents,
  getDpmCampaignDefinitionPreviewReadiness,
  getDpmCampaignMakerCheckerControls,
  getDpmWave,
  getDpmWaveItems,
  getDpmWaveProofPackPosture,
  handoffDpmWave,
  launchDpmCampaignDefinition,
  listDpmWaves,
  listDpmCampaignDefinitions,
  previewDpmWave,
  retireDpmCampaignDefinition,
  simulateDpmWave,
  sourceCheckDpmWave,
  stageDpmWave,
  supersedeDpmCampaignDefinition,
} from "../../src/features/workbench/dpm-wave-api";
import type {
  DpmCampaignDefinitionGatewayResponse,
  DpmCampaignWorkflowGatewayResponse,
  DpmWaveGatewayResponse,
} from "../../src/features/workbench/types";
import {
  createQueryClientWrapper,
  createTestQueryClient,
} from "../helpers/query-client-test-harness";

vi.mock("../../src/features/workbench/dpm-wave-api", () => ({
  approveDpmWave: vi.fn(),
  createDpmCampaignApprovalDecision: vi.fn(),
  createDpmCampaignAssignmentAction: vi.fn(),
  createDpmCampaignAssignmentTask: vi.fn(),
  createDpmCampaignAssignmentTaskTransition: vi.fn(),
  createDpmCampaignMakerCheckerControl: vi.fn(),
  createDpmWave: vi.fn(),
  getDpmCampaignApprovalDecisions: vi.fn(),
  getDpmCampaignAssignmentActions: vi.fn(),
  getDpmCampaignAssignmentTasks: vi.fn(),
  getDpmCampaignDefinitionLaunchHistory: vi.fn(),
  getDpmCampaignDefinitionLaunchPackage: vi.fn(),
  getDpmCampaignDefinitionLifecycleEvents: vi.fn(),
  getDpmCampaignDefinitionPreviewReadiness: vi.fn(),
  getDpmCampaignMakerCheckerControls: vi.fn(),
  getDpmWave: vi.fn(),
  getDpmWaveItems: vi.fn(),
  getDpmWaveProofPackPosture: vi.fn(),
  handoffDpmWave: vi.fn(),
  launchDpmCampaignDefinition: vi.fn(),
  listDpmWaves: vi.fn(),
  listDpmCampaignDefinitions: vi.fn(),
  previewDpmWave: vi.fn(),
  requestDpmOperationsHandoffSummary: vi.fn(),
  requestDpmWaveAiPmMemo: vi.fn(),
  retireDpmCampaignDefinition: vi.fn(),
  simulateDpmWave: vi.fn(),
  sourceCheckDpmWave: vi.fn(),
  stageDpmWave: vi.fn(),
  supersedeDpmCampaignDefinition: vi.fn(),
}));

const waveResponse: DpmWaveGatewayResponse = {
  correlation_id: "corr-wave",
  contract_version: "v1",
  source_service: "lotus-manage",
  upstream_status: 200,
  supportability: {
    source_service: "lotus-manage",
    authority: "lotus-manage:RFC-0041",
    state: "ready",
    reason_codes: [],
    blocked_actions: [],
    wave_id: "dwv_001",
    wave_state: "SIMULATION_READY",
    item_count: 2,
    issue_count: 0,
  },
  data: {
    items: [
      {
        wave_id: "dwv_001",
        state: "SIMULATION_READY",
        trigger_type: "EXPLICIT_PORTFOLIO_LIST",
        as_of_date: "2026-05-03",
        item_count: 2,
        supportability_state: "ready",
        aggregate_metrics: {
          drift_improvement_pct: "72.4%",
        },
      },
    ],
  },
};

const itemResponse: DpmWaveGatewayResponse = {
  ...waveResponse,
  data: {
    items: [
      {
        wave_item_id: "dwi_1",
        portfolio_id: "PB_SG_GLOBAL_BAL_001",
        state: "SIMULATION_READY",
        source_readiness_state: "READY",
        diagnostics: {
          proposed_changes: [
            {
              security_id: "AAPL US",
              action: "Trim",
              estimated_value: "7,420.00",
              reason: "Equity overweight",
              mandate_impact: "Improves equity band",
              status: "READY",
            },
          ],
        },
      },
    ],
  },
};

function buildCreatedWaveResponse(
  correlationId = "corr-wave-created",
): DpmWaveGatewayResponse {
  return {
    ...waveResponse,
    correlation_id: correlationId,
    supportability: {
      ...waveResponse.supportability,
      wave_id: "dwv_002",
      wave_state: "CREATED",
    },
    data: {
      wave: {
        wave_id: "dwv_002",
        state: "CREATED",
      },
    },
  };
}

const campaignDefinitions: DpmCampaignDefinitionGatewayResponse = {
  correlation_id: "corr-campaign",
  contract_version: "v1",
  source_service: "lotus-manage",
  upstream_status: 200,
  data: {
    items: [
      {
        campaign_id: "campaign-holdings-202605",
        campaign_version: "2026.05",
        display_name: "Apple and Tesla holdings review",
        status: "ACTIVE",
        as_of_date: "2026-05-10",
        eligible_portfolio_types: ["DISCRETIONARY"],
        candidates: [
          {
            portfolio_id: "PB_SG_GLOBAL_BAL_001",
            source_refs: [{ source_type: "PortfolioManagerBookMembership", source_id: "book-1" }],
          },
        ],
        source_refs: [{ source_type: "BulkReviewCampaignDefinition", source_id: "campaign-plan" }],
      },
    ],
    limit: 10,
    offset: 0,
    count: 1,
  },
};

const lifecycleResponse: DpmCampaignDefinitionGatewayResponse = {
  ...campaignDefinitions,
  correlation_id: "corr-campaign-lifecycle",
  data: {
    campaign_id: "campaign-holdings-202605",
    campaign_version: "2026.05",
    events: [
      {
        event_type: "LAUNCHED",
        occurred_at: "2026-05-14T09:30:00Z",
        actor_id: "pm_sg_1",
        status: "RECORDED",
        reason_code: "campaign_definition_launched",
        wave_id: "dwv_campaign_launch_001",
      },
    ],
  },
};

const launchHistoryResponse: DpmCampaignDefinitionGatewayResponse = {
  ...campaignDefinitions,
  correlation_id: "corr-campaign-launch-history",
  data: {
    product_name: "BulkReviewCampaignDefinitionLaunchHistory",
    campaign_id: "campaign-holdings-202605",
    campaign_version: "2026.05",
    items: [
      {
        wave_id: "dwv_campaign_launch_001",
        launched_at: "2026-05-10T00:00:00Z",
        launched_by: "pm_sg_1",
        requested_as_of_date: "2026-05-10",
        correlation_id: "corr-campaign-launch",
        idempotency_key: "campaign-launch:campaign-holdings-202605:2026.05:abc",
      },
    ],
    limit: 10,
    offset: 0,
    count: 1,
    total_count: 11,
  },
};

const previewReadinessResponse: DpmCampaignDefinitionGatewayResponse = {
  ...campaignDefinitions,
  correlation_id: "corr-campaign-preview-readiness",
  data: {
    product_name: "BulkReviewCampaignDefinitionPreviewReadiness",
    campaign_id: "campaign-holdings-202605",
    campaign_version: "2026.05",
    requested_as_of_date: "2026-05-10",
    actor_id: "pm_sg_1",
    supportability_state: "READY",
    reason_codes: [],
    blocked_actions: [],
    operating_boundaries: ["NO_ORDER_GENERATION", "NO_OMS_EXECUTION_CLAIM"],
  },
};

const launchPackageResponse: DpmCampaignDefinitionGatewayResponse = {
  ...campaignDefinitions,
  correlation_id: "corr-campaign-launch-package",
  data: {
    product_name: "BulkReviewCampaignDefinitionLaunchPackage",
    campaign_id: "campaign-holdings-202605",
    campaign_version: "2026.05",
    requested_as_of_date: "2026-05-10",
    actor_id: "pm_sg_1",
    launch_state: "READY",
    reason_codes: [],
    create_headers: {
      "Idempotency-Key": "campaign-launch:campaign-holdings-202605:2026.05:abc",
    },
  },
};

const campaignLaunchResponse: DpmWaveGatewayResponse = {
  ...waveResponse,
  correlation_id: "corr-campaign-launch",
  upstream_status: 201,
  supportability: {
    ...waveResponse.supportability,
    wave_id: "dwv_campaign_launch_001",
    wave_state: "CREATED",
  },
  data: {
    wave: {
      wave_id: "dwv_campaign_launch_001",
      state: "CREATED",
      trigger_type: "BULK_REVIEW_CAMPAIGN",
    },
    durable: true,
  },
};

const campaignWorkflowCommandResponse: DpmCampaignWorkflowGatewayResponse = {
  correlation_id: "corr-campaign-command",
  contract_version: "v1",
  source_service: "lotus-manage",
  upstream_status: 201,
  supportability: {
    source_service: "lotus-manage",
    authority: "lotus-manage:campaign-workflow",
    state: "READY",
    reason_codes: ["campaign_assignment_task_transition_recorded"],
  },
  data: {
    task_ref: "task-review-001",
    transition_type: "ACKNOWLEDGED",
    content_hash: "sha256:task-transition",
    reason_codes: ["campaign_assignment_task_transition_recorded"],
    operating_boundaries: ["NO_ORDER_GENERATION", "NO_OMS_EXECUTION_CLAIM"],
  },
};

const campaignLifecycleCommandResponse: DpmCampaignDefinitionGatewayResponse = {
  correlation_id: "corr-campaign-lifecycle-command",
  contract_version: "v1",
  source_service: "lotus-manage",
  upstream_status: 200,
  data: {
    product_name: "BulkReviewCampaignDefinitionLifecycleCommand",
    campaign_id: "campaign-holdings-202605",
    campaign_version: "2026.05",
    status: "SUPERSEDED",
    superseded_by: "pm_sg_1",
    supersession_reason: "Candidate evidence was refreshed for the new review cycle.",
    superseded_by_campaign_version: "2026.06",
    correlation_id: "corr-campaign-lifecycle-command",
    content_hash: "sha256:campaign-superseded",
    reason_codes: ["campaign_definition_superseded"],
    operating_boundaries: [
      "NO_ORDER_GENERATION",
      "NO_OMS_EXECUTION_CLAIM",
      "NO_EXTERNAL_WORKFLOW_ORCHESTRATION",
    ],
  },
};

const campaignWorkflowEvidenceResponse: DpmCampaignWorkflowGatewayResponse = {
  ...campaignWorkflowCommandResponse,
  upstream_status: 200,
  data: {
    items: [
      {
        task_ref: "task-review-001",
        status: "SUPPORTABLE",
        content_hash: "sha256:task-transition",
        reason_codes: ["campaign_assignment_task_transition_recorded"],
      },
    ],
    count: 1,
    total_count: 1,
    limit: 10,
    offset: 0,
  },
};

function renderActions(
  definitions: DpmCampaignDefinitionGatewayResponse = campaignDefinitions,
  queryClient = createTestQueryClient(),
  sourceWaveList: DpmWaveGatewayResponse | null = waveResponse,
) {
  const rendered = renderHook(
    () =>
      useDpmWaveCommandCenterActions({
        portfolioId: "PB_SG_GLOBAL_BAL_001",
        waveList: sourceWaveList,
        campaignDefinitions: definitions,
      }),
    {
      wrapper: createQueryClientWrapper(queryClient),
    },
  );
  return { ...rendered, queryClient };
}

describe("useDpmWaveCommandCenterActions", () => {
  beforeEach(() => {
    vi.mocked(listDpmWaves).mockResolvedValue(waveResponse);
    vi.mocked(getDpmWave).mockResolvedValue(waveResponse);
    vi.mocked(getDpmWaveItems).mockResolvedValue(itemResponse);
    vi.mocked(getDpmCampaignDefinitionLifecycleEvents).mockResolvedValue(lifecycleResponse);
    vi.mocked(getDpmCampaignDefinitionLaunchHistory).mockResolvedValue(launchHistoryResponse);
    vi.mocked(getDpmCampaignDefinitionPreviewReadiness).mockResolvedValue(previewReadinessResponse);
    vi.mocked(getDpmCampaignDefinitionLaunchPackage).mockResolvedValue(launchPackageResponse);
    vi.mocked(launchDpmCampaignDefinition).mockResolvedValue(campaignLaunchResponse);
    vi.mocked(listDpmCampaignDefinitions).mockResolvedValue(campaignDefinitions);
    vi.mocked(retireDpmCampaignDefinition).mockResolvedValue({
      ...campaignLifecycleCommandResponse,
      data: {
        ...campaignLifecycleCommandResponse.data,
        status: "RETIRED",
        reason_code: "CAMPAIGN_DEFINITION_RETIRED_BY_OWNER",
        reason_codes: ["campaign_definition_retired"],
        content_hash: "sha256:campaign-retired",
      },
    });
    vi.mocked(supersedeDpmCampaignDefinition).mockResolvedValue(campaignLifecycleCommandResponse);
    vi.mocked(createDpmCampaignApprovalDecision).mockResolvedValue(campaignWorkflowCommandResponse);
    vi.mocked(createDpmCampaignAssignmentAction).mockResolvedValue(campaignWorkflowCommandResponse);
    vi.mocked(createDpmCampaignAssignmentTask).mockResolvedValue(campaignWorkflowCommandResponse);
    vi.mocked(createDpmCampaignAssignmentTaskTransition).mockResolvedValue(
      campaignWorkflowCommandResponse
    );
    vi.mocked(createDpmCampaignMakerCheckerControl).mockResolvedValue(
      campaignWorkflowCommandResponse
    );
    vi.mocked(getDpmCampaignApprovalDecisions).mockResolvedValue(campaignWorkflowEvidenceResponse);
    vi.mocked(getDpmCampaignAssignmentActions).mockResolvedValue(campaignWorkflowEvidenceResponse);
    vi.mocked(getDpmCampaignAssignmentTasks).mockResolvedValue(campaignWorkflowEvidenceResponse);
    vi.mocked(getDpmCampaignMakerCheckerControls).mockResolvedValue(
      campaignWorkflowEvidenceResponse
    );
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("derives the wave command-center model and auto-loads selected wave items through Gateway", async () => {
    const { result } = renderActions();

    expect(result.current.model.proofPackStatus).toBe("NOT_REQUESTED");

    expect(result.current.model.selectedWaveId).toBe("dwv_001");
    expect(result.current.selectedCampaign?.campaignId).toBe("campaign-holdings-202605");
    await waitFor(() => expect(getDpmWaveItems).toHaveBeenCalledWith("dwv_001"));
    await waitFor(() => expect(result.current.model.itemRows[0]?.security).toBe("AAPL US"));
  });

  it("retries the selected wave proposed-change auto-load after a transient Gateway failure", async () => {
    vi.mocked(getDpmWaveItems)
      .mockRejectedValueOnce(new Error("Gateway timeout"))
      .mockResolvedValueOnce(itemResponse);

    const { result } = renderActions();

    await waitFor(() => expect(getDpmWaveItems).toHaveBeenCalledTimes(2));
    expect(getDpmWaveItems).toHaveBeenNthCalledWith(1, "dwv_001");
    expect(getDpmWaveItems).toHaveBeenNthCalledWith(2, "dwv_001");
    await waitFor(() => expect(result.current.model.itemRows[0]?.security).toBe("AAPL US"));
  });

  it("reuses selected-wave evidence on remount within the governed stale window", async () => {
    const queryClient = createTestQueryClient();
    const first = renderActions(campaignDefinitions, queryClient);
    await waitFor(() => expect(first.result.current.model.itemRows[0]?.security).toBe("AAPL US"));
    first.unmount();

    const second = renderActions(campaignDefinitions, queryClient);
    await waitFor(() => expect(second.result.current.model.itemRows[0]?.security).toBe("AAPL US"));

    expect(getDpmWaveItems).toHaveBeenCalledTimes(1);
  });

  it("admits a newer server list when the selected wave identity is unchanged", async () => {
    const queryClient = createTestQueryClient();
    const first = renderActions(campaignDefinitions, queryClient);
    expect(first.result.current.model.selectedWaveState).toBe("SIMULATION_READY");
    first.unmount();

    const updatedWaveList: DpmWaveGatewayResponse = {
      ...waveResponse,
      correlation_id: "corr-wave-updated",
      supportability: {
        ...waveResponse.supportability,
        wave_state: "APPROVED",
      },
      data: {
        items: [
          {
            ...(waveResponse.data.items as Array<Record<string, unknown>>)[0],
            state: "APPROVED",
          },
        ],
      },
    };
    const second = renderActions(campaignDefinitions, queryClient, updatedWaveList);

    await waitFor(() => expect(second.result.current.model.selectedWaveState).toBe("APPROVED"));
    expect(second.result.current.model.correlationId).toBe("corr-wave-updated");
  });

  it("does not expose cached wave evidence when the server list is unavailable", async () => {
    const queryClient = createTestQueryClient();
    const first = renderActions(campaignDefinitions, queryClient);
    await waitFor(() => expect(first.result.current.model.selectedWaveId).toBe("dwv_001"));
    first.unmount();

    const second = renderActions(campaignDefinitions, queryClient, null);

    expect(second.result.current.model.selectedWaveId).toBeNull();
    act(() => second.result.current.requestApproval());
    expect(approveDpmWave).not.toHaveBeenCalled();
  });

  it("routes bounded rebalance actions through Gateway helpers", async () => {
    vi.mocked(previewDpmWave).mockResolvedValue(waveResponse);
    vi.mocked(createDpmWave).mockResolvedValue(waveResponse);
    vi.mocked(sourceCheckDpmWave).mockResolvedValue(waveResponse);
    vi.mocked(simulateDpmWave).mockResolvedValue(waveResponse);
    vi.mocked(approveDpmWave).mockResolvedValue(waveResponse);
    vi.mocked(stageDpmWave).mockResolvedValue(waveResponse);
    vi.mocked(handoffDpmWave).mockResolvedValue(waveResponse);
    vi.mocked(getDpmWaveProofPackPosture).mockResolvedValue(waveResponse);
    const { result } = renderActions();

    await act(async () => result.current.previewRebalance());
    await waitFor(() =>
      expect(previewDpmWave).toHaveBeenCalledWith({ portfolioId: "PB_SG_GLOBAL_BAL_001" })
    );

    await act(async () => result.current.createRebalance());
    await waitFor(() =>
      expect(createDpmWave).toHaveBeenCalledWith({ portfolioId: "PB_SG_GLOBAL_BAL_001" })
    );

    await act(async () => result.current.loadProposedChanges());
    await waitFor(() => expect(getDpmWaveItems).toHaveBeenCalledWith("dwv_001"));

    await act(async () => result.current.reviewDataReadiness());
    await waitFor(() => expect(sourceCheckDpmWave).toHaveBeenCalledWith("dwv_001"));

    await act(async () => result.current.runSimulation());
    await waitFor(() => expect(simulateDpmWave).toHaveBeenCalledWith("dwv_001"));

    await act(async () => result.current.requestApproval());
    await waitFor(() => expect(approveDpmWave).toHaveBeenCalledWith("dwv_001"));

    await act(async () => result.current.stageRebalance());
    await waitFor(() => expect(stageDpmWave).toHaveBeenCalledWith("dwv_001"));

    await act(async () => result.current.prepareHandoff());
    await waitFor(() => expect(handoffDpmWave).toHaveBeenCalledWith("dwv_001"));

    await act(async () => result.current.openEvidencePack());
    await waitFor(() => expect(getDpmWaveProofPackPosture).toHaveBeenCalledWith("dwv_001"));
    expect(result.current.model.proofPackStatus).toBe("READY");
    expect(result.current.actionMessage).toBe("Open evidence pack completed.");
  });

  it("keeps a persisted wave command pending until exact source evidence refreshes", async () => {
    let resolveWaveRefresh!: (value: DpmWaveGatewayResponse) => void;
    let resolveItemsRefresh!: (value: DpmWaveGatewayResponse) => void;
    const refreshedItems: DpmWaveGatewayResponse = {
      ...itemResponse,
      correlation_id: "corr-wave-items-refreshed",
      data: {
        items: [
          {
            ...(itemResponse.data.items as Array<Record<string, unknown>>)[0],
            diagnostics: {
              proposed_changes: [
                {
                  security_id: "MSFT US",
                  action: "Add",
                  estimated_value: "5,100.00",
                  reason: "Rebalance target",
                  mandate_impact: "Within equity band",
                  status: "READY",
                },
              ],
            },
          },
        ],
      },
    };
    vi.mocked(approveDpmWave).mockResolvedValue(waveResponse);
    vi.mocked(getDpmWave).mockReturnValueOnce(
      new Promise((resolve) => {
        resolveWaveRefresh = resolve;
      }),
    );
    vi.mocked(getDpmWaveItems)
      .mockResolvedValueOnce(itemResponse)
      .mockReturnValueOnce(
        new Promise((resolve) => {
          resolveItemsRefresh = resolve;
        }),
      );
    const { result } = renderActions();

    await waitFor(() => expect(result.current.model.itemRows[0]?.security).toBe("AAPL US"));

    act(() => result.current.requestApproval());

    await waitFor(() => expect(approveDpmWave).toHaveBeenCalledWith("dwv_001"));
    await waitFor(() => expect(result.current.pendingAction).toBe("Request approval"));
    expect(result.current.actionMessage).toBeNull();

    act(() => resolveWaveRefresh(waveResponse));

    await waitFor(() => expect(getDpmWaveItems).toHaveBeenCalledTimes(2));
    expect(result.current.pendingAction).toBe("Request approval");
    expect(result.current.model.itemRows[0]?.security).toBe("AAPL US");

    act(() => resolveItemsRefresh(refreshedItems));

    await waitFor(() => expect(result.current.pendingAction).toBeNull());
    expect(result.current.model.itemRows[0]?.security).toBe("MSFT US");
    expect(getDpmWave).toHaveBeenCalledWith("dwv_001");
    expect(listDpmWaves).toHaveBeenCalledWith(
      {
        asOfDate: "2026-05-03",
        triggerType: "EXPLICIT_PORTFOLIO_LIST",
        limit: 10,
        offset: 0,
      },
      "client",
    );
    expect(result.current.actionMessage).toBe("Request approval completed.");
  });

  it("prevents a late pre-command items read from replacing confirmed proposed changes", async () => {
    let resolveInitialItems!: (value: DpmWaveGatewayResponse) => void;
    const confirmedItems: DpmWaveGatewayResponse = {
      ...itemResponse,
      correlation_id: "corr-post-command-items",
      data: {
        items: [
          {
            ...(itemResponse.data.items as Array<Record<string, unknown>>)[0],
            diagnostics: {
              proposed_changes: [
                {
                  security_id: "MSFT US",
                  action: "Add",
                  estimated_value: "5,100.00",
                  reason: "Rebalance target",
                  mandate_impact: "Within equity band",
                  status: "READY",
                },
              ],
            },
          },
        ],
      },
    };
    vi.mocked(getDpmWaveItems)
      .mockReturnValueOnce(
        new Promise((resolve) => {
          resolveInitialItems = resolve;
        }),
      )
      .mockResolvedValueOnce(confirmedItems);
    vi.mocked(approveDpmWave).mockResolvedValue(waveResponse);
    const { result } = renderActions();

    await waitFor(() => expect(getDpmWaveItems).toHaveBeenCalledTimes(1));
    act(() => result.current.requestApproval());

    await waitFor(() => expect(getDpmWaveItems).toHaveBeenCalledTimes(2));
    await waitFor(() => expect(result.current.pendingAction).toBeNull());
    expect(result.current.model.itemRows[0]?.security).toBe("MSFT US");

    await act(async () => {
      resolveInitialItems(itemResponse);
      await Promise.resolve();
    });
    expect(result.current.model.itemRows[0]?.security).toBe("MSFT US");
  });

  it("does not present an accepted mutation response as confirmed wave detail", async () => {
    let resolveWaveRefresh!: (value: DpmWaveGatewayResponse) => void;
    const acceptedResponse: DpmWaveGatewayResponse = {
      ...waveResponse,
      correlation_id: "corr-wave-accepted",
      supportability: {
        ...waveResponse.supportability,
        wave_state: "APPROVED",
      },
      data: {
        wave: {
          wave_id: "dwv_001",
          state: "APPROVED",
        },
      },
    };
    vi.mocked(approveDpmWave).mockResolvedValue(acceptedResponse);
    vi.mocked(getDpmWave).mockReturnValueOnce(
      new Promise((resolve) => {
        resolveWaveRefresh = resolve;
      }),
    );
    const { result } = renderActions();

    act(() => result.current.requestApproval());

    await waitFor(() => expect(result.current.pendingAction).toBe("Request approval"));
    expect(result.current.model.selectedWaveState).toBe("SIMULATION_READY");
    expect(result.current.model.correlationId).toBe("corr-wave");

    act(() => resolveWaveRefresh(acceptedResponse));

    await waitFor(() => expect(result.current.pendingAction).toBeNull());
    expect(result.current.model.selectedWaveState).toBe("APPROVED");
    expect(result.current.model.correlationId).toBe("corr-wave-accepted");
  });

  it("admits a newly created wave only after an exact source read confirms its identity", async () => {
    const createdResponse = buildCreatedWaveResponse();
    const confirmedDetail: DpmWaveGatewayResponse = {
      ...createdResponse,
      correlation_id: "corr-wave-created-confirmed",
    };
    const confirmedItems: DpmWaveGatewayResponse = {
      ...itemResponse,
      correlation_id: "corr-wave-created-items",
      supportability: {
        ...itemResponse.supportability,
        wave_id: "dwv_002",
        wave_state: "CREATED",
      },
    };
    vi.mocked(createDpmWave).mockResolvedValue(createdResponse);
    vi.mocked(getDpmWave).mockImplementation(async (waveId) =>
      waveId === "dwv_002" ? confirmedDetail : waveResponse,
    );
    vi.mocked(getDpmWaveItems).mockImplementation(async (waveId) =>
      waveId === "dwv_002" ? confirmedItems : itemResponse,
    );
    const { result } = renderActions();

    act(() => result.current.createRebalance());

    await waitFor(() => expect(getDpmWave).toHaveBeenCalledWith("dwv_002"));
    await waitFor(() => expect(getDpmWaveItems).toHaveBeenCalledWith("dwv_002"));
    await waitFor(() => expect(result.current.pendingAction).toBeNull());
    expect(result.current.model.selectedWaveId).toBe("dwv_002");
    expect(result.current.model.correlationId).toBe(
      "corr-wave-created-confirmed",
    );
    expect(result.current.actionMessage).toBe("Create rebalance completed.");

    vi.mocked(approveDpmWave).mockResolvedValue(confirmedDetail);
    act(() => result.current.requestApproval());
    await waitFor(() => expect(approveDpmWave).toHaveBeenCalledWith("dwv_002"));
    await waitFor(() => expect(result.current.pendingAction).toBeNull());
    expect(result.current.model.selectedWaveId).toBe("dwv_002");
  });

  it("does not cache exact-read evidence under a different wave identity", async () => {
    const createdResponse = buildCreatedWaveResponse();
    vi.mocked(createDpmWave).mockResolvedValue(createdResponse);
    vi.mocked(getDpmWave).mockResolvedValue(waveResponse);
    const queryClient = createTestQueryClient();
    const { result } = renderActions(campaignDefinitions, queryClient);

    act(() => result.current.createRebalance());

    await waitFor(() =>
      expect(result.current.actionError).toContain(
        "Refreshed wave detail identified dwv_001 instead of dwv_002",
      ),
    );
    expect(
      queryClient.getQueryData(dpmWaveQueryKeys.wave("dwv_002")),
    ).toBeUndefined();
    expect(result.current.pendingAction).toBe(
      "Create rebalance — awaiting source confirmation",
    );
  });

  it("rejects a contradictory create response before selecting its wave", async () => {
    vi.mocked(createDpmWave).mockResolvedValue({
      ...buildCreatedWaveResponse(),
      data: { wave: { wave_id: "dwv_001", state: "CREATED" } },
    });
    const queryClient = createTestQueryClient();
    const { result } = renderActions(campaignDefinitions, queryClient);

    act(() => result.current.createRebalance());

    await waitFor(() =>
      expect(result.current.actionError).toContain(
        "Persisted create response payload identified dwv_001 instead of dwv_002",
      ),
    );
    expect(getDpmWave).not.toHaveBeenCalled();
    expect(
      queryClient.getQueryData(dpmWaveQueryKeys.wave("dwv_001")),
    ).toBeUndefined();
    expect(
      queryClient.getQueryData(dpmWaveQueryKeys.wave("dwv_002")),
    ).toBeUndefined();
  });

  it("keeps commands locked when exact detail supportability identity is absent", async () => {
    vi.mocked(approveDpmWave).mockResolvedValue(waveResponse);
    vi.mocked(getDpmWave).mockResolvedValue({
      ...waveResponse,
      supportability: {
        ...waveResponse.supportability,
        wave_id: undefined,
      },
    });
    const queryClient = createTestQueryClient();
    const { result } = renderActions(campaignDefinitions, queryClient);

    act(() => result.current.requestApproval());

    await waitFor(() =>
      expect(result.current.actionError).toContain(
        "Refreshed wave detail identified no wave instead of dwv_001",
      ),
    );
    expect(
      queryClient.getQueryData(dpmWaveQueryKeys.wave("dwv_001")),
    ).toBeUndefined();
    expect(result.current.pendingAction).toBe(
      "Request approval — awaiting source confirmation",
    );
  });

  it("does not cache proposed changes under a different wave identity", async () => {
    const createdResponse = buildCreatedWaveResponse();
    vi.mocked(createDpmWave).mockResolvedValue(createdResponse);
    vi.mocked(getDpmWave).mockResolvedValue(createdResponse);
    vi.mocked(getDpmWaveItems).mockResolvedValue(itemResponse);
    const queryClient = createTestQueryClient();
    const { result } = renderActions(campaignDefinitions, queryClient);

    act(() => result.current.createRebalance());

    await waitFor(() =>
      expect(result.current.actionError).toContain(
        "Refreshed proposed changes identified dwv_001 instead of dwv_002",
      ),
    );
    expect(
      queryClient.getQueryData(dpmWaveQueryKeys.items("dwv_002")),
    ).toBeUndefined();
    expect(result.current.pendingAction).toBe(
      "Create rebalance — awaiting source confirmation",
    );
  });

  it("keeps newly confirmed wave detail ahead of older cached proof posture", async () => {
    const cachedProofResponse: DpmWaveGatewayResponse = {
      ...waveResponse,
      correlation_id: "corr-proof-before-command",
      data: {
        wave: {
          wave_id: "dwv_001",
          state: "SIMULATION_READY",
          proof_pack_posture: {
            status: "READY",
          },
        },
      },
    };
    const confirmedDetail: DpmWaveGatewayResponse = {
      ...waveResponse,
      correlation_id: "corr-confirmed-after-command",
      supportability: {
        ...waveResponse.supportability,
        wave_state: "APPROVED",
      },
      data: {
        wave: {
          wave_id: "dwv_001",
          state: "APPROVED",
        },
      },
    };
    vi.mocked(getDpmWaveProofPackPosture).mockResolvedValue(cachedProofResponse);
    vi.mocked(approveDpmWave).mockResolvedValue(confirmedDetail);
    vi.mocked(getDpmWave).mockResolvedValue(confirmedDetail);
    const { result } = renderActions();

    act(() => result.current.openEvidencePack());
    await waitFor(() => expect(result.current.model.proofPackStatus).toBe("READY"));

    act(() => result.current.requestApproval());
    await waitFor(() => expect(result.current.pendingAction).toBeNull());

    expect(result.current.model.selectedWaveState).toBe("APPROVED");
    expect(result.current.model.correlationId).toBe("corr-confirmed-after-command");
    expect(result.current.model.proofPackStatus).toBe("READY");
  });

  it("keeps accepted wave commands explicit when source refresh cannot prove current posture", async () => {
    vi.mocked(approveDpmWave).mockResolvedValue(waveResponse);
    vi.mocked(getDpmWave).mockRejectedValueOnce(new Error("Gateway refresh unavailable"));
    const { result } = renderActions();

    act(() => result.current.requestApproval());

    await waitFor(() =>
      expect(result.current.actionError).toContain(
        "Request approval was accepted, but refreshed rebalance evidence could not be loaded",
      ),
    );
    expect(result.current.actionMessage).toBeNull();
    expect(result.current.pendingAction).toBe(
      "Request approval — awaiting source confirmation",
    );

    act(() => result.current.requestApproval());
    expect(approveDpmWave).toHaveBeenCalledTimes(1);
  });

  it("does not submit a second wave command while source refresh is pending", async () => {
    let resolveApproval!: (value: DpmWaveGatewayResponse) => void;
    vi.mocked(approveDpmWave).mockReturnValueOnce(
      new Promise((resolve) => {
        resolveApproval = resolve;
      }),
    );
    const { result } = renderActions();

    act(() => {
      result.current.requestApproval();
      result.current.requestApproval();
    });

    await waitFor(() => expect(approveDpmWave).toHaveBeenCalledTimes(1));
    act(() => resolveApproval(waveResponse));
    await waitFor(() => expect(result.current.pendingAction).toBeNull());
  });

  it("loads campaign evidence, readiness, launch package, and durable launch through Gateway", async () => {
    vi.mocked(approveDpmWave).mockResolvedValue(waveResponse);
    const { result } = renderActions();

    await waitFor(() => expect(result.current.selectedCampaign).not.toBeNull());
    const campaign = result.current.selectedCampaign!;

    await act(async () => {
      await result.current.loadCampaignLifecycle(campaign);
    });
    expect(getDpmCampaignDefinitionLifecycleEvents).toHaveBeenCalledWith({
      campaignId: "campaign-holdings-202605",
      campaignVersion: "2026.05",
    });
    expect(result.current.model.campaignLifecycleRows[0]?.eventType).toBe("Launched");

    await act(async () => {
      await result.current.loadCampaignLaunchHistory(campaign, 10);
    });
    expect(getDpmCampaignDefinitionLaunchHistory).toHaveBeenCalledWith({
      campaignId: "campaign-holdings-202605",
      campaignVersion: "2026.05",
      limit: 10,
      offset: 10,
    });

    await act(async () => {
      await result.current.checkCampaignLaunchReadiness(campaign);
    });
    expect(getDpmCampaignDefinitionPreviewReadiness).toHaveBeenCalledWith({
      campaignId: "campaign-holdings-202605",
      campaignVersion: "2026.05",
      requestedAsOfDate: "2026-05-10",
    });
    expect(getDpmCampaignDefinitionLaunchPackage).toHaveBeenCalledWith({
      campaignId: "campaign-holdings-202605",
      campaignVersion: "2026.05",
      requestedAsOfDate: "2026-05-10",
    });
    expect(result.current.model.campaignLaunchPosture.canLaunch).toBe(true);

    await act(async () => {
      await result.current.launchCampaign(campaign);
    });
    expect(launchDpmCampaignDefinition).toHaveBeenCalledWith({
      campaignId: "campaign-holdings-202605",
      campaignVersion: "2026.05",
      requestedAsOfDate: "2026-05-10",
    });
    expect(result.current.model.campaignLaunchPosture.launchedWaveId).toBe(
      "dwv_campaign_launch_001"
    );
    expect(result.current.model.selectedWaveId).toBe("dwv_001");
    act(() => result.current.requestApproval());
    await waitFor(() => expect(approveDpmWave).toHaveBeenCalledWith("dwv_001"));
  });

  it("keeps campaign launch fail-closed when source readiness is blocked", async () => {
    vi.mocked(getDpmCampaignDefinitionPreviewReadiness).mockResolvedValueOnce({
      ...previewReadinessResponse,
      data: {
        ...previewReadinessResponse.data,
        supportability_state: "BLOCKED",
        reason_codes: ["campaign_definition_actor_not_entitled"],
        blocked_actions: ["preview_wave", "create_wave"],
      },
    });
    const { result } = renderActions();

    await waitFor(() => expect(result.current.selectedCampaign).not.toBeNull());
    await act(async () => {
      await result.current.checkCampaignLaunchReadiness(result.current.selectedCampaign!);
    });

    expect(result.current.model.campaignPreviewReadinessPosture.state).toBe("BLOCKED");
    expect(result.current.model.campaignLaunchPosture.canLaunch).toBe(false);
    expect(getDpmCampaignDefinitionLaunchPackage).not.toHaveBeenCalled();
    await act(async () => {
      await result.current.launchCampaign(result.current.selectedCampaign!);
    });
    expect(launchDpmCampaignDefinition).not.toHaveBeenCalled();
  });

  it("records campaign lifecycle commands and refreshes definitions plus lifecycle evidence", async () => {
    const { result } = renderActions();

    await waitFor(() => expect(result.current.selectedCampaign).not.toBeNull());
    await act(async () => {
      await result.current.recordCampaignLifecycleCommand({
        commandType: "supersede",
        body: {
          superseded_by_campaign_version: "2026.06",
          superseded_by: "pm_sg_1",
          supersession_reason: "Candidate evidence was refreshed for the new review cycle.",
          correlation_id: "corr-campaign-lifecycle-command",
        },
      });
    });

    expect(supersedeDpmCampaignDefinition).toHaveBeenCalledWith({
      campaignId: "campaign-holdings-202605",
      campaignVersion: "2026.05",
      actorId: "pm_sg_1",
      body: {
        superseded_by_campaign_version: "2026.06",
        superseded_by: "pm_sg_1",
        supersession_reason: "Candidate evidence was refreshed for the new review cycle.",
        correlation_id: "corr-campaign-lifecycle-command",
      },
    });
    expect(listDpmCampaignDefinitions).toHaveBeenCalledWith(
      { limit: 10, offset: 0 },
      "client",
    );
    expect(getDpmCampaignDefinitionLifecycleEvents).toHaveBeenCalledWith({
      campaignId: "campaign-holdings-202605",
      campaignVersion: "2026.05",
    });
    expect(result.current.campaignLifecycleCommandEvidence).toMatchObject({
      commandLabel: "Supersede campaign",
      status: "SUPERSEDED",
      replacementCampaignVersion: "2026.06",
      contentHash: "sha256:campaign-superseded",
    });
  });

  it("preserves accepted lifecycle evidence when the follow-up refresh fails", async () => {
    vi.mocked(listDpmCampaignDefinitions).mockRejectedValueOnce(
      new Error("Campaign definitions refresh failed"),
    );
    const { result } = renderActions();

    await waitFor(() => expect(result.current.selectedCampaign).not.toBeNull());
    await act(async () => {
      await result.current.recordCampaignLifecycleCommand({
        commandType: "retire",
        body: {
          retired_by: "pm_sg_1",
          retirement_reason: "The campaign review cycle is complete.",
          correlation_id: "corr-campaign-retire",
        },
      });
    });

    expect(result.current.campaignLifecycleCommandEvidence).toMatchObject({
      commandLabel: "Retire campaign",
      contentHash: "sha256:campaign-retired",
    });
    expect(result.current.campaignLifecycleCommandError).toBeNull();
    expect(result.current.campaignLifecycleError).toBe(
      "Lifecycle action was recorded, but refreshed campaign evidence could not be loaded. Reload source evidence to confirm the campaign's new lifecycle posture.",
    );
  });

  it("never renders a late campaign A response under campaign B", async () => {
    const twoCampaigns: DpmCampaignDefinitionGatewayResponse = {
      ...campaignDefinitions,
      data: {
        ...campaignDefinitions.data,
        items: [
          ...(campaignDefinitions.data.items as Array<Record<string, unknown>>),
          {
            campaign_id: "campaign-income-202606",
            campaign_version: "2026.06",
            display_name: "Income mandate review",
            status: "ACTIVE",
            as_of_date: "2026-06-10",
            eligible_portfolio_types: ["DISCRETIONARY"],
            candidates: [],
            source_refs: [],
          },
        ],
        count: 2,
      },
    };
    let resolveCampaignA!: (value: DpmCampaignDefinitionGatewayResponse) => void;
    vi.mocked(getDpmCampaignDefinitionLifecycleEvents).mockReturnValueOnce(
      new Promise((resolve) => {
        resolveCampaignA = resolve;
      }),
    );
    const { result } = renderActions(twoCampaigns);

    await waitFor(() => expect(result.current.model.campaignRows).toHaveLength(2));
    const campaignA = result.current.model.campaignRows[0]!;
    const campaignB = result.current.model.campaignRows[1]!;
    let campaignALoad!: Promise<void>;
    act(() => {
      campaignALoad = result.current.loadCampaignLifecycle(campaignA);
    });
    await waitFor(() => expect(result.current.pendingCampaignLifecycleKey).toBe(campaignA.key));
    act(() => result.current.selectCampaign(campaignB));
    expect(result.current.selectedCampaignKey).toBe(campaignB.key);

    await act(async () => {
      resolveCampaignA(lifecycleResponse);
      await campaignALoad;
    });

    expect(result.current.selectedCampaignKey).toBe(campaignB.key);
    expect(result.current.model.campaignLifecycleRows).toEqual([]);
    expect(result.current.campaignLifecycleError).toBeNull();
  });

  it("keeps campaign lifecycle commands fail-closed for missing replacement evidence", async () => {
    const { result } = renderActions();

    await waitFor(() => expect(result.current.selectedCampaign).not.toBeNull());
    await act(async () => {
      await result.current.recordCampaignLifecycleCommand({
        commandType: "supersede",
        body: {
          superseded_by_campaign_version: "",
          superseded_by: "pm_sg_1",
          supersession_reason: "Candidate evidence was refreshed.",
          correlation_id: "corr-campaign-lifecycle-command",
        },
      });
    });

    expect(result.current.campaignLifecycleCommandError).toBe(
      "Supersede requires an existing replacement campaign version."
    );
    expect(supersedeDpmCampaignDefinition).not.toHaveBeenCalled();
    expect(listDpmCampaignDefinitions).not.toHaveBeenCalled();
  });

  it("keeps campaign lifecycle commands fail-closed when Manage blocks the command", async () => {
    vi.mocked(retireDpmCampaignDefinition).mockResolvedValueOnce({
      ...campaignLifecycleCommandResponse,
      data: {
        ...campaignLifecycleCommandResponse.data,
        status: "BLOCKED",
        supportability_state: "BLOCKED",
        reason_codes: ["campaign_definition_lifecycle_command_blocked"],
      },
    });
    const { result } = renderActions();

    await waitFor(() => expect(result.current.selectedCampaign).not.toBeNull());
    await act(async () => {
      await result.current.recordCampaignLifecycleCommand({
        commandType: "retire",
        body: {
          retired_by: "pm_sg_1",
          retirement_reason: "The campaign review cycle is complete.",
          correlation_id: "corr-campaign-lifecycle-command",
        },
      });
    });

    expect(retireDpmCampaignDefinition).toHaveBeenCalled();
    expect(result.current.campaignLifecycleCommandError).toBe(
      "Manage did not accept the campaign lifecycle command."
    );
    expect(listDpmCampaignDefinitions).not.toHaveBeenCalled();
  });

  it("records campaign workflow commands and refreshes Manage-owned evidence lists", async () => {
    const { result } = renderActions();

    await waitFor(() => expect(result.current.selectedCampaign).not.toBeNull());
    await act(async () => {
      await result.current.recordCampaignWorkflowCommand({
        commandType: "task_transition",
        taskRef: "task-review-001",
        body: {
          transition_type: "ACKNOWLEDGED",
          transition_ref: "task-review-001:acknowledged",
          transitioned_by: "pm_sg_1",
          transition_reason: "Portfolio manager acknowledged the review task.",
          correlation_id: "corr-campaign-task-transition",
        },
      });
    });

    expect(createDpmCampaignAssignmentTaskTransition).toHaveBeenCalledWith({
      campaignId: "campaign-holdings-202605",
      campaignVersion: "2026.05",
      taskRef: "task-review-001",
      actorId: "pm_sg_1",
      body: {
        transition_type: "ACKNOWLEDGED",
        transition_ref: "task-review-001:acknowledged",
        transitioned_by: "pm_sg_1",
        transition_reason: "Portfolio manager acknowledged the review task.",
        correlation_id: "corr-campaign-task-transition",
      },
    });
    expect(getDpmCampaignApprovalDecisions).toHaveBeenCalledWith(
      {
        campaignId: "campaign-holdings-202605",
        campaignVersion: "2026.05",
      },
      "client",
    );
    expect(getDpmCampaignAssignmentActions).toHaveBeenCalledWith(
      {
        campaignId: "campaign-holdings-202605",
        campaignVersion: "2026.05",
      },
      "client",
    );
    expect(getDpmCampaignAssignmentTasks).toHaveBeenCalledWith(
      {
        campaignId: "campaign-holdings-202605",
        campaignVersion: "2026.05",
      },
      "client",
    );
    expect(getDpmCampaignMakerCheckerControls).toHaveBeenCalledWith(
      {
        campaignId: "campaign-holdings-202605",
        campaignVersion: "2026.05",
      },
      "client",
    );
    expect(result.current.campaignWorkflowCommandEvidence).toMatchObject({
      evidenceRef: "task-review-001",
      correlationId: "corr-campaign-command",
      sourceService: "lotus-manage",
      contentHash: "sha256:task-transition",
    });
    expect(result.current.model.campaignWorkflowEvidenceRows[0]?.evidenceRef).toBe(
      "task-review-001"
    );
    expect(result.current.campaignWorkflowEvidenceResolved).toBe(true);
  });

  it("preserves accepted governance evidence when the follow-up refresh fails", async () => {
    vi.mocked(getDpmCampaignApprovalDecisions).mockRejectedValueOnce(
      new Error("Campaign approvals refresh failed"),
    );
    const { result } = renderActions();

    await waitFor(() => expect(result.current.selectedCampaign).not.toBeNull());
    await act(async () => {
      await result.current.recordCampaignWorkflowCommand({
        commandType: "assignment_task",
        body: {
          task_ref: "task-review-001",
          task_type: "ASSIGNMENT",
          opened_by: "pm_sg_1",
          task_reason: "Portfolio manager review is required.",
          assigned_actor_ids: ["pm_sg_1"],
          escalation_tier: "PM",
          sla_posture: "ON_TRACK",
          correlation_id: "corr-campaign-task",
        },
      });
    });

    expect(result.current.campaignWorkflowCommandEvidence).toMatchObject({
      evidenceRef: "task-review-001",
      contentHash: "sha256:task-transition",
    });
    expect(result.current.campaignWorkflowCommandError).toBeNull();
    expect(result.current.campaignWorkflowEvidenceResolved).toBe(true);
    expect(result.current.campaignWorkflowEvidenceError).toBe(
      "Governance action was recorded, but refreshed source evidence could not be loaded. Reload source evidence before recording another governance action.",
    );
  });

  it("keeps campaign workflow command failures bounded and does not refresh local evidence", async () => {
    vi.mocked(createDpmCampaignAssignmentTask).mockRejectedValueOnce(
      new Error("Failed to fetch create DPM campaign assignment task (502)")
    );
    const { result } = renderActions();

    await waitFor(() => expect(result.current.selectedCampaign).not.toBeNull());
    await act(async () => {
      await result.current.recordCampaignWorkflowCommand({
        commandType: "assignment_task",
        body: {
          task_ref: "task-review-001",
          task_type: "ASSIGNMENT",
          opened_by: "pm_sg_1",
          task_reason: "Portfolio manager review is required.",
          assigned_actor_ids: ["pm_sg_1"],
          escalation_tier: "PM",
          sla_posture: "ON_TRACK",
          correlation_id: "corr-campaign-task",
        },
      });
    });

    expect(result.current.campaignWorkflowCommandError).toBe(
      "Failed to fetch create DPM campaign assignment task (502)"
    );
    expect(getDpmCampaignAssignmentTasks).not.toHaveBeenCalled();
  });
});
