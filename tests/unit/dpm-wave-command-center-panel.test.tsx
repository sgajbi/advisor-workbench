import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import DpmWaveCommandCenterPanel from "../../src/features/workbench/components/dpm-wave-command-center-panel";
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
} from "../../src/features/workbench/dpm-wave-api";
import type {
  DpmCampaignDefinitionGatewayResponse,
  DpmWaveGatewayResponse,
} from "../../src/features/workbench/types";

vi.mock("../../src/features/workbench/dpm-wave-api", () => ({
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
    remediation_owner: "Portfolio Operations",
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
        supportability_reason: "wave_supportability_ready",
        aggregate_metrics: {
          turnover_pct: "4.8%",
          cash_after_pct: "2.1%",
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
            {
              security_id: "MSFT US",
              action: "Buy",
              estimated_value: "3,840.50",
              reason: "Target allocation",
              mandate_impact: "Improves benchmark alignment",
              status: "READY",
            },
          ],
        },
      },
    ],
  },
};

const campaignDefinitionsResponse: DpmCampaignDefinitionGatewayResponse = {
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
            portfolio_type: "DISCRETIONARY",
            source_refs: [{ source_type: "PortfolioManagerBookMembership", source_id: "book-1" }],
          },
          {
            portfolio_id: "PB_SG_GLOBAL_INC_002",
            portfolio_type: "DISCRETIONARY",
            source_refs: [{ source_type: "RiskEventAffectedCohort", source_id: "risk-1" }],
          },
        ],
        governance: {
          approval_ref: "BRC-APPROVAL-2026-05",
          approved_by: "cio_ops_committee",
        },
        source_refs: [{ source_type: "BulkReviewCampaignDefinition", source_id: "campaign-plan" }],
        content_hash: "sha256:campaign-definition",
      },
    ],
    limit: 10,
    offset: 0,
    count: 1,
  },
};

const campaignLifecycleResponse: DpmCampaignDefinitionGatewayResponse = {
  correlation_id: "corr-campaign-lifecycle",
  contract_version: "v1",
  source_service: "lotus-manage",
  upstream_status: 200,
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
        requested_as_of_date: "2026-05-10",
        correlation_id: "corr-campaign-launch",
        idempotency_key: "campaign-launch:campaign-holdings-202605:2026.05:abc",
      },
    ],
  },
};

const campaignLaunchHistoryResponse: DpmCampaignDefinitionGatewayResponse = {
  correlation_id: "corr-campaign-launch-history",
  contract_version: "v1",
  source_service: "lotus-manage",
  upstream_status: 200,
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
    operating_boundaries: [
      "NO_MAKER_CHECKER_WORKFLOW",
      "NO_TRADE_APPROVAL",
      "NO_ORDER_GENERATION",
      "NO_OMS_EXECUTION_CLAIM",
    ],
  },
};

const campaignDiscoveryResponse: DpmCampaignDefinitionGatewayResponse = {
  correlation_id: "corr-campaign-discovery",
  contract_version: "v1",
  source_service: "lotus-manage",
  upstream_status: 200,
  data: {
    items: [
      {
        product_name: "BulkReviewCampaignDiscovery",
        campaign_id: "campaign-holdings-202605",
        campaign_version: "2026.05",
        campaign_status: "ACTIVE",
        candidate_count: 12,
        eligible_candidate_count: 10,
        governance_status: "APPROVED",
        expiry_state: "ACTIVE",
        access_purpose: "rebalance_review",
        source_ref_count: 4,
      },
    ],
  },
};

const campaignLaunchPackageResponse: DpmCampaignDefinitionGatewayResponse = {
  correlation_id: "corr-campaign-launch-package",
  contract_version: "v1",
  source_service: "lotus-manage",
  upstream_status: 200,
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

const campaignPreviewReadinessResponse: DpmCampaignDefinitionGatewayResponse = {
  correlation_id: "corr-campaign-preview-readiness",
  contract_version: "v1",
  source_service: "lotus-manage",
  upstream_status: 200,
  data: {
    product_name: "BulkReviewCampaignDefinitionPreviewReadiness",
    product_version: "v1",
    campaign_id: "campaign-holdings-202605",
    campaign_version: "2026.05",
    requested_as_of_date: "2026-05-10",
    actor_id: "pm_sg_1",
    supportability_state: "READY",
    reason_codes: [],
    blocked_actions: [],
    source_refs: [{ source_type: "BulkReviewCampaignDefinition", source_id: "campaign-plan" }],
    operating_boundaries: ["NO_ORDER_GENERATION", "NO_OMS_EXECUTION_CLAIM"],
  },
};

const campaignLaunchResponse: DpmWaveGatewayResponse = {
  ...waveResponse,
  correlation_id: "corr-campaign-launch",
  upstream_status: 201,
  supportability: {
    ...waveResponse.supportability,
    state: "ready",
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

describe("DpmWaveCommandCenterPanel", () => {
  beforeEach(() => {
    vi.mocked(getDpmWaveItems).mockResolvedValue(itemResponse);
    vi.mocked(getDpmCampaignDefinitionLifecycleEvents).mockResolvedValue(campaignLifecycleResponse);
    vi.mocked(getDpmCampaignDefinitionLaunchHistory).mockResolvedValue(campaignLaunchHistoryResponse);
    vi.mocked(getDpmCampaignDefinitionPreviewReadiness).mockResolvedValue(campaignPreviewReadinessResponse);
    vi.mocked(getDpmCampaignDefinitionLaunchPackage).mockResolvedValue(campaignLaunchPackageResponse);
    vi.mocked(launchDpmCampaignDefinition).mockResolvedValue(campaignLaunchResponse);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("renders the business-facing rebalance workspace with implementation-backed proposed changes", async () => {
    render(
      <DpmWaveCommandCenterPanel
        portfolioId="PB_SG_GLOBAL_BAL_001"
        waveList={waveResponse}
        campaignDefinitions={campaignDefinitionsResponse}
        campaignDiscovery={campaignDiscoveryResponse}
      />,
    );

    expect(screen.getByRole("heading", { name: "Rebalance" })).toBeInTheDocument();
    expect(screen.getByText("Proposed rebalance, advisor review, and approval readiness.")).toBeInTheDocument();
    expect(screen.getAllByText("Simulation ready").length).toBeGreaterThan(0);
    expect(screen.getByText("72.4%")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Active Rebalance" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Campaign Definitions" })).toBeInTheDocument();
    expect(screen.getByText("Apple and Tesla holdings review")).toBeInTheDocument();
    expect(screen.getAllByText("10").length).toBeGreaterThan(0);
    expect(screen.getByText("rebalance_review")).toBeInTheDocument();
    expect(screen.getByText("Source-backed")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Campaign Lifecycle Evidence" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Campaign Launch History" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Campaign Launch Posture" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Launch Campaign" })).toBeDisabled();
    expect(screen.getByRole("heading", { name: "Recommended Actions" })).toBeInTheDocument();

    const table = screen.getByRole("table", { name: "Proposed rebalance changes" });
    expect(await within(table).findByText("AAPL US")).toBeInTheDocument();
    expect(within(table).getByText("Trim")).toBeInTheDocument();
    expect(within(table).getByText("Equity overweight")).toBeInTheDocument();
    expect(within(table).getByText("MSFT US")).toBeInTheDocument();
    expect(screen.queryByText("lotus-manage")).not.toBeInTheDocument();
    expect(screen.queryByText("corr-wave")).not.toBeInTheDocument();
    expect(screen.queryByText("corr-campaign-discovery")).not.toBeInTheDocument();
    expect(screen.queryByText("sha256:campaign-definition")).not.toBeInTheDocument();
  });

  it("loads read-only campaign lifecycle evidence through the Gateway helper", async () => {
    render(
      <DpmWaveCommandCenterPanel
        portfolioId="PB_SG_GLOBAL_BAL_001"
        waveList={waveResponse}
        campaignDefinitions={campaignDefinitionsResponse}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Open Evidence" }));

    await waitFor(() =>
      expect(getDpmCampaignDefinitionLifecycleEvents).toHaveBeenCalledWith({
        campaignId: "campaign-holdings-202605",
        campaignVersion: "2026.05",
      }),
    );

    const table = screen.getByRole("table", { name: "DPM campaign lifecycle evidence" });
    expect(within(table).getByText("Launched")).toBeInTheDocument();
    expect(within(table).getByText("2026-05-14T09:30:00Z")).toBeInTheDocument();
    expect(within(table).getByText("pm_sg_1")).toBeInTheDocument();
    expect(within(table).getByText("dwv_campaign_launch_001")).toBeInTheDocument();
    expect(within(table).getByText("2026-05-10")).toBeInTheDocument();
    expect(within(table).getByText("campaign_definition_launched")).toBeInTheDocument();
    expect(within(table).getByText("corr-campaign-launch")).toBeInTheDocument();
    expect(
      within(table).getByText("campaign-launch:campaign-holdings-202605:2026.05:abc"),
    ).toBeInTheDocument();
    expect(screen.queryByText("corr-campaign-lifecycle")).not.toBeInTheDocument();
  });

  it("loads append-only campaign launch history through the Gateway helper", async () => {
    render(
      <DpmWaveCommandCenterPanel
        portfolioId="PB_SG_GLOBAL_BAL_001"
        waveList={waveResponse}
        campaignDefinitions={campaignDefinitionsResponse}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Open History" }));

    await waitFor(() =>
      expect(getDpmCampaignDefinitionLaunchHistory).toHaveBeenCalledWith({
        campaignId: "campaign-holdings-202605",
        campaignVersion: "2026.05",
        limit: 10,
        offset: 0,
      }),
    );

    const table = screen.getByRole("table", { name: "DPM campaign launch history" });
    expect(within(table).getByText("dwv_campaign_launch_001")).toBeInTheDocument();
    expect(within(table).getByText("pm_sg_1")).toBeInTheDocument();
    expect(within(table).getByText("2026-05-10T00:00:00Z")).toBeInTheDocument();
    expect(within(table).getByText("corr-campaign-launch")).toBeInTheDocument();
    expect(
      within(table).getByText("campaign-launch:campaign-holdings-202605:2026.05:abc"),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        "NO_MAKER_CHECKER_WORKFLOW, NO_TRADE_APPROVAL, NO_ORDER_GENERATION, NO_OMS_EXECUTION_CLAIM",
      ),
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Next" }));
    await waitFor(() =>
      expect(getDpmCampaignDefinitionLaunchHistory).toHaveBeenLastCalledWith({
        campaignId: "campaign-holdings-202605",
        campaignVersion: "2026.05",
        limit: 10,
        offset: 10,
      }),
    );
    expect(screen.queryByText("corr-campaign-launch-history")).not.toBeInTheDocument();
  });

  it("renders an empty campaign launch-history page without execution claims", async () => {
    vi.mocked(getDpmCampaignDefinitionLaunchHistory).mockResolvedValueOnce({
      ...campaignLaunchHistoryResponse,
      data: {
        ...campaignLaunchHistoryResponse.data,
        items: [],
        count: 0,
        total_count: 0,
        operating_boundaries: ["NO_ORDER_GENERATION", "NO_OMS_EXECUTION_CLAIM"],
      },
    });

    render(
      <DpmWaveCommandCenterPanel
        portfolioId="PB_SG_GLOBAL_BAL_001"
        waveList={waveResponse}
        campaignDefinitions={campaignDefinitionsResponse}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Open History" }));

    expect(await screen.findByText("No launch records")).toBeInTheDocument();
    expect(screen.getByText("0 of 0")).toBeInTheDocument();
    expect(screen.queryByText("1-0 of 0")).not.toBeInTheDocument();
    expect(screen.getByText("NO_ORDER_GENERATION, NO_OMS_EXECUTION_CLAIM")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Next" })).toBeDisabled();
  });

  it("enables campaign launch only after Manage launch readiness is ready", async () => {
    render(
      <DpmWaveCommandCenterPanel
        portfolioId="PB_SG_GLOBAL_BAL_001"
        waveList={waveResponse}
        campaignDefinitions={campaignDefinitionsResponse}
      />,
    );

    const launchButton = screen.getByRole("button", { name: "Launch Campaign" });
    expect(launchButton).toBeDisabled();

    fireEvent.click(screen.getByRole("button", { name: "Check Readiness" }));

    await waitFor(() =>
      expect(getDpmCampaignDefinitionPreviewReadiness).toHaveBeenCalledWith({
        campaignId: "campaign-holdings-202605",
        campaignVersion: "2026.05",
        requestedAsOfDate: "2026-05-10",
      }),
    );
    await waitFor(() =>
      expect(getDpmCampaignDefinitionLaunchPackage).toHaveBeenCalledWith({
        campaignId: "campaign-holdings-202605",
        campaignVersion: "2026.05",
        requestedAsOfDate: "2026-05-10",
      }),
    );

    expect(screen.getAllByText("Ready").length).toBeGreaterThan(0);
    expect(screen.getByText("NO_ORDER_GENERATION, NO_OMS_EXECUTION_CLAIM")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Launch Campaign" }));

    await waitFor(() =>
      expect(launchDpmCampaignDefinition).toHaveBeenCalledWith({
        campaignId: "campaign-holdings-202605",
        campaignVersion: "2026.05",
        requestedAsOfDate: "2026-05-10",
      }),
    );

    expect(screen.getByText("dwv_campaign_launch_001")).toBeInTheDocument();
    expect(screen.getByText("campaign-launch:campaign-holdings-202605:2026.05:abc")).toBeInTheDocument();
    expect(screen.queryByText("corr-campaign-launch")).not.toBeInTheDocument();
  });

  it("renders blocked campaign preview readiness and keeps launch unavailable", async () => {
    vi.mocked(getDpmCampaignDefinitionPreviewReadiness).mockResolvedValue({
      ...campaignPreviewReadinessResponse,
      data: {
        ...campaignPreviewReadinessResponse.data,
        supportability_state: "BLOCKED",
        reason_codes: ["campaign_definition_actor_not_entitled"],
        blocked_actions: ["preview_wave", "create_wave"],
      },
    });

    render(
      <DpmWaveCommandCenterPanel
        portfolioId="PB_SG_GLOBAL_BAL_001"
        waveList={waveResponse}
        campaignDefinitions={campaignDefinitionsResponse}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Check Readiness" }));

    await waitFor(() => expect(getDpmCampaignDefinitionPreviewReadiness).toHaveBeenCalled());
    expect((await screen.findAllByText("Campaign Definition Actor Not Entitled")).length).toBeGreaterThan(0);
    expect(screen.getByText("Blocked")).toBeInTheDocument();
    expect(await screen.findByText("preview_wave, create_wave")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Launch Campaign" })).toBeDisabled();
    expect(getDpmCampaignDefinitionLaunchPackage).not.toHaveBeenCalled();
    expect(launchDpmCampaignDefinition).not.toHaveBeenCalled();
  });

  it("routes bounded workflow actions through Gateway helpers", async () => {
    vi.mocked(previewDpmWave).mockResolvedValue(waveResponse);
    vi.mocked(createDpmWave).mockResolvedValue(waveResponse);
    vi.mocked(sourceCheckDpmWave).mockResolvedValue(waveResponse);
    vi.mocked(simulateDpmWave).mockResolvedValue(waveResponse);
    vi.mocked(approveDpmWave).mockResolvedValue(waveResponse);
    vi.mocked(stageDpmWave).mockResolvedValue(waveResponse);
    vi.mocked(handoffDpmWave).mockResolvedValue(waveResponse);
    vi.mocked(getDpmWaveProofPackPosture).mockResolvedValue(waveResponse);

    render(
      <DpmWaveCommandCenterPanel
        portfolioId="PB_SG_GLOBAL_BAL_001"
        waveList={waveResponse}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Preview" }));
    await waitFor(() =>
      expect(previewDpmWave).toHaveBeenCalledWith({ portfolioId: "PB_SG_GLOBAL_BAL_001" }),
    );

    fireEvent.click(screen.getByRole("button", { name: "Create Rebalance" }));
    await waitFor(() =>
      expect(createDpmWave).toHaveBeenCalledWith({ portfolioId: "PB_SG_GLOBAL_BAL_001" }),
    );

    fireEvent.click(screen.getByRole("button", { name: "Load Changes" }));
    await waitFor(() => expect(getDpmWaveItems).toHaveBeenCalledWith("dwv_001"));

    fireEvent.click(screen.getByRole("button", { name: "Review Data" }));
    await waitFor(() => expect(sourceCheckDpmWave).toHaveBeenCalledWith("dwv_001"));

    fireEvent.click(screen.getByRole("button", { name: "Simulate" }));
    await waitFor(() => expect(simulateDpmWave).toHaveBeenCalledWith("dwv_001"));

    fireEvent.click(screen.getByRole("button", { name: "Request Approval" }));
    await waitFor(() => expect(approveDpmWave).toHaveBeenCalledWith("dwv_001"));

    fireEvent.click(screen.getByRole("button", { name: "Stage" }));
    await waitFor(() => expect(stageDpmWave).toHaveBeenCalledWith("dwv_001"));

    fireEvent.click(screen.getByRole("button", { name: "Prepare Handoff" }));
    await waitFor(() => expect(handoffDpmWave).toHaveBeenCalledWith("dwv_001"));

    fireEvent.click(screen.getByRole("button", { name: "Open Evidence Pack" }));
    await waitFor(() => expect(getDpmWaveProofPackPosture).toHaveBeenCalledWith("dwv_001"));
  });

  it("does not enable approval when mandate attention items block the workflow", async () => {
    render(
      <DpmWaveCommandCenterPanel
        portfolioId="PB_SG_GLOBAL_BAL_001"
        waveList={{
          ...waveResponse,
          supportability: {
            ...waveResponse.supportability,
            state: "blocked",
            reason_codes: ["MANDATE_ATTENTION_REQUIRED"],
            blocked_actions: ["approve"],
            issue_count: 1,
          },
        }}
      />,
    );

    await screen.findByText("AAPL US");

    expect(screen.getByRole("button", { name: "Request Approval" })).toBeDisabled();
    expect(screen.getByText("Resolve mandate attention items before approval.")).toBeInTheDocument();
  });
});
