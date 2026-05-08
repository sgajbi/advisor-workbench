import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import DpmWaveCommandCenterPanel from "../../src/features/workbench/components/dpm-wave-command-center-panel";
import {
  approveDpmWave,
  createDpmWave,
  getDpmWave,
  getDpmWaveItems,
  getDpmWaveProofPackPosture,
  getDpmWaveReportInput,
  getDpmWaveSupportability,
  handoffDpmWave,
  previewDpmWave,
  requestDpmWaveAiPmMemo,
  simulateDpmWave,
  sourceCheckDpmWave,
  stageDpmWave,
} from "../../src/features/workbench/api";
import type { DpmWaveGatewayResponse } from "../../src/features/workbench/types";

vi.mock("../../src/features/workbench/api", () => ({
  approveDpmWave: vi.fn(),
  createDpmWave: vi.fn(),
  getDpmWave: vi.fn(),
  getDpmWaveItems: vi.fn(),
  getDpmWaveProofPackPosture: vi.fn(),
  getDpmWaveReportInput: vi.fn(),
  getDpmWaveSupportability: vi.fn(),
  handoffDpmWave: vi.fn(),
  previewDpmWave: vi.fn(),
  requestDpmWaveAiPmMemo: vi.fn(),
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
    reason_codes: ["wave_supportability_ready"],
    blocked_actions: [],
    wave_id: "dwv_001",
    wave_state: "SOURCE_CHECKED",
    item_count: 1,
    issue_count: 0,
    remediation_owner: "Portfolio Operations",
  },
  data: {
    items: [
      {
        wave_id: "dwv_001",
        state: "SOURCE_CHECKED",
        trigger_type: "EXPLICIT_PORTFOLIO_LIST",
        as_of_date: "2026-05-03",
        item_count: 1,
        supportability_state: "ready",
        supportability_reason: "wave_supportability_ready",
      },
    ],
  },
};

describe("DpmWaveCommandCenterPanel", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("renders the Gateway-backed wave queue and bounded action controls", () => {
    render(
      <DpmWaveCommandCenterPanel
        portfolioId="PB_SG_GLOBAL_BAL_001"
        waveList={waveResponse}
      />,
    );

    expect(screen.getByRole("heading", { name: "Rebalance Wave Command Center" })).toBeInTheDocument();
    expect(screen.getAllByText("dwv_001").length).toBeGreaterThan(0);
    expect(screen.getAllByText("SOURCE_CHECKED").length).toBeGreaterThan(0);
    expect(screen.getByRole("button", { name: "Preview wave" })).toBeEnabled();
    expect(screen.getByRole("button", { name: "Create wave" })).toBeEnabled();
    expect(screen.getByRole("button", { name: "Source-check" })).toBeEnabled();
    expect(screen.getByRole("button", { name: "Simulate" })).toBeEnabled();
    expect(screen.getByRole("button", { name: "Approve" })).toBeEnabled();
    expect(screen.getByRole("button", { name: "Stage" })).toBeEnabled();
    expect(screen.getByRole("button", { name: "Handoff" })).toBeEnabled();
    expect(screen.getByRole("button", { name: "Proof posture" })).toBeEnabled();
    expect(screen.getByRole("button", { name: "Supportability" })).toBeEnabled();
    expect(screen.getByRole("button", { name: "Report input" })).toBeEnabled();
    expect(screen.getByRole("button", { name: "AI memo" })).toBeEnabled();
    expect(screen.getAllByText("NOT_REQUESTED").length).toBeGreaterThanOrEqual(2);
  });

  it("requests review, workflow, proof, and supportability actions through Gateway helpers", async () => {
    vi.mocked(previewDpmWave).mockResolvedValue(waveResponse);
    vi.mocked(getDpmWave).mockResolvedValue({
      ...waveResponse,
      data: {
        wave: {
          wave_id: "dwv_001",
          state: "SOURCE_CHECKED",
          aggregate_metrics: { item_count: 1 },
        },
      },
    });
    vi.mocked(getDpmWaveItems).mockResolvedValue({
      ...waveResponse,
      data: {
        items: [
          {
            wave_item_id: "dwi_1",
            portfolio_id: "PB_SG_GLOBAL_BAL_001",
            state: "SOURCE_CHECKED",
            source_readiness_state: "READY",
          },
        ],
      },
    });
    vi.mocked(sourceCheckDpmWave).mockResolvedValue(waveResponse);
    vi.mocked(simulateDpmWave).mockResolvedValue(waveResponse);
    vi.mocked(approveDpmWave).mockResolvedValue(waveResponse);
    vi.mocked(stageDpmWave).mockResolvedValue(waveResponse);
    vi.mocked(handoffDpmWave).mockResolvedValue(waveResponse);
    vi.mocked(getDpmWaveProofPackPosture).mockResolvedValue(waveResponse);
    vi.mocked(getDpmWaveSupportability).mockResolvedValue(waveResponse);
    vi.mocked(getDpmWaveReportInput).mockResolvedValue({
      ...waveResponse,
      data: {
        wave_id: "dwv_001",
        report_input_ref: "report-input:dwv_001",
        source_refs: ["lotus-manage:wave:dwv_001"],
      },
    });
    vi.mocked(requestDpmWaveAiPmMemo).mockResolvedValue({
      correlation_id: "corr-wave-ai-memo",
      contract_version: "v1",
      source_service: "lotus-ai",
      evidence_source_service: "lotus-manage",
      manage_upstream_status: 200,
      ai_upstream_status: 200,
      supportability: waveResponse.supportability,
      wave_report_input: {
        wave_id: "dwv_001",
        report_input_ref: "report-input:dwv_001",
      },
      memo_request: {
        requested_outputs: ["wave_pm_memo", "approval_checklist"],
        audience: ["portfolio_manager", "investment_control"],
      },
      data: { run_id: "wf_run_wave_memo_001", status: "REVIEW_REQUIRED" },
    });

    render(
      <DpmWaveCommandCenterPanel
        portfolioId="PB_SG_GLOBAL_BAL_001"
        waveList={waveResponse}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Preview wave" }));
    await waitFor(() =>
      expect(previewDpmWave).toHaveBeenCalledWith({ portfolioId: "PB_SG_GLOBAL_BAL_001" }),
    );

    fireEvent.click(screen.getByRole("button", { name: "Load detail" }));
    await waitFor(() => expect(getDpmWave).toHaveBeenCalledWith("dwv_001"));

    fireEvent.click(screen.getByRole("button", { name: "Load items" }));
    await waitFor(() => expect(getDpmWaveItems).toHaveBeenCalledWith("dwv_001"));

    fireEvent.click(screen.getByRole("button", { name: "Source-check" }));
    await waitFor(() => expect(sourceCheckDpmWave).toHaveBeenCalledWith("dwv_001"));

    fireEvent.click(screen.getByRole("button", { name: "Simulate" }));
    await waitFor(() => expect(simulateDpmWave).toHaveBeenCalledWith("dwv_001"));

    fireEvent.click(screen.getByRole("button", { name: "Approve" }));
    await waitFor(() => expect(approveDpmWave).toHaveBeenCalledWith("dwv_001"));

    fireEvent.click(screen.getByRole("button", { name: "Stage" }));
    await waitFor(() => expect(stageDpmWave).toHaveBeenCalledWith("dwv_001"));

    fireEvent.click(screen.getByRole("button", { name: "Handoff" }));
    await waitFor(() => expect(handoffDpmWave).toHaveBeenCalledWith("dwv_001"));

    fireEvent.click(screen.getByRole("button", { name: "Proof posture" }));
    await waitFor(() => expect(getDpmWaveProofPackPosture).toHaveBeenCalledWith("dwv_001"));

    fireEvent.click(screen.getByRole("button", { name: "Supportability" }));
    await waitFor(() => expect(getDpmWaveSupportability).toHaveBeenCalledWith("dwv_001"));

    fireEvent.click(screen.getByRole("button", { name: "Report input" }));
    await waitFor(() => expect(getDpmWaveReportInput).toHaveBeenCalledWith("dwv_001"));
    expect(await screen.findByText("report-input:dwv_001")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "AI memo" }));
    await waitFor(() => expect(requestDpmWaveAiPmMemo).toHaveBeenCalledWith("dwv_001"));
    expect(await screen.findByText("wf_run_wave_memo_001")).toBeInTheDocument();
  });

  it("creates a wave without direct manage calls", async () => {
    vi.mocked(createDpmWave).mockResolvedValue(waveResponse);

    render(
      <DpmWaveCommandCenterPanel
        portfolioId="PB_SG_GLOBAL_BAL_001"
        waveList={waveResponse}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Create wave" }));

    await waitFor(() =>
      expect(createDpmWave).toHaveBeenCalledWith({ portfolioId: "PB_SG_GLOBAL_BAL_001" }),
    );
    expect(
      await screen.findByText("Create wave completed through Gateway."),
    ).toBeInTheDocument();
  });
});
