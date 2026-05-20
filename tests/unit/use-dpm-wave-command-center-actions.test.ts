import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { useDpmWaveCommandCenterActions } from "../../src/features/workbench/use-dpm-wave-command-center-actions";
import {
  approveDpmWave,
  createDpmWave,
  getDpmCampaignDefinitionLaunchHistory,
  getDpmCampaignDefinitionLaunchPackage,
  getDpmCampaignDefinitionLifecycleEvents,
  getDpmCampaignDefinitionPreviewReadiness,
  getDpmWaveItems,
  getDpmWaveProofPackPosture,
  handoffDpmWave,
  launchDpmCampaignDefinition,
  previewDpmWave,
  simulateDpmWave,
  sourceCheckDpmWave,
  stageDpmWave,
} from "../../src/features/workbench/api";
import type {
  DpmCampaignDefinitionGatewayResponse,
  DpmWaveGatewayResponse,
} from "../../src/features/workbench/types";

vi.mock("../../src/features/workbench/api", () => ({
  approveDpmWave: vi.fn(),
  createDpmWave: vi.fn(),
  getDpmCampaignDefinitionLaunchHistory: vi.fn(),
  getDpmCampaignDefinitionLaunchPackage: vi.fn(),
  getDpmCampaignDefinitionLifecycleEvents: vi.fn(),
  getDpmCampaignDefinitionPreviewReadiness: vi.fn(),
  getDpmWaveItems: vi.fn(),
  getDpmWaveProofPackPosture: vi.fn(),
  handoffDpmWave: vi.fn(),
  launchDpmCampaignDefinition: vi.fn(),
  previewDpmWave: vi.fn(),
  simulateDpmWave: vi.fn(),
  sourceCheckDpmWave: vi.fn(),
  stageDpmWave: vi.fn(),
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

function renderActions() {
  return renderHook(() =>
    useDpmWaveCommandCenterActions({
      portfolioId: "PB_SG_GLOBAL_BAL_001",
      waveList: waveResponse,
      campaignDefinitions,
    })
  );
}

describe("useDpmWaveCommandCenterActions", () => {
  beforeEach(() => {
    vi.mocked(getDpmWaveItems).mockResolvedValue(itemResponse);
    vi.mocked(getDpmCampaignDefinitionLifecycleEvents).mockResolvedValue(lifecycleResponse);
    vi.mocked(getDpmCampaignDefinitionLaunchHistory).mockResolvedValue(launchHistoryResponse);
    vi.mocked(getDpmCampaignDefinitionPreviewReadiness).mockResolvedValue(previewReadinessResponse);
    vi.mocked(getDpmCampaignDefinitionLaunchPackage).mockResolvedValue(launchPackageResponse);
    vi.mocked(launchDpmCampaignDefinition).mockResolvedValue(campaignLaunchResponse);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("derives the wave command-center model and auto-loads selected wave items through Gateway", async () => {
    const { result } = renderActions();

    expect(result.current.model.selectedWaveId).toBe("dwv_001");
    expect(result.current.selectedCampaign?.campaignId).toBe("campaign-holdings-202605");
    await waitFor(() => expect(getDpmWaveItems).toHaveBeenCalledWith("dwv_001"));
    await waitFor(() => expect(result.current.model.itemRows[0]?.security).toBe("AAPL US"));
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
    expect(result.current.actionMessage).toBe("Open evidence pack completed.");
  });

  it("loads campaign evidence, readiness, launch package, and durable launch through Gateway", async () => {
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
});
