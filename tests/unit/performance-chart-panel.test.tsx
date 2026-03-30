import React from "react";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import PerformanceChartPanel from "../../src/apps/performance/components/performance-chart-panel";
import {
  buildBenchmarkUnassignedPerformanceScenario,
  buildPartialBenchmarkPerformanceScenario,
  buildSupportedPerformanceScenario,
} from "../fixtures/performance-workspace-fixtures";

vi.mock("echarts-for-react", () => ({
  default: ({ style }: { style?: React.CSSProperties }) => (
    <div data-testid="performance-echart" style={style} />
  ),
}));

function buildChartProps(
  overrides: Partial<React.ComponentProps<typeof PerformanceChartPanel>> = {}
): React.ComponentProps<typeof PerformanceChartPanel> {
  const scenario = buildSupportedPerformanceScenario();
  const workspace = { ...scenario.workspace, portfolio_id: "DEMO_ADV_USD_001" };
  return {
    title: "Net Return Path",
    points: workspace.net_chart,
    summary: {
      portfolio_return_pct: workspace.net_performance.portfolio_return_pct,
      benchmark_return_pct: workspace.net_performance.benchmark_return_pct,
      active_return_pct: workspace.net_performance.active_return_pct,
    },
    portfolioId: workspace.portfolio_id,
    period: workspace.period,
    detailBasis: workspace.detail_basis,
    contributionDimension: workspace.contribution_dimension,
    attributionDimension: workspace.attribution_dimension,
    chartFrequency: workspace.chart_frequency,
    benchmark: workspace.benchmark_code ?? undefined,
    benchmarkOptions: workspace.benchmark_options,
    reportStartDate: workspace.report_start_date,
    reportEndDate: workspace.report_end_date,
    capabilities: scenario.capabilities,
    onRequestChange: vi.fn(),
    ...overrides,
  };
}

describe("PerformanceChartPanel", () => {
  it("falls back to chart point dates when report dates are missing", () => {
    render(
      <PerformanceChartPanel
        {...buildChartProps({
          points: [
            {
              label: "2026-01",
              frequency: "monthly",
              period_start: "2026-01-01",
              period_end: "2026-01-31",
              portfolio_return_pct: 1.2,
              benchmark_return_pct: 0.8,
              active_return_pct: 0.4,
              cumulative_portfolio_return_pct: 1.2,
              cumulative_benchmark_return_pct: 0.8,
              cumulative_active_return_pct: 0.4,
            },
            {
              label: "2026-02",
              frequency: "monthly",
              period_start: "2026-02-01",
              period_end: "2026-02-28",
              portfolio_return_pct: 2.1,
              benchmark_return_pct: 1.7,
              active_return_pct: 0.4,
              cumulative_portfolio_return_pct: 3.3,
              cumulative_benchmark_return_pct: 2.5,
              cumulative_active_return_pct: 0.8,
            },
          ],
          summary: {
            portfolio_return_pct: 3.3,
            benchmark_return_pct: 2.5,
            active_return_pct: 0.8,
          },
          benchmark: "BMK_GLOBAL_BALANCED_60_40",
          reportStartDate: "",
          reportEndDate: "",
        })}
      />
    );

    expect(
      document.querySelector(
        ".performance-chart-stage.workbench-summary-panel.workbench-summary-module-card"
      )
    ).toBeTruthy();
    expect(
      document.querySelector(".performance-chart-summary-band.workbench-summary-metric-strip")
    ).toBeTruthy();
    expect(screen.getByText("Portfolio Return")).toBeInTheDocument();
    expect(screen.getByText("Benchmark Return")).toBeInTheDocument();
    expect(screen.getByText("Active Return")).toBeInTheDocument();
    expect(screen.getByText("Observations")).toBeInTheDocument();
    expect(screen.queryByText("Latest")).not.toBeInTheDocument();
    expect(screen.queryByText("High")).not.toBeInTheDocument();
    expect(screen.queryByText("Low")).not.toBeInTheDocument();
    expect(screen.getByRole("group", { name: "Return path context" })).toHaveTextContent(
      "Selected period YTD"
    );
    expect(screen.getByRole("group", { name: "Return path context" })).toHaveTextContent(
      "Compared against Global Balanced 60/40"
    );
    expect(screen.getByRole("group", { name: "Return path context" })).toHaveTextContent(
      "Active return 0.80%"
    );
    expect(screen.getByText("2026-01-01 - 2026-02-28")).toBeInTheDocument();
    expect(screen.getByLabelText("From")).toHaveValue("2026-01-01");
    expect(screen.getByLabelText("To")).toHaveValue("2026-02-28");
  });

  it("uses benchmark options from the workspace contract for selector labels", () => {
    render(
      <PerformanceChartPanel
        {...buildChartProps({
          points: [
            {
              label: "2026-03",
              frequency: "monthly",
              period_start: "2026-03-01",
              period_end: "2026-03-27",
              portfolio_return_pct: 1.4,
              benchmark_return_pct: 1.1,
              active_return_pct: 0.3,
              cumulative_portfolio_return_pct: 6.2,
              cumulative_benchmark_return_pct: 5.8,
              cumulative_active_return_pct: 0.4,
            },
          ],
          summary: {
            portfolio_return_pct: 6.2,
            benchmark_return_pct: 5.8,
            active_return_pct: 0.4,
          },
          benchmark: "BMK_GLOBAL_GROWTH_80_20",
          benchmarkOptions: [
            {
              benchmark_code: "BMK_GLOBAL_BALANCED_60_40",
              benchmark_name: "Global Balanced 60/40",
              is_assigned: false,
            },
            {
              benchmark_code: "BMK_GLOBAL_GROWTH_80_20",
              benchmark_name: "Global Growth 80/20",
              is_assigned: true,
            },
          ],
        })}
      />
    );

    expect(screen.getByLabelText("Compared To")).toHaveDisplayValue("Global Growth 80/20");
    expect(screen.getByRole("group", { name: "Return path context" })).toHaveTextContent(
      "Compared against Global Growth 80/20"
    );
  });

  it("renders a compact unavailable panel instead of the large chart canvas when no series is available", () => {
    const scenario = buildBenchmarkUnassignedPerformanceScenario();

    render(
      <PerformanceChartPanel
        {...buildChartProps({
          points: [],
          summary: {
            portfolio_return_pct: null,
            benchmark_return_pct: null,
            active_return_pct: null,
          },
          capabilities: {
            ...scenario.capabilities,
          },
        })}
      />
    );

    expect(screen.getByLabelText("Net Return Path unavailable")).toBeInTheDocument();
    expect(screen.getByText("Return series unavailable")).toBeInTheDocument();
    expect(
      screen.getByText(
        "Published return observations are not available for the selected horizon."
      )
    ).toBeInTheDocument();
    expect(screen.queryByTestId("performance-echart")).not.toBeInTheDocument();
    expect(screen.queryByRole("img", { name: "Net Return Path chart" })).not.toBeInTheDocument();
  });

  it("renders a compact benchmark-unassigned state without weak placeholders", () => {
    const scenario = buildBenchmarkUnassignedPerformanceScenario();

    render(
      <PerformanceChartPanel
        {...buildChartProps({
          points: [
            {
              label: "2026-03",
              frequency: "monthly",
              period_start: "2026-03-01",
              period_end: "2026-03-27",
              portfolio_return_pct: 1.4,
              benchmark_return_pct: null,
              active_return_pct: null,
              cumulative_portfolio_return_pct: 6.2,
              cumulative_benchmark_return_pct: null,
              cumulative_active_return_pct: null,
            },
          ],
          summary: {
            portfolio_return_pct: 6.2,
            benchmark_return_pct: null,
            active_return_pct: null,
          },
          benchmark: undefined,
          benchmarkOptions: [],
          capabilities: {
            ...scenario.capabilities,
            returnPath: { state: "supported" },
          },
        })}
      />
    );

    const benchmarkState = screen
      .getByText("No benchmark is assigned to this mandate.")
      .closest(".performance-chart-benchmark-state");

    expect(benchmarkState).not.toBeNull();
    expect(benchmarkState).toHaveTextContent("Benchmark unassigned");
    expect(screen.getByText("No benchmark is assigned to this mandate.")).toBeInTheDocument();
    expect(screen.getByRole("group", { name: "Return path context" })).toHaveTextContent(
      "Compared against Unassigned"
    );
    expect(screen.getByRole("group", { name: "Return path context" })).toHaveTextContent(
      "Relative context Unavailable"
    );
    expect(screen.queryByText("N/A")).not.toBeInTheDocument();
  });

  it("keeps the assigned benchmark visible when relative comparison is partial", () => {
    const scenario = buildPartialBenchmarkPerformanceScenario();

    render(
      <PerformanceChartPanel
        {...buildChartProps({
          points: [
            {
              label: "2026-03",
              frequency: "monthly",
              period_start: "2026-03-01",
              period_end: "2026-03-27",
              portfolio_return_pct: 1.4,
              benchmark_return_pct: null,
              active_return_pct: null,
              cumulative_portfolio_return_pct: 6.2,
              cumulative_benchmark_return_pct: null,
              cumulative_active_return_pct: null,
            },
          ],
          summary: {
            portfolio_return_pct: 6.2,
            benchmark_return_pct: null,
            active_return_pct: null,
          },
          benchmark: "BMK_GLOBAL_BALANCED_60_40",
          benchmarkOptions: [
            {
              benchmark_code: "BMK_GLOBAL_BALANCED_60_40",
              benchmark_name: "Global Balanced 60/40",
              is_assigned: true,
            },
          ],
          capabilities: scenario.capabilities,
        })}
      />
    );

    expect(screen.queryByText("Benchmark unassigned")).not.toBeInTheDocument();
    expect(screen.getByRole("group", { name: "Return path context" })).toHaveTextContent(
      "Compared against Global Balanced 60/40"
    );
    expect(screen.getByRole("group", { name: "Return path context" })).toHaveTextContent(
      "Active return Unavailable"
    );
    expect(screen.getByRole("group", { name: "Return path context" })).toHaveTextContent(
      "Relative context Partial"
    );
    expect(screen.getByText("Benchmark Return")).toBeInTheDocument();
    expect(screen.getAllByText("Unavailable").length).toBeGreaterThanOrEqual(2);
  });

  it("renders a partial capability notice when return observations are incomplete", () => {
    const scenario = buildPartialBenchmarkPerformanceScenario();

    render(
      <PerformanceChartPanel
        {...buildChartProps({
          points: [],
          summary: {
            portfolio_return_pct: null,
            benchmark_return_pct: null,
            active_return_pct: null,
          },
          capabilities: {
            ...scenario.capabilities,
            returnPath: {
              state: "partial",
              reason: "Return observations are only partially published for the selected horizon.",
            },
          },
        })}
      />
    );

    expect(screen.getByText("Return series is partial")).toBeInTheDocument();
    expect(
      screen.getByText("Return observations are only partially published for the selected horizon.")
    ).toBeInTheDocument();
    expect(screen.queryByTestId("performance-echart")).not.toBeInTheDocument();
  });
});
