import React from "react";
import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { EChartsOption } from "echarts";

import PerformanceChartPanel from "../../src/apps/performance/components/performance-chart-panel";
import {
  buildBenchmarkUnassignedPerformanceScenario,
  buildPerformanceCapabilities,
  buildPerformanceReturnPathScenarioData,
  buildPartialBenchmarkPerformanceScenario,
  buildSupportedPerformanceScenario,
} from "../fixtures/performance-workspace-fixtures";

let lastChartOption: EChartsOption | null = null;

type ChartSeriesProbe = {
  name?: string;
  type?: string;
  data?: unknown[];
  smooth?: boolean | number;
  symbol?: string;
  symbolSize?: number;
  showSymbol?: boolean;
  barWidth?: number;
  itemStyle?: {
    borderWidth?: number;
    borderRadius?: number[];
  };
  lineStyle?: {
    width?: number;
    cap?: string;
    join?: string;
  };
};

vi.mock("echarts-for-react", () => ({
  default: ({ style, option }: { style?: React.CSSProperties; option?: EChartsOption }) => {
    lastChartOption = option ?? null;
    return <div data-testid="performance-echart" style={style} />;
  },
}));

function compactPattern(text: string) {
  return new RegExp(text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replaceAll(" ", "\\s*"));
}

function buildChartProps(
  overrides: Partial<React.ComponentProps<typeof PerformanceChartPanel>> = {}
): React.ComponentProps<typeof PerformanceChartPanel> {
  const scenario = buildSupportedPerformanceScenario();
  const workspace = { ...scenario.workspace, portfolio_id: "DEMO_ADV_USD_001" };
  const returnPath = buildPerformanceReturnPathScenarioData(scenario);
  return {
    title: "Net Return Path",
    points: returnPath.points,
    summary: {
      ...returnPath.summary,
      benchmark_return_source: workspace.net_performance.benchmark_return_source,
    },
    portfolioId: workspace.portfolio_id,
    period: workspace.period,
    detailBasis: workspace.detail_basis,
    contributionDimension: workspace.contribution_dimension,
    attributionDimension: workspace.attribution_dimension,
    chartFrequency: workspace.chart_frequency,
    benchmark: returnPath.benchmark,
    benchmarkOptions: returnPath.benchmarkOptions,
    moneyWeightedReturn: workspace.money_weighted_return,
    reportingCurrency: workspace.portfolio.base_currency,
    reportStartDate: workspace.report_start_date ?? "",
    reportEndDate: workspace.report_end_date ?? "",
    capabilities: returnPath.capabilities,
    onRequestChange: vi.fn(),
    ...overrides,
  };
}

describe("PerformanceChartPanel", () => {
  it("switches between combined, relative, and absolute return-path views", () => {
    render(<PerformanceChartPanel {...buildChartProps()} />);

    let series: ChartSeriesProbe[] = Array.isArray(lastChartOption?.series)
      ? (lastChartOption.series as ChartSeriesProbe[])
      : [];
    let seriesNames = series.map((entry) => entry?.name);
    const observationTable = screen.getByLabelText("Return path observation table");

    expect(seriesNames).toContain("Active Period");
    expect(seriesNames).toContain("Active Cumulative");
    expect(seriesNames).toContain("Portfolio Return");
    expect(seriesNames).toContain("Benchmark Period");
    expect(within(observationTable).getByText("Portfolio")).toBeInTheDocument();
    expect(within(observationTable).getByText("Benchmark")).toBeInTheDocument();
    expect(within(observationTable).getByText("Active")).toBeInTheDocument();
    expect(within(observationTable).getByText("Cum Portfolio")).toBeInTheDocument();
    expect(within(observationTable).getByText("Cum Benchmark")).toBeInTheDocument();
    expect(within(observationTable).getByText("Cum Active")).toBeInTheDocument();

    let activeCumulativeSeries = series.find((entry) => entry?.name === "Active Cumulative");
    expect(activeCumulativeSeries?.type).toBe("line");
    expect(activeCumulativeSeries?.data).toEqual([0.3]);

    let activePeriodSeries = series.find((entry) => entry?.name === "Active Period");
    expect(activePeriodSeries?.type).toBe("bar");
    expect(activePeriodSeries?.data).toEqual([0.3]);
    expect(activePeriodSeries?.barWidth).toBe(14);
    expect(activePeriodSeries?.itemStyle).toMatchObject({
      borderWidth: 1,
      borderRadius: [3, 3, 0, 0],
    });

    const portfolioReturnSeries = series.find((entry) => entry?.name === "Portfolio Return");
    expect(portfolioReturnSeries?.smooth).toBe(false);
    expect(portfolioReturnSeries?.symbol).toBe("circle");
    expect(portfolioReturnSeries?.symbolSize).toBe(6);
    expect(portfolioReturnSeries?.showSymbol).toBe(true);
    expect(portfolioReturnSeries?.lineStyle).toMatchObject({
      width: 3.5,
      cap: "round",
      join: "round",
    });

    fireEvent.click(screen.getByRole("tab", { name: "Relative" }));

    series = Array.isArray(lastChartOption?.series)
      ? (lastChartOption.series as ChartSeriesProbe[])
      : [];
    seriesNames = series.map((entry) => entry?.name);
    expect(seriesNames).toContain("Active Period");
    expect(seriesNames).toContain("Active Cumulative");
    expect(seriesNames).not.toContain("Portfolio Return");
    expect(seriesNames).not.toContain("Benchmark Period");
    expect(within(observationTable).queryByText("Portfolio")).not.toBeInTheDocument();
    expect(within(observationTable).queryByText("Benchmark")).not.toBeInTheDocument();
    expect(within(observationTable).getByText("Active")).toBeInTheDocument();
    expect(within(observationTable).queryByText("Cum Portfolio")).not.toBeInTheDocument();
    expect(within(observationTable).queryByText("Cum Benchmark")).not.toBeInTheDocument();
    expect(within(observationTable).getByText("Cum Active")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("tab", { name: "Absolute" }));

    series = Array.isArray(lastChartOption?.series)
      ? (lastChartOption.series as ChartSeriesProbe[])
      : [];
    seriesNames = series.map((entry) => entry?.name);
    expect(seriesNames).toContain("Portfolio Return");
    expect(seriesNames).toContain("Benchmark Period");
    expect(seriesNames).not.toContain("Active Period");
    expect(seriesNames).not.toContain("Active Cumulative");
    expect(within(observationTable).getByText("Portfolio")).toBeInTheDocument();
    expect(within(observationTable).getByText("Benchmark")).toBeInTheDocument();
    expect(within(observationTable).queryByText("Active")).not.toBeInTheDocument();
    expect(within(observationTable).getByText("Cum Portfolio")).toBeInTheDocument();
    expect(within(observationTable).getByText("Cum Benchmark")).toBeInTheDocument();
    expect(within(observationTable).queryByText("Cum Active")).not.toBeInTheDocument();
  });

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
            benchmark_return_source: "calculated",
            benchmark_input_mode: "stateful",
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
    expect(document.querySelector(".performance-chart-stage.workbench-chart-shell")).toBeTruthy();
    expect(document.querySelector(".performance-analysis-date-inputs")).toBeTruthy();
    expect(screen.getByLabelText("Executive return strip")).toBeInTheDocument();
    expect(document.querySelector(".workbench-chart-shell-context")).toBeFalsy();
    expect(document.querySelector(".workbench-chart-shell-body .performance-chart-context-strip")).toBeTruthy();
    expect(document.querySelector(".performance-analysis-control-bar")).toBeTruthy();
    expect(document.querySelectorAll(".performance-analysis-control-slot")).toHaveLength(6);
    expect(screen.getByRole("tablist", { name: "Return view" })).toBeInTheDocument();
    const executiveStrip = screen.getByLabelText("Executive return strip");
    expect(within(executiveStrip).getByText("Portfolio Return")).toBeInTheDocument();
    expect(within(executiveStrip).getByText("Benchmark Return")).toBeInTheDocument();
    expect(within(executiveStrip).getByText("Active Return")).toBeInTheDocument();
    expect(within(executiveStrip).getByText("Net Flow")).toBeInTheDocument();
    expect(within(executiveStrip).getByText("Ending Market Value")).toBeInTheDocument();
    expect(within(executiveStrip).getByText("Period / Basis")).toBeInTheDocument();
    expect(screen.queryByText("Latest")).not.toBeInTheDocument();
    expect(screen.queryByText("High")).not.toBeInTheDocument();
    expect(screen.queryByText("Low")).not.toBeInTheDocument();
    expect(screen.getByRole("group", { name: "Return vs Benchmark" })).toHaveTextContent(
      compactPattern("Portfolio DEMO_ADV_USD_001")
    );
    expect(screen.getByRole("group", { name: "Return vs Benchmark" })).toHaveTextContent(
      compactPattern("Benchmark Global Balanced 60/40 • USD")
    );
    expect(screen.getByRole("group", { name: "Return vs Benchmark" })).toHaveTextContent(
      compactPattern("Active Return 0.80%")
    );
    expect(screen.getByRole("group", { name: "Return vs Benchmark" })).not.toHaveTextContent(
      "Available"
    );
    expect(screen.getByRole("group", { name: "Return vs Benchmark" })).toHaveTextContent(
      compactPattern("Period / Basis 01 Jan 2026 - 28 Feb 2026 • Net")
    );
    expect(screen.getByLabelText("Executive return strip")).toHaveTextContent(
      compactPattern(
        "Period / Basis Net • YTD 01 Jan 2026 - 28 Feb 2026 • MWR (XIRR) • Flow-Adjusted MV $1,208,000"
      )
    );
    expect(screen.getByLabelText("From")).toHaveValue("2026-01-01");
    expect(screen.getByLabelText("To")).toHaveValue("2026-02-28");
    const observationTable = screen.getByLabelText("Return path observation table");
    expect(within(observationTable).getByText("Cum Portfolio")).toBeInTheDocument();
    expect(within(observationTable).getByText("Cum Benchmark")).toBeInTheDocument();
    expect(within(observationTable).getByText("Cum Active")).toBeInTheDocument();
    expect(within(observationTable).getByText("2026-01")).toBeInTheDocument();
    expect(within(observationTable).getByText("2026-02")).toBeInTheDocument();
    expect(lastChartOption?.xAxis).toMatchObject({
      axisLine: { lineStyle: { color: "rgba(52, 70, 95, 0.28)", width: 1 } },
    });
    expect(Array.isArray(lastChartOption?.yAxis) ? lastChartOption?.yAxis?.[0] : undefined).toMatchObject({
      splitLine: { lineStyle: { color: "rgba(52, 70, 95, 0.14)", width: 1 } },
    });
    expect(lastChartOption?.legend).toMatchObject({
      icon: "roundRect",
      itemGap: 18,
      textStyle: { color: "#435164", fontWeight: 700 },
    });
    expect(lastChartOption?.tooltip).toMatchObject({
      backgroundColor: "rgba(19, 30, 43, 0.96)",
      borderColor: "rgba(117, 143, 173, 0.48)",
      textStyle: { color: "#f8fafc", fontWeight: 600 },
    });
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
            benchmark_return_source: "calculated",
            benchmark_input_mode: "stateful",
          },
          benchmark: "BMK_GLOBAL_GROWTH_80_20",
          benchmarkOptions: [
            {
              benchmark_code: "BMK_GLOBAL_BALANCED_60_40",
              benchmark_name: "Global Balanced 60/40",
              benchmark_currency: "USD",
              benchmark_type: "composite",
              is_assigned: false,
            },
            {
              benchmark_code: "BMK_GLOBAL_GROWTH_80_20",
              benchmark_name: "Global Growth 80/20",
              benchmark_currency: "USD",
              benchmark_type: "composite",
              is_assigned: true,
            },
          ],
        })}
      />
    );

    expect(screen.getByLabelText("Benchmark")).toHaveDisplayValue(
      "Global Growth 80/20 • USD • Composite"
    );
    expect(screen.getByRole("group", { name: "Return vs Benchmark" })).toHaveTextContent(
      compactPattern("Benchmark Global Growth 80/20")
    );
  });

  it("falls back to plain resolved dates when money-weighted audit metadata is absent", () => {
    render(
      <PerformanceChartPanel
        {...buildChartProps({
          moneyWeightedReturn: null,
        })}
      />
    );

    expect(screen.getByLabelText("Executive return strip")).toHaveTextContent(
      compactPattern("Period / Basis Net • YTD 01 Jan 2026 - 24 Feb 2026")
    );
    expect(screen.getByLabelText("Executive return strip")).not.toHaveTextContent("MWR");
  });

  it("renders a compact unavailable panel instead of the large chart canvas when no series is available", () => {
    const scenario = buildBenchmarkUnassignedPerformanceScenario();
    const returnPath = buildPerformanceReturnPathScenarioData(scenario);

    render(
      <PerformanceChartPanel
        {...buildChartProps({
          points: returnPath.points,
          summary: returnPath.summary,
          benchmark: returnPath.benchmark,
          benchmarkOptions: returnPath.benchmarkOptions,
          capabilities: returnPath.capabilities,
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
    expect(
      screen.getByText(
        "Adjust the period or explicit dates once performance history is available for this resolved window."
      )
    ).toBeInTheDocument();
    expect(screen.queryByTestId("performance-echart")).not.toBeInTheDocument();
    expect(screen.queryByRole("img", { name: "Net Return Path chart" })).not.toBeInTheDocument();
  });

  it("renders a compact benchmark-unassigned state without weak placeholders", () => {
    const scenario = buildBenchmarkUnassignedPerformanceScenario();
    const returnPath = buildPerformanceReturnPathScenarioData(scenario, {
      capabilities: {
        ...scenario.capabilities,
        returnPath: { state: "supported" },
      },
    });

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
            ...returnPath.summary,
            portfolio_return_pct: 6.2,
            benchmark_return_source: null,
          },
          benchmark: returnPath.benchmark,
          benchmarkOptions: returnPath.benchmarkOptions,
          capabilities: returnPath.capabilities,
        })}
      />
    );

    const benchmarkState = screen
      .getByText("No benchmark is assigned to this mandate.")
      .closest(".performance-chart-benchmark-state");

    expect(benchmarkState).not.toBeNull();
    expect(benchmarkState).toHaveTextContent("Benchmark unassigned");
    expect(screen.getByText("No benchmark is assigned to this mandate.")).toBeInTheDocument();
    expect(screen.getByRole("group", { name: "Return vs Benchmark" })).toHaveTextContent(
      compactPattern("Benchmark Unassigned")
    );
    expect(screen.getByRole("group", { name: "Return vs Benchmark" })).toHaveTextContent(
      compactPattern("Active Return Unavailable")
    );
    expect(benchmarkState).not.toHaveTextContent("N/A");
    const series = Array.isArray(lastChartOption?.series) ? lastChartOption.series : [];
    expect(series.map((entry) => entry?.name)).not.toContain("Active Period");
    expect(series.map((entry) => entry?.name)).not.toContain("Active Cumulative");
  });

  it("keeps the assigned benchmark visible when relative comparison is partial", () => {
    const scenario = buildPartialBenchmarkPerformanceScenario();
    const returnPath = buildPerformanceReturnPathScenarioData(scenario);

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
            ...returnPath.summary,
            portfolio_return_pct: 6.2,
            benchmark_return_source: "calculated",
            benchmark_input_mode: "stateful",
          },
          benchmark: returnPath.benchmark,
          benchmarkOptions: returnPath.benchmarkOptions,
          capabilities: returnPath.capabilities,
        })}
      />
    );

    expect(screen.queryByText("Benchmark unassigned")).not.toBeInTheDocument();
    expect(screen.getByRole("group", { name: "Return vs Benchmark" })).toHaveTextContent(
      compactPattern("Benchmark Global Balanced 60/40 • USD")
    );
    expect(screen.getByRole("group", { name: "Return vs Benchmark" })).toHaveTextContent(
      compactPattern("Active Return Unavailable")
    );
    expect(screen.getByText("Benchmark Return")).toBeInTheDocument();
    expect(screen.getAllByText("Unavailable").length).toBeGreaterThanOrEqual(2);
  });

  it("renders a partial capability notice when return observations are incomplete", () => {
    const scenario = buildPartialBenchmarkPerformanceScenario();
    const returnPath = buildPerformanceReturnPathScenarioData(scenario, {
      capabilities: {
        ...scenario.capabilities,
        returnPath: {
          state: "partial",
          reason: "Return observations are only partially published for the selected horizon.",
        },
      },
    });

    render(
      <PerformanceChartPanel
        {...buildChartProps({
          points: returnPath.points,
          summary: returnPath.summary,
          benchmark: returnPath.benchmark,
          benchmarkOptions: returnPath.benchmarkOptions,
          capabilities: returnPath.capabilities,
        })}
      />
    );

    expect(screen.getByText("Return series is partial")).toBeInTheDocument();
    expect(
      screen.getByText("Return observations are only partially published for the selected horizon.")
    ).toBeInTheDocument();
    expect(screen.queryByTestId("performance-echart")).not.toBeInTheDocument();
  });

  it("disables frequency options that are outside the backend capability contract", () => {
    render(
      <PerformanceChartPanel
        {...buildChartProps({
          capabilities: buildPerformanceCapabilities({
            returnPath: {
              state: "supported",
              supportedFrequencies: ["monthly"],
            },
          }),
        })}
      />
    );

    const frequencySelect = screen.getByLabelText("Frequency") as HTMLSelectElement;
    const monthlyOption = within(frequencySelect).getByRole("option", { name: "Monthly" });
    const quarterlyOption = within(frequencySelect).getByRole("option", { name: "Quarterly" });
    expect(monthlyOption).not.toBeDisabled();
    expect(quarterlyOption).toBeDisabled();
  });
});
