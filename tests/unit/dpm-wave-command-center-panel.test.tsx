import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import DpmWaveCommandCenterPanel from "../../src/features/workbench/components/dpm-wave-command-center-panel";
import {
  approveDpmWave,
  createDpmWave,
  getDpmCampaignDefinitionLifecycleEvents,
  getDpmWaveItems,
  getDpmWaveProofPackPosture,
  handoffDpmWave,
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
  getDpmCampaignDefinitionLifecycleEvents: vi.fn(),
  getDpmWaveItems: vi.fn(),
  getDpmWaveProofPackPosture: vi.fn(),
  handoffDpmWave: vi.fn(),
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
        event_type: "CAMPAIGN_DEFINITION_CREATED",
        occurred_at: "2026-05-14T09:30:00Z",
        actor_id: "pm_sg_1",
        status: "RECORDED",
        reason_code: "source_backed_candidate_set",
      },
    ],
  },
};

describe("DpmWaveCommandCenterPanel", () => {
  beforeEach(() => {
    vi.mocked(getDpmWaveItems).mockResolvedValue(itemResponse);
    vi.mocked(getDpmCampaignDefinitionLifecycleEvents).mockResolvedValue(campaignLifecycleResponse);
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
      />,
    );

    expect(screen.getByRole("heading", { name: "Rebalance" })).toBeInTheDocument();
    expect(screen.getByText("Proposed rebalance, advisor review, and approval readiness.")).toBeInTheDocument();
    expect(screen.getAllByText("Simulation ready").length).toBeGreaterThan(0);
    expect(screen.getByText("72.4%")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Active Rebalance" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Campaign Definitions" })).toBeInTheDocument();
    expect(screen.getByText("Apple and Tesla holdings review")).toBeInTheDocument();
    expect(screen.getByText("Source-backed")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Campaign Lifecycle Evidence" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Recommended Actions" })).toBeInTheDocument();

    const table = screen.getByRole("table", { name: "Proposed rebalance changes" });
    expect(await within(table).findByText("AAPL US")).toBeInTheDocument();
    expect(within(table).getByText("Trim")).toBeInTheDocument();
    expect(within(table).getByText("Equity overweight")).toBeInTheDocument();
    expect(within(table).getByText("MSFT US")).toBeInTheDocument();
    expect(screen.queryByText("lotus-manage")).not.toBeInTheDocument();
    expect(screen.queryByText("corr-wave")).not.toBeInTheDocument();
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
    expect(within(table).getByText("Campaign Definition Created")).toBeInTheDocument();
    expect(within(table).getByText("2026-05-14T09:30:00Z")).toBeInTheDocument();
    expect(within(table).getByText("pm_sg_1")).toBeInTheDocument();
    expect(within(table).getByText("source_backed_candidate_set")).toBeInTheDocument();
    expect(screen.queryByText("corr-campaign-lifecycle")).not.toBeInTheDocument();
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
