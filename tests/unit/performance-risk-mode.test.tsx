import React from "react";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import PerformanceRiskMode from "../../src/apps/performance/components/performance-risk-mode";
import {
  buildFixtureRiskAttribution,
  buildFixtureRiskConcentration,
  buildFixtureRiskDrawdown,
  buildFixtureRiskRolling,
  buildFixtureRiskSummary,
} from "../../src/apps/performance/risk-workspace-view-model";
import {
  getWorkbenchRiskAttributionClient,
  getWorkbenchRiskConcentrationClient,
  getWorkbenchRiskDrawdownClient,
  getWorkbenchRiskRollingClient,
  getWorkbenchRiskSummaryClient,
} from "../../src/features/workbench/api";
import { buildBenchmarkUnassignedPerformanceScenario, buildSupportedPerformanceScenario } from "../fixtures/performance-workspace-fixtures";

vi.mock("../../src/features/workbench/api", () => ({
  getWorkbenchRiskSummaryClient: vi.fn(),
  getWorkbenchRiskConcentrationClient: vi.fn(),
  getWorkbenchRiskAttributionClient: vi.fn(),
  getWorkbenchRiskDrawdownClient: vi.fn(),
  getWorkbenchRiskRollingClient: vi.fn(),
}));

function renderRiskMode(
  scenario = buildSupportedPerformanceScenario(),
  options: { detailBasis?: "NET" | "GROSS"; period?: string; isDetailsPending?: boolean } = {}
) {
  return render(
    <PerformanceRiskMode
      workspace={scenario.workspace}
      capabilities={scenario.capabilities}
      period={options.period ?? "YTD"}
      detailBasis={options.detailBasis ?? "NET"}
      contributionDimension="asset_class"
      attributionDimension="asset_class"
      chartFrequency="monthly"
      isUpdating={false}
      isDetailsPending={options.isDetailsPending ?? false}
    />
  );
}

describe("PerformanceRiskMode", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("fetches live Gateway-backed risk summary and concentration contracts", async () => {
    const scenario = buildSupportedPerformanceScenario();
    vi.mocked(getWorkbenchRiskSummaryClient).mockResolvedValue(
      buildFixtureRiskSummary(scenario.workspace, "YTD", "NET")
    );
    vi.mocked(getWorkbenchRiskConcentrationClient).mockResolvedValue(
      buildFixtureRiskConcentration(scenario.workspace, "YTD")
    );
    vi.mocked(getWorkbenchRiskAttributionClient).mockResolvedValue(
      buildFixtureRiskAttribution(scenario.workspace, "YTD", "NET")
    );
    vi.mocked(getWorkbenchRiskDrawdownClient).mockResolvedValue(
      buildFixtureRiskDrawdown(scenario.workspace, "YTD", "NET")
    );
    vi.mocked(getWorkbenchRiskRollingClient).mockResolvedValue(
      buildFixtureRiskRolling(scenario.workspace, "YTD", "NET")
    );

    const { container } = renderRiskMode(scenario);

    expect(screen.getByText("Loading stateful risk")).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.getByLabelText("Risk snapshot headline metrics")).toHaveTextContent("Volatility");
    });
    expect(screen.queryByLabelText("Risk snapshot business reading")).not.toBeInTheDocument();
    expect(screen.getByLabelText("Risk executive overview")).toHaveTextContent("Risk posture");
    expect(screen.getByLabelText("Risk executive overview")).toHaveTextContent("What matters now");
    expect(screen.getByLabelText("Primary risk review")).toBeInTheDocument();
    expect(screen.getByLabelText("Secondary risk analysis")).toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: /methodology and coverage$/i })).toHaveLength(5);
    expect(screen.queryByLabelText("Drawdown business reading")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Rolling risk business reading")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Historical risk attribution business reading")).not.toBeInTheDocument();
    const concentrationHeading = screen.getByRole("heading", { name: "Concentration" });
    const rollingHeading = screen.getByRole("heading", { name: "Rolling Risk" });
    const attributionHeading = screen.getByRole("heading", {
      name: "Historical Risk Attribution",
    });
    expect(
      concentrationHeading.compareDocumentPosition(rollingHeading) &
        Node.DOCUMENT_POSITION_FOLLOWING
    ).toBeTruthy();
    expect(
      rollingHeading.compareDocumentPosition(attributionHeading) &
        Node.DOCUMENT_POSITION_FOLLOWING
    ).toBeTruthy();
    expect(
      container.querySelector(".performance-risk-secondary-group .performance-risk-rolling-panel")
    ).toBeTruthy();
    expect(
      container.querySelector(
        ".performance-risk-secondary-group .performance-risk-attribution-panel"
      )
    ).toBeTruthy();
    expect(
      container.querySelector(".performance-risk-secondary-group .performance-risk-secondary-main")
    ).toBeTruthy();
    expect(
      container.querySelector(
        ".performance-risk-secondary-group .performance-risk-secondary-sidecar"
      )
    ).toBeTruthy();
    expect(container.querySelectorAll(".performance-risk-module-shell-compact")).toHaveLength(5);
    expect(screen.queryByText("Coverage and methodology")).not.toBeInTheDocument();

    expect(getWorkbenchRiskSummaryClient).toHaveBeenCalledWith("PF_1001", {
      period: "YTD",
      detailBasis: "NET",
      benchmark: "BMK_GLOBAL_BALANCED_60_40",
      asOfDate: "2026-02-24",
      reportingCurrency: "USD",
    });
    expect(getWorkbenchRiskConcentrationClient).toHaveBeenCalledWith("PF_1001", {
      period: "YTD",
      benchmark: "BMK_GLOBAL_BALANCED_60_40",
      asOfDate: "2026-02-24",
      reportingCurrency: "USD",
    });
    expect(getWorkbenchRiskAttributionClient).toHaveBeenCalledWith("PF_1001", {
      period: "YTD",
      detailBasis: "NET",
      benchmark: "BMK_GLOBAL_BALANCED_60_40",
      asOfDate: "2026-02-24",
      reportingCurrency: "USD",
      attributionType: "TOTAL_RISK",
      groupingDimension: "SECTOR",
    });
    expect(getWorkbenchRiskDrawdownClient).toHaveBeenCalledWith("PF_1001", {
      period: "YTD",
      detailBasis: "NET",
      benchmark: "BMK_GLOBAL_BALANCED_60_40",
      asOfDate: "2026-02-24",
      reportingCurrency: "USD",
      includeUnderwaterSeries: false,
    });
    expect(getWorkbenchRiskRollingClient).toHaveBeenCalledWith("PF_1001", {
      period: "YTD",
      detailBasis: "NET",
      benchmark: "BMK_GLOBAL_BALANCED_60_40",
      asOfDate: "2026-02-24",
      reportingCurrency: "USD",
      includeTimeSeries: false,
    });
  });

  it("reuses cached live responses for the same request shape and invalidates summary only when detail basis changes", async () => {
    const scenario = buildSupportedPerformanceScenario();
    vi.mocked(getWorkbenchRiskSummaryClient).mockResolvedValue(
      buildFixtureRiskSummary(scenario.workspace, "YTD", "NET")
    );
    vi.mocked(getWorkbenchRiskConcentrationClient).mockResolvedValue(
      buildFixtureRiskConcentration(scenario.workspace, "YTD")
    );
    vi.mocked(getWorkbenchRiskAttributionClient).mockResolvedValue(
      buildFixtureRiskAttribution(scenario.workspace, "YTD", "NET")
    );
    vi.mocked(getWorkbenchRiskDrawdownClient).mockResolvedValue(
      buildFixtureRiskDrawdown(scenario.workspace, "YTD", "NET")
    );
    vi.mocked(getWorkbenchRiskRollingClient).mockResolvedValue(
      buildFixtureRiskRolling(scenario.workspace, "YTD", "NET")
    );

    const { rerender } = render(
      <PerformanceRiskMode
        workspace={scenario.workspace}
        capabilities={scenario.capabilities}
        period="YTD"
        detailBasis="NET"
        contributionDimension="asset_class"
        attributionDimension="asset_class"
        chartFrequency="monthly"
        isUpdating={false}
        isDetailsPending={false}
      />
    );

    await waitFor(() => {
      expect(screen.getByLabelText("Risk snapshot headline metrics")).toBeInTheDocument();
    });

    rerender(
      <PerformanceRiskMode
        workspace={scenario.workspace}
        capabilities={scenario.capabilities}
        period="YTD"
        detailBasis="NET"
        contributionDimension="asset_class"
        attributionDimension="asset_class"
        chartFrequency="monthly"
        isUpdating={false}
        isDetailsPending={false}
      />
    );

    await waitFor(() => {
      expect(screen.getByLabelText("Risk concentration headline metrics")).toBeInTheDocument();
    });

    expect(getWorkbenchRiskSummaryClient).toHaveBeenCalledTimes(1);
    expect(getWorkbenchRiskConcentrationClient).toHaveBeenCalledTimes(1);
    expect(getWorkbenchRiskAttributionClient).toHaveBeenCalledTimes(1);
    expect(getWorkbenchRiskDrawdownClient).toHaveBeenCalledTimes(1);
    expect(getWorkbenchRiskRollingClient).toHaveBeenCalledTimes(1);

    vi.mocked(getWorkbenchRiskSummaryClient).mockResolvedValue(
      buildFixtureRiskSummary(scenario.workspace, "YTD", "GROSS")
    );

    rerender(
      <PerformanceRiskMode
        workspace={scenario.workspace}
        capabilities={scenario.capabilities}
        period="YTD"
        detailBasis="GROSS"
        contributionDimension="asset_class"
        attributionDimension="asset_class"
        chartFrequency="monthly"
        isUpdating={false}
        isDetailsPending={false}
      />
    );

    await waitFor(() => {
      expect(getWorkbenchRiskSummaryClient).toHaveBeenCalledTimes(2);
    });
    expect(getWorkbenchRiskConcentrationClient).toHaveBeenCalledTimes(1);
    expect(getWorkbenchRiskAttributionClient).toHaveBeenCalledTimes(2);
    expect(getWorkbenchRiskDrawdownClient).toHaveBeenCalledTimes(2);
    expect(getWorkbenchRiskRollingClient).toHaveBeenCalledTimes(2);
  });

  it("shows partial live supportability when benchmark-relative risk is unavailable", async () => {
    const scenario = buildBenchmarkUnassignedPerformanceScenario();
    vi.mocked(getWorkbenchRiskSummaryClient).mockResolvedValue(
      buildFixtureRiskSummary(scenario.workspace, "YTD", "NET")
    );
    vi.mocked(getWorkbenchRiskConcentrationClient).mockResolvedValue(
      buildFixtureRiskConcentration(scenario.workspace, "YTD")
    );
    vi.mocked(getWorkbenchRiskAttributionClient).mockResolvedValue(
      buildFixtureRiskAttribution(scenario.workspace, "YTD", "NET")
    );
    vi.mocked(getWorkbenchRiskDrawdownClient).mockResolvedValue(
      buildFixtureRiskDrawdown(scenario.workspace, "YTD", "NET", {
        includeBenchmarkRelative: false,
      })
    );
    vi.mocked(getWorkbenchRiskRollingClient).mockResolvedValue(
      buildFixtureRiskRolling(scenario.workspace, "YTD", "NET")
    );

    const { container } = renderRiskMode(scenario);

    await waitFor(() => {
      expect(screen.getByLabelText("Risk drawdown headline metrics")).toHaveTextContent(
        "Relative Max Drawdown"
      );
    });
    expect(screen.getByLabelText("Risk drawdown headline metrics")).toHaveTextContent("N/A");
    expect(screen.getByLabelText("Risk executive overview")).toHaveTextContent("Evidence posture");
  });

  it("opens panel methodology and coverage on demand without changing data-fetch flow", async () => {
    const scenario = buildSupportedPerformanceScenario();
    vi.mocked(getWorkbenchRiskSummaryClient).mockResolvedValue(
      buildFixtureRiskSummary(scenario.workspace, "YTD", "NET")
    );
    vi.mocked(getWorkbenchRiskConcentrationClient).mockResolvedValue(
      buildFixtureRiskConcentration(scenario.workspace, "YTD")
    );
    vi.mocked(getWorkbenchRiskAttributionClient).mockResolvedValue(
      buildFixtureRiskAttribution(scenario.workspace, "YTD", "NET")
    );
    vi.mocked(getWorkbenchRiskDrawdownClient).mockResolvedValue(
      buildFixtureRiskDrawdown(scenario.workspace, "YTD", "NET")
    );
    vi.mocked(getWorkbenchRiskRollingClient).mockResolvedValue(
      buildFixtureRiskRolling(scenario.workspace, "YTD", "NET")
    );

    renderRiskMode(scenario);

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Risk Snapshot methodology and coverage" })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: "Concentration methodology and coverage" }));

    const dialog = screen.getByRole("dialog", {
      name: "Concentration methodology and coverage",
    });

    expect(dialog).toBeInTheDocument();
    expect(within(dialog).getByText("Issuer Coverage")).toBeInTheDocument();
    expect(within(dialog).getByText("Grouping Level")).toBeInTheDocument();
    expect(within(dialog).getByText("Enrichment Policy")).toBeInTheDocument();
    expect(getWorkbenchRiskConcentrationClient).toHaveBeenCalledTimes(1);
  });

  it("renders enriched concentration interpretation without a provenance footer", async () => {
    const scenario = buildSupportedPerformanceScenario();
    vi.mocked(getWorkbenchRiskSummaryClient).mockResolvedValue(
      buildFixtureRiskSummary(scenario.workspace, "YTD", "NET")
    );
    vi.mocked(getWorkbenchRiskConcentrationClient).mockResolvedValue(
      buildFixtureRiskConcentration(scenario.workspace, "YTD")
    );
    vi.mocked(getWorkbenchRiskAttributionClient).mockResolvedValue(
      buildFixtureRiskAttribution(scenario.workspace, "YTD", "NET")
    );
    vi.mocked(getWorkbenchRiskDrawdownClient).mockResolvedValue(
      buildFixtureRiskDrawdown(scenario.workspace, "YTD", "NET")
    );
    vi.mocked(getWorkbenchRiskRollingClient).mockResolvedValue(
      buildFixtureRiskRolling(scenario.workspace, "YTD", "NET")
    );

    renderRiskMode(scenario);

    await waitFor(() => {
      expect(screen.getByLabelText("Risk concentration headline metrics")).toBeInTheDocument();
    });
    expect(screen.queryByLabelText("Risk concentration executive summary")).not.toBeInTheDocument();
    const concentrationMetricStrip = screen.getByLabelText("Risk concentration headline metrics");
    expect(
      within(concentrationMetricStrip)
        .getByText("Portfolio Concentration Index")
        .closest(".performance-risk-concentration-indicator-tile")
    ).toHaveAttribute(
      "title",
      "Herfindahl-Hirschman Index for the current portfolio. Higher values indicate exposure concentrated in fewer holdings."
    );
    expect(screen.getByLabelText("Risk concentration scale")).toHaveTextContent(
      "Diversified"
    );
    expect(screen.queryByLabelText("Risk concentration driver analysis")).not.toBeInTheDocument();
    fireEvent.click(
      screen.getByRole("button", { name: "Concentration methodology and coverage" })
    );

    const concentrationDialog = screen.getByRole("dialog", {
      name: "Concentration methodology and coverage",
    });

    expect(concentrationDialog).toHaveTextContent("Grouping Level");
    expect(screen.queryByLabelText("Risk concentration diagnostic table")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Risk provenance")).not.toBeInTheDocument();
  });

  it("uses a single semantic status badge in the risk header", async () => {
    const scenario = buildSupportedPerformanceScenario();
    vi.mocked(getWorkbenchRiskSummaryClient).mockResolvedValue(
      buildFixtureRiskSummary(scenario.workspace, "YTD", "NET")
    );
    vi.mocked(getWorkbenchRiskConcentrationClient).mockResolvedValue(
      buildFixtureRiskConcentration(scenario.workspace, "YTD")
    );
    vi.mocked(getWorkbenchRiskAttributionClient).mockResolvedValue(
      buildFixtureRiskAttribution(scenario.workspace, "YTD", "NET")
    );
    vi.mocked(getWorkbenchRiskDrawdownClient).mockResolvedValue(
      buildFixtureRiskDrawdown(scenario.workspace, "YTD", "NET")
    );
    vi.mocked(getWorkbenchRiskRollingClient).mockResolvedValue(
      buildFixtureRiskRolling(scenario.workspace, "YTD", "NET")
    );

    const { container } = renderRiskMode(scenario);

    await waitFor(() => {
      expect(screen.getByLabelText("Risk mode status")).toHaveTextContent("Partial");
    });

    expect(screen.getByLabelText("Risk mode status")).toHaveTextContent("Partial");
    expect(screen.getByLabelText("Risk mode status")).not.toHaveTextContent("Input mode");
    expect(screen.getByLabelText("Risk mode status")).not.toHaveTextContent("Stateful only");
    expect(screen.getByLabelText("Risk mode status")).not.toHaveTextContent("Evidence");
    expect(screen.getByLabelText("Risk mode status")).not.toHaveTextContent("Review notes");
    expect(screen.queryByLabelText("Status Stateful only")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Status Source-grounded")).not.toBeInTheDocument();
  });

  it("renders controlled unavailable states when both live BFF requests fail", async () => {
    vi.mocked(getWorkbenchRiskSummaryClient).mockRejectedValue(new Error("summary down"));
    vi.mocked(getWorkbenchRiskConcentrationClient).mockRejectedValue(
      new Error("concentration down")
    );
    vi.mocked(getWorkbenchRiskAttributionClient).mockRejectedValue(new Error("attribution down"));
    vi.mocked(getWorkbenchRiskDrawdownClient).mockRejectedValue(new Error("drawdown down"));
    vi.mocked(getWorkbenchRiskRollingClient).mockRejectedValue(new Error("rolling down"));

    renderRiskMode();

    await waitFor(() => {
      expect(screen.getByText("Risk unavailable")).toBeInTheDocument();
    });
    expect(screen.queryByLabelText("Risk provenance")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Risk snapshot headline metrics")).not.toBeInTheDocument();
  });

  it("does not request underwater detail on first paint and fetches it only on drawer drill-down", async () => {
    const scenario = buildSupportedPerformanceScenario();
    vi.mocked(getWorkbenchRiskSummaryClient).mockResolvedValue(
      buildFixtureRiskSummary(scenario.workspace, "YTD", "NET")
    );
    vi.mocked(getWorkbenchRiskConcentrationClient).mockResolvedValue(
      buildFixtureRiskConcentration(scenario.workspace, "YTD")
    );
    vi.mocked(getWorkbenchRiskAttributionClient).mockResolvedValue(
      buildFixtureRiskAttribution(scenario.workspace, "YTD", "NET")
    );
    vi.mocked(getWorkbenchRiskDrawdownClient)
      .mockResolvedValueOnce(buildFixtureRiskDrawdown(scenario.workspace, "YTD", "NET"))
      .mockResolvedValueOnce(
        buildFixtureRiskDrawdown(scenario.workspace, "YTD", "NET", {
          includeUnderwaterSeries: true,
        })
      );
    vi.mocked(getWorkbenchRiskRollingClient).mockResolvedValue(
      buildFixtureRiskRolling(scenario.workspace, "YTD", "NET")
    );

    renderRiskMode(scenario);

    await waitFor(() => {
      expect(screen.getByLabelText("Risk drawdown headline metrics")).toBeInTheDocument();
    });

    expect(getWorkbenchRiskDrawdownClient).toHaveBeenCalledTimes(1);
    expect(vi.mocked(getWorkbenchRiskDrawdownClient).mock.calls[0][1]).toMatchObject({
      includeUnderwaterSeries: false,
    });

    fireEvent.click(screen.getByRole("button", { name: "View underwater path" }));

    await waitFor(() => {
      expect(screen.getByRole("dialog", { name: "Underwater path detail" })).toBeInTheDocument();
      expect(screen.getByLabelText("Risk underwater series table")).toBeInTheDocument();
    });

    expect(getWorkbenchRiskDrawdownClient).toHaveBeenCalledTimes(2);
    expect(vi.mocked(getWorkbenchRiskDrawdownClient).mock.calls[1][1]).toMatchObject({
      includeUnderwaterSeries: true,
    });
  });

  it("does not request rolling detail on first paint and fetches it only on drawer drill-down", async () => {
    const scenario = buildSupportedPerformanceScenario();
    vi.mocked(getWorkbenchRiskSummaryClient).mockResolvedValue(
      buildFixtureRiskSummary(scenario.workspace, "YTD", "NET")
    );
    vi.mocked(getWorkbenchRiskConcentrationClient).mockResolvedValue(
      buildFixtureRiskConcentration(scenario.workspace, "YTD")
    );
    vi.mocked(getWorkbenchRiskAttributionClient).mockResolvedValue(
      buildFixtureRiskAttribution(scenario.workspace, "YTD", "NET")
    );
    vi.mocked(getWorkbenchRiskDrawdownClient).mockResolvedValue(
      buildFixtureRiskDrawdown(scenario.workspace, "YTD", "NET")
    );
    vi.mocked(getWorkbenchRiskRollingClient)
      .mockResolvedValueOnce(buildFixtureRiskRolling(scenario.workspace, "YTD", "NET"))
      .mockResolvedValueOnce(
        buildFixtureRiskRolling(scenario.workspace, "YTD", "NET", {
          includeTimeSeries: true,
        })
      );

    renderRiskMode(scenario);

    await waitFor(() => {
      expect(screen.getByLabelText("Rolling risk summary table")).toBeInTheDocument();
    });

    expect(getWorkbenchRiskRollingClient).toHaveBeenCalledTimes(1);
    expect(vi.mocked(getWorkbenchRiskRollingClient).mock.calls[0][1]).toMatchObject({
      includeTimeSeries: false,
    });

    fireEvent.click(screen.getByRole("button", { name: "View rolling series" }));

    await waitFor(() => {
      expect(screen.getByRole("dialog", { name: "Rolling series detail" })).toBeInTheDocument();
      expect(screen.getByLabelText("Rolling risk series table")).toBeInTheDocument();
    });

    expect(getWorkbenchRiskRollingClient).toHaveBeenCalledTimes(2);
    expect(vi.mocked(getWorkbenchRiskRollingClient).mock.calls[1][1]).toMatchObject({
      includeTimeSeries: true,
    });
  });

  it("preserves the selected rolling window when opening rolling series detail", async () => {
    const scenario = buildSupportedPerformanceScenario();
    vi.mocked(getWorkbenchRiskSummaryClient).mockResolvedValue(
      buildFixtureRiskSummary(scenario.workspace, "YTD", "NET")
    );
    vi.mocked(getWorkbenchRiskConcentrationClient).mockResolvedValue(
      buildFixtureRiskConcentration(scenario.workspace, "YTD")
    );
    vi.mocked(getWorkbenchRiskAttributionClient).mockResolvedValue(
      buildFixtureRiskAttribution(scenario.workspace, "YTD", "NET")
    );
    vi.mocked(getWorkbenchRiskDrawdownClient).mockResolvedValue(
      buildFixtureRiskDrawdown(scenario.workspace, "YTD", "NET")
    );
    vi.mocked(getWorkbenchRiskRollingClient)
      .mockResolvedValueOnce(buildFixtureRiskRolling(scenario.workspace, "YTD", "NET"))
      .mockResolvedValueOnce(
        buildFixtureRiskRolling(scenario.workspace, "YTD", "NET", {
          includeTimeSeries: true,
        })
      );

    renderRiskMode(scenario);

    await waitFor(() => {
      expect(screen.getByRole("tab", { name: "63D" })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("tab", { name: "63D" }));
    fireEvent.click(screen.getByRole("button", { name: "View rolling series" }));

    await waitFor(() => {
      expect(screen.getByRole("dialog", { name: "Rolling series detail" })).toBeInTheDocument();
    });

    const detailDialog = screen.getByRole("dialog", { name: "Rolling series detail" });
    expect(within(detailDialog).getByText("Review window")).toBeInTheDocument();
    expect(within(detailDialog).getByText("63D")).toBeInTheDocument();
  });

  it("requests supported active-risk attribution directly and does not expose issuer as interactive", async () => {
    const scenario = buildSupportedPerformanceScenario();
    vi.mocked(getWorkbenchRiskSummaryClient).mockResolvedValue(
      buildFixtureRiskSummary(scenario.workspace, "YTD", "NET")
    );
    vi.mocked(getWorkbenchRiskConcentrationClient).mockResolvedValue(
      buildFixtureRiskConcentration(scenario.workspace, "YTD")
    );
    vi.mocked(getWorkbenchRiskAttributionClient).mockImplementation(async (_portfolioId, params) =>
      buildFixtureRiskAttribution(scenario.workspace, "YTD", "NET", {
        attributionType:
          params.attributionType === "ACTIVE_RISK" ? "ACTIVE_RISK" : "TOTAL_RISK",
        groupingDimension:
          params.groupingDimension === "ASSET_CLASS"
            ? "ASSET_CLASS"
            : params.groupingDimension === "POSITION"
              ? "POSITION"
              : params.groupingDimension === "ISSUER"
                ? "ISSUER"
                : "SECTOR",
      })
    );
    vi.mocked(getWorkbenchRiskDrawdownClient).mockResolvedValue(
      buildFixtureRiskDrawdown(scenario.workspace, "YTD", "NET")
    );
    vi.mocked(getWorkbenchRiskRollingClient).mockResolvedValue(
      buildFixtureRiskRolling(scenario.workspace, "YTD", "NET")
    );

    renderRiskMode(scenario);

    await waitFor(() => {
      expect(screen.getByLabelText("Historical risk attribution table")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("tab", { name: "Active Risk" }));
    await waitFor(() => {
      expect(getWorkbenchRiskAttributionClient).toHaveBeenCalledWith("PF_1001", {
        period: "YTD",
        detailBasis: "NET",
        benchmark: "BMK_GLOBAL_BALANCED_60_40",
        asOfDate: "2026-02-24",
        reportingCurrency: "USD",
        attributionType: "ACTIVE_RISK",
        groupingDimension: "SECTOR",
      });
    });
    fireEvent.click(screen.getByRole("tab", { name: "Asset Class" }));

    await waitFor(() => {
      expect(getWorkbenchRiskAttributionClient).toHaveBeenCalledTimes(3);
    });
    expect(getWorkbenchRiskAttributionClient).toHaveBeenLastCalledWith("PF_1001", {
      period: "YTD",
      detailBasis: "NET",
      benchmark: "BMK_GLOBAL_BALANCED_60_40",
      asOfDate: "2026-02-24",
      reportingCurrency: "USD",
      attributionType: "ACTIVE_RISK",
      groupingDimension: "ASSET_CLASS",
    });
    await waitFor(() => {
      expect(screen.getByRole("tab", { name: "Issuer" })).toBeDisabled();
    });
  });

  it("renders structured attribution blocked state instead of raw inline copy", async () => {
    const scenario = buildSupportedPerformanceScenario();
    vi.mocked(getWorkbenchRiskSummaryClient).mockResolvedValue(
      buildFixtureRiskSummary(scenario.workspace, "YTD", "NET")
    );
    vi.mocked(getWorkbenchRiskConcentrationClient).mockResolvedValue(
      buildFixtureRiskConcentration(scenario.workspace, "YTD")
    );
    vi.mocked(getWorkbenchRiskAttributionClient).mockResolvedValue(
      buildFixtureRiskAttribution(scenario.workspace, "YTD", "NET", {
        attributionType: "ACTIVE_RISK",
        groupingDimension: "ISSUER",
      })
    );
    vi.mocked(getWorkbenchRiskDrawdownClient).mockResolvedValue(
      buildFixtureRiskDrawdown(scenario.workspace, "YTD", "NET")
    );
    vi.mocked(getWorkbenchRiskRollingClient).mockResolvedValue(
      buildFixtureRiskRolling(scenario.workspace, "YTD", "NET")
    );

    renderRiskMode(scenario);

    await waitFor(() => {
      expect(screen.getByText("Attribution selection blocked")).toBeInTheDocument();
    });
    expect(
      screen.getByText("Choose a supported attribution type and grouping combination to continue.")
    ).toBeInTheDocument();
  });

  it("renders structured unavailable states for deferred detail panels", async () => {
    const scenario = buildSupportedPerformanceScenario();
    vi.mocked(getWorkbenchRiskSummaryClient).mockResolvedValue(
      buildFixtureRiskSummary(scenario.workspace, "YTD", "NET")
    );
    vi.mocked(getWorkbenchRiskConcentrationClient).mockResolvedValue(
      buildFixtureRiskConcentration(scenario.workspace, "YTD")
    );
    vi.mocked(getWorkbenchRiskAttributionClient).mockResolvedValue(
      buildFixtureRiskAttribution(scenario.workspace, "YTD", "NET")
    );
    vi.mocked(getWorkbenchRiskDrawdownClient)
      .mockResolvedValueOnce(buildFixtureRiskDrawdown(scenario.workspace, "YTD", "NET"))
      .mockRejectedValueOnce(new Error("underwater unavailable"));
    vi.mocked(getWorkbenchRiskRollingClient)
      .mockResolvedValueOnce(buildFixtureRiskRolling(scenario.workspace, "YTD", "NET"))
      .mockRejectedValueOnce(new Error("rolling unavailable"));

    renderRiskMode(scenario);

    await waitFor(() => {
      expect(screen.getByLabelText("Risk drawdown headline metrics")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: "View underwater path" }));
    await waitFor(() => {
      expect(screen.getByText("Underwater path unavailable")).toBeInTheDocument();
    });
    fireEvent.click(screen.getByRole("button", { name: "Close Underwater path detail" }));

    fireEvent.click(screen.getByRole("button", { name: "View rolling series" }));
    await waitFor(() => {
      expect(screen.getByText("Rolling series unavailable")).toBeInTheDocument();
    });
  });
});
