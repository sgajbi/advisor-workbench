import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import PerformanceSummaryMode from "../../src/apps/performance/components/performance-summary-mode";
import type { PerformanceSummaryModeProps } from "../../src/apps/performance/components/performance-workspace-types";
import { buildSupportedPerformanceScenario } from "../fixtures/performance-workspace-fixtures";

const { chartPanelMock, multiHorizonPanelMock } = vi.hoisted(() => ({
  chartPanelMock: vi.fn(({
    title,
    id,
    returnView,
    onReturnViewChange,
  }: {
    title: string;
    id?: string;
    returnView: string;
    onReturnViewChange: (view: "relative") => void;
  }) => (
    <div data-testid="chart-panel">
      {title}:{returnView}
      {id ? `:${id}` : ""}
      <button type="button" onClick={() => onReturnViewChange("relative")}>
        Prefer relative
      </button>
    </div>
  )),
  multiHorizonPanelMock: vi.fn(({
    portfolioId,
    period,
    detailBasis,
    benchmark,
    returnView,
  }: {
    portfolioId: string;
    period: string;
    detailBasis: string;
    benchmark?: string;
    returnView: string;
  }) => (
    <div data-testid="multi-horizon-panel">
      {portfolioId}:{period}:{detailBasis}:{benchmark ?? "none"}:{returnView}
    </div>
  )),
}));

vi.mock("../../src/apps/performance/components/performance-chart-panel", () => ({
  default: chartPanelMock,
}));

vi.mock("../../src/apps/performance/components/performance-multi-horizon-panel", () => ({
  default: multiHorizonPanelMock,
}));

vi.mock("../../src/apps/performance/components/performance-summary-contributors-section", () => ({
  default: ({
    positivePositionContributors,
    negativePositionContributors,
  }: {
    positivePositionContributors: Array<{ position_id: string }>;
    negativePositionContributors: Array<{ position_id: string }>;
  }) => (
    <div data-testid="contributors-section">
      {positivePositionContributors.map((row) => row.position_id).join(",")}|
      {negativePositionContributors.map((row) => row.position_id).join(",")}
    </div>
  ),
}));

describe("PerformanceSummaryMode", () => {
  it("wires deferred summary modules for the selected basis and contributor inputs", async () => {
    const scenario = buildSupportedPerformanceScenario();

    render(
      <PerformanceSummaryMode
        workspace={scenario.workspace}
        period="YTD"
        detailBasis="GROSS"
        contributionDimension="asset_class"
        attributionDimension="asset_class"
        chartFrequency="monthly"
        benchmark="BMK_OVERRIDE"
        capabilities={scenario.capabilities}
        selectedBenchmarkCode={scenario.selectedBenchmarkCode}
        selectedBenchmarkLabel={scenario.selectedBenchmarkLabel}
        selectedPerformance={scenario.workspace.gross_performance}
        primaryDriver={null}
        hasMoneyWeightedReturn={false}
        suspiciousMoneyWeightedReturn={false}
        contributorScale={1}
        positivePositionContributors={[
          {
            position_id: "AAPL",
            contribution_pct: 1.5,
            weight_avg_pct: 24,
            total_return_pct: 8,
            local_contribution_pct: 1.1,
            fx_contribution_pct: 0.4,
          },
        ]}
        negativePositionContributors={[
          {
            position_id: "TLT",
            contribution_pct: -0.2,
            weight_avg_pct: 8,
            total_return_pct: -2,
            local_contribution_pct: -0.2,
            fx_contribution_pct: 0,
          },
        ]}
        topContributors={[
          {
            key_label: "Equity",
            contribution_pct: 3.8,
            weight_avg_pct: 61,
            total_return_pct: 7.4,
            local_contribution_pct: 3.4,
            fx_contribution_pct: 0.4,
            is_other: false,
          },
        ]}
        bottomContributors={[
          {
            key_label: "Rates",
            contribution_pct: -0.6,
            weight_avg_pct: 18,
            total_return_pct: -1.9,
            local_contribution_pct: -0.5,
            fx_contribution_pct: -0.1,
            is_other: false,
          },
        ]}
        isUpdating={false}
        isDetailsPending={false}
      />
    );

    expect(document.querySelectorAll(".workbench-summary-region")).toHaveLength(2);
    expect(screen.queryByText("Trust and completeness strip")).not.toBeInTheDocument();
    expect(screen.queryByText("Analysis Mode Panel")).not.toBeInTheDocument();
    expect(screen.queryByText("Evidence Mode Panel")).not.toBeInTheDocument();
    expect(screen.getByTestId("chart-panel")).toHaveTextContent(
      "Time-weighted return path · Gross of fees:absolute:performance-trend"
    );
    expect(screen.getByTestId("multi-horizon-panel")).toHaveTextContent(
      `${scenario.workspace.portfolio_id}:YTD:GROSS:${scenario.selectedBenchmarkCode}:absolute`
    );
    expect(screen.getByTestId("contributors-section")).toHaveTextContent("AAPL|TLT");
    expect(chartPanelMock).toHaveBeenCalledTimes(1);
    expect(chartPanelMock).toHaveBeenCalledWith(
      expect.objectContaining({
        moneyWeightedReturn: scenario.workspace.money_weighted_return,
      }),
      undefined
    );
  });

  it("keeps return path and horizon comparison aligned when refreshed data cannot support the preferred view", () => {
    const scenario = buildSupportedPerformanceScenario();
    const commonProps = {
      period: "YTD",
      detailBasis: "GROSS",
      contributionDimension: "asset_class",
      attributionDimension: "asset_class",
      chartFrequency: "monthly",
      benchmark: "BMK_OVERRIDE",
      capabilities: scenario.capabilities,
      selectedBenchmarkCode: scenario.selectedBenchmarkCode,
      selectedBenchmarkLabel: scenario.selectedBenchmarkLabel,
      selectedPerformance: scenario.workspace.gross_performance,
      primaryDriver: null,
      hasMoneyWeightedReturn: false,
      suspiciousMoneyWeightedReturn: false,
      contributorScale: 1,
      positivePositionContributors: [],
      negativePositionContributors: [],
      topContributors: [],
      bottomContributors: [],
      isUpdating: false,
      isDetailsPending: false,
    } satisfies Omit<PerformanceSummaryModeProps, "workspace">;
    const { rerender } = render(
      <PerformanceSummaryMode workspace={scenario.workspace} {...commonProps} />
    );

    fireEvent.click(screen.getByRole("button", { name: "Prefer relative" }));

    expect(chartPanelMock).toHaveBeenLastCalledWith(
      expect.objectContaining({ returnView: "relative" }),
      undefined
    );
    expect(multiHorizonPanelMock).toHaveBeenLastCalledWith(
      expect.objectContaining({ returnView: "relative" }),
      undefined
    );

    const benchmarkOnlyPoint = {
      ...scenario.workspace.gross_chart[0],
      portfolio_return_pct: null,
      active_return_pct: null,
      cumulative_portfolio_return_pct: null,
      cumulative_active_return_pct: null,
    };
    rerender(
      <PerformanceSummaryMode
        workspace={{ ...scenario.workspace, gross_chart: [benchmarkOnlyPoint] }}
        {...commonProps}
      />
    );

    expect(chartPanelMock).toHaveBeenLastCalledWith(
      expect.objectContaining({ returnView: "combined" }),
      undefined
    );
    expect(multiHorizonPanelMock).toHaveBeenLastCalledWith(
      expect.objectContaining({ returnView: "combined" }),
      undefined
    );
  });

  it("requests horizon economics only in the source-confirmed display currency", () => {
    const scenario = buildSupportedPerformanceScenario();
    scenario.workspace.requested_reporting_currency = "SGD";
    scenario.workspace.effective_reporting_currency = "USD";
    scenario.workspace.reporting_currency_state = "accepted_unverified";

    render(
      <PerformanceSummaryMode
        workspace={scenario.workspace}
        period="YTD"
        detailBasis="NET"
        contributionDimension="asset_class"
        attributionDimension="asset_class"
        chartFrequency="monthly"
        capabilities={scenario.capabilities}
        selectedBenchmarkCode={scenario.selectedBenchmarkCode}
        selectedBenchmarkLabel={scenario.selectedBenchmarkLabel}
        selectedPerformance={scenario.workspace.net_performance}
        primaryDriver={null}
        hasMoneyWeightedReturn={false}
        suspiciousMoneyWeightedReturn={false}
        contributorScale={1}
        positivePositionContributors={[]}
        negativePositionContributors={[]}
        topContributors={[]}
        bottomContributors={[]}
        isUpdating={false}
        isDetailsPending={false}
      />,
    );

    expect(multiHorizonPanelMock).toHaveBeenLastCalledWith(
      expect.objectContaining({ reportingCurrency: "USD" }),
      undefined,
    );
  });
});
