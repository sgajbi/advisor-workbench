import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import DpmWaveCommandCenterPanel from "../../src/features/workbench/components/dpm-wave-command-center-panel";
import {
  approveDpmWave,
  createDpmWave,
  getDpmWaveItems,
  getDpmWaveProofPackPosture,
  handoffDpmWave,
  previewDpmWave,
  simulateDpmWave,
  sourceCheckDpmWave,
  stageDpmWave,
} from "../../src/features/workbench/api";
import type { DpmWaveGatewayResponse } from "../../src/features/workbench/types";

vi.mock("../../src/features/workbench/api", () => ({
  approveDpmWave: vi.fn(),
  createDpmWave: vi.fn(),
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

describe("DpmWaveCommandCenterPanel", () => {
  beforeEach(() => {
    vi.mocked(getDpmWaveItems).mockResolvedValue(itemResponse);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("renders the business-facing rebalance workspace with implementation-backed proposed changes", async () => {
    render(
      <DpmWaveCommandCenterPanel
        portfolioId="PB_SG_GLOBAL_BAL_001"
        waveList={waveResponse}
      />,
    );

    expect(screen.getByRole("heading", { name: "Rebalance" })).toBeInTheDocument();
    expect(screen.getByText("Proposed rebalance, advisor review, and approval readiness.")).toBeInTheDocument();
    expect(screen.getAllByText("Simulation ready").length).toBeGreaterThan(0);
    expect(screen.getByText("72.4%")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Active Rebalance" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Recommended Actions" })).toBeInTheDocument();

    const table = screen.getByRole("table", { name: "Proposed rebalance changes" });
    expect(await within(table).findByText("AAPL US")).toBeInTheDocument();
    expect(within(table).getByText("Trim")).toBeInTheDocument();
    expect(within(table).getByText("Equity overweight")).toBeInTheDocument();
    expect(within(table).getByText("MSFT US")).toBeInTheDocument();
    expect(screen.queryByText("lotus-manage")).not.toBeInTheDocument();
    expect(screen.queryByText("corr-wave")).not.toBeInTheDocument();
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
