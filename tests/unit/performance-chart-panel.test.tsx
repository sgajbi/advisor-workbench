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
  clip?: boolean;
  symbol?: string;
  symbolSize?: number;
  showSymbol?: boolean;
  barWidth?: number;
  endLabel?: {
    show?: boolean;
    color?: string;
    backgroundColor?: string;
    borderColor?: string;
    borderWidth?: number;
    borderRadius?: number;
    fontSize?: number;
    fontWeight?: number;
    padding?: number[];
  };
  labelLayout?: {
    hideOverlap?: boolean;
    moveOverlap?: string;
  };
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
    fireEvent.click(screen.getByText("Observation trail"));
    const observationTable = screen.getByLabelText("Return path observation table");

    expect(seriesNames).toContain("Active");
    expect(seriesNames).toContain("Portfolio");
    expect(seriesNames).toContain("Benchmark");
    expect(within(observationTable).getByText("Portfolio Return")).toBeInTheDocument();
    expect(within(observationTable).getByText("Benchmark Return")).toBeInTheDocument();
    expect(within(observationTable).getByText("Active Return")).toBeInTheDocument();
    expect(within(observationTable).getByText("Cumulative Portfolio")).toBeInTheDocument();
    expect(within(observationTable).getByText("Cumulative Benchmark")).toBeInTheDocument();
    expect(within(observationTable).getByText("Cumulative Active")).toBeInTheDocument();

    let activeCumulativeSeries = series.find((entry) => entry?.name === "Active");
    expect(activeCumulativeSeries?.type).toBe("line");
    expect(activeCumulativeSeries?.data).toEqual([0.3]);
    expect(activeCumulativeSeries?.lineStyle).toMatchObject({
      color: "#8da0ba",
      type: "dashed",
    });
    expect(activeCumulativeSeries?.endLabel).toMatchObject({
      color: "#4f647f",
      backgroundColor: "rgba(141, 160, 186, 0.2)",
      borderColor: "rgba(141, 160, 186, 0.32)",
      fontWeight: 700,
    });

    const benchmarkReturnSeries = series.find((entry) => entry?.name === "Benchmark");
    expect(benchmarkReturnSeries?.lineStyle).toMatchObject({
      color: "#c3a056",
      type: "dashed",
    });
    expect(benchmarkReturnSeries?.endLabel).toMatchObject({
      color: "#fef7e7",
      backgroundColor: "rgba(195, 160, 86, 0.96)",
      borderColor: "rgba(195, 160, 86, 0.24)",
      fontWeight: 800,
    });

    const portfolioReturnSeries = series.find((entry) => entry?.name === "Portfolio");
    expect(portfolioReturnSeries?.smooth).toBe(false);
    expect(portfolioReturnSeries?.symbol).toBe("circle");
    expect(portfolioReturnSeries?.symbolSize).toBe(7);
    expect(portfolioReturnSeries?.showSymbol).toBe(false);
    expect(portfolioReturnSeries?.clip).toBe(false);
    expect(portfolioReturnSeries?.lineStyle).toMatchObject({
      width: 3.6,
      cap: "round",
      join: "round",
    });
    expect(portfolioReturnSeries?.endLabel).toMatchObject({
      show: true,
      color: "#f8fafc",
      backgroundColor: "rgba(20, 43, 71, 0.96)",
      borderColor: "rgba(20, 43, 71, 0.18)",
      borderWidth: 1,
      borderRadius: 999,
      fontSize: 10.5,
      fontWeight: 800,
    });
    expect(portfolioReturnSeries?.labelLayout).toMatchObject({
      hideOverlap: true,
      moveOverlap: "shiftY",
    });
    expect(portfolioReturnSeries).toMatchObject({
      markLine: {
        silent: true,
        symbol: "none",
        lineStyle: { color: "rgba(22, 58, 92, 0.16)", width: 1, type: "solid" },
      },
    });

    fireEvent.click(screen.getByRole("tab", { name: "Relative" }));

    series = Array.isArray(lastChartOption?.series)
      ? (lastChartOption.series as ChartSeriesProbe[])
      : [];
    seriesNames = series.map((entry) => entry?.name);
    expect(seriesNames).toContain("Active");
    expect(seriesNames).not.toContain("Portfolio");
    expect(seriesNames).not.toContain("Benchmark");
    expect(within(observationTable).queryByText("Portfolio Return")).not.toBeInTheDocument();
    expect(within(observationTable).queryByText("Benchmark Return")).not.toBeInTheDocument();
    expect(within(observationTable).getByText("Active Return")).toBeInTheDocument();
    expect(within(observationTable).queryByText("Cumulative Portfolio")).not.toBeInTheDocument();
    expect(within(observationTable).queryByText("Cumulative Benchmark")).not.toBeInTheDocument();
    expect(within(observationTable).getByText("Cumulative Active")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("tab", { name: "Absolute" }));

    series = Array.isArray(lastChartOption?.series)
      ? (lastChartOption.series as ChartSeriesProbe[])
      : [];
    seriesNames = series.map((entry) => entry?.name);
    expect(seriesNames).toContain("Portfolio");
    expect(seriesNames).toContain("Benchmark");
    expect(seriesNames).not.toContain("Active");
    expect(within(observationTable).getByText("Portfolio Return")).toBeInTheDocument();
    expect(within(observationTable).getByText("Benchmark Return")).toBeInTheDocument();
    expect(within(observationTable).queryByText("Active Return")).not.toBeInTheDocument();
    expect(within(observationTable).getByText("Cumulative Portfolio")).toBeInTheDocument();
    expect(within(observationTable).getByText("Cumulative Benchmark")).toBeInTheDocument();
    expect(within(observationTable).queryByText("Cumulative Active")).not.toBeInTheDocument();
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
    expect(document.querySelector(".performance-analysis-control-bar")).toBeTruthy();
    expect(document.querySelectorAll(".performance-analysis-control-slot")).toHaveLength(6);
    expect(screen.getByRole("tablist", { name: "Horizon" })).toBeInTheDocument();
    expect(screen.getByRole("tablist", { name: "Return view" })).toBeInTheDocument();
    expect(screen.getByRole("tablist", { name: "Basis" })).toBeInTheDocument();
    const executiveStrip = screen.getByLabelText("Executive return strip");
    expect(within(executiveStrip).getByText("Opening MV")).toBeInTheDocument();
    expect(within(executiveStrip).getByText("Net Flow")).toBeInTheDocument();
    expect(within(executiveStrip).getByText("Opening Cash")).toBeInTheDocument();
    expect(within(executiveStrip).getByText("Closing Cash")).toBeInTheDocument();
    expect(within(executiveStrip).getByText("Flow-Adjusted MV")).toBeInTheDocument();
    expect(within(executiveStrip).getByText("Ending MV")).toBeInTheDocument();
    expect(within(executiveStrip).queryByText("Period Range / Basis")).not.toBeInTheDocument();
    expect(screen.queryByText("Latest")).not.toBeInTheDocument();
    expect(screen.queryByText("High")).not.toBeInTheDocument();
    expect(screen.queryByText("Low")).not.toBeInTheDocument();
    expect(screen.getByLabelText("Executive return strip")).toHaveTextContent("Opening MV");
    expect(screen.getByLabelText("Executive return strip")).toHaveTextContent("$1,200,000");
    expect(screen.getByLabelText("Executive return strip")).toHaveTextContent("Net Flow");
    expect(screen.getByLabelText("Executive return strip")).toHaveTextContent("$42,000");
    expect(screen.getByLabelText("Executive return strip")).toHaveTextContent("Opening Cash");
    expect(screen.getByLabelText("Executive return strip")).toHaveTextContent("$50,000");
    expect(screen.getByLabelText("Executive return strip")).toHaveTextContent("Closing Cash");
    expect(screen.getByLabelText("Executive return strip")).toHaveTextContent("-$8,000");
    expect(screen.getByLabelText("Executive return strip")).toHaveTextContent("Flow-Adjusted MV");
    expect(screen.getByLabelText("Executive return strip")).toHaveTextContent("$1,208,000");
    expect(screen.getByLabelText("Executive return strip")).toHaveTextContent("Ending MV");
    expect(screen.getByLabelText("Executive return strip")).toHaveTextContent("$1,250,000");
    expect(screen.getByLabelText("From")).toHaveValue("2026-01-01");
    expect(screen.getByLabelText("To")).toHaveValue("2026-02-28");
    fireEvent.click(screen.getByText("Observation trail"));
    const observationTable = screen.getByLabelText("Return path observation table");
    expect(within(observationTable).getByText("Cumulative Portfolio")).toBeInTheDocument();
    expect(within(observationTable).getByText("Cumulative Benchmark")).toBeInTheDocument();
    expect(within(observationTable).getByText("Cumulative Active")).toBeInTheDocument();
    expect(within(observationTable).getByText("2026-01")).toBeInTheDocument();
    expect(within(observationTable).getByText("2026-02")).toBeInTheDocument();
    expect(lastChartOption?.xAxis).toMatchObject({
      axisLine: { lineStyle: { color: "rgba(22, 58, 92, 0.18)", width: 1 } },
    });
    const xAxis = Array.isArray(lastChartOption?.xAxis)
      ? lastChartOption?.xAxis[0]
      : lastChartOption?.xAxis;
    const xAxisFormatter = (xAxis?.axisLabel as { formatter?: (value: string) => string } | undefined)
      ?.formatter;
    expect(xAxisFormatter?.("2026-01")).toBe("Jan 26");
    expect(xAxisFormatter?.("2026-04")).toBe("Apr 26");
    expect(lastChartOption?.yAxis).toMatchObject({
      axisLine: { show: true, lineStyle: { color: "rgba(22, 58, 92, 0.18)", width: 1 } },
      splitArea: {
        show: true,
      },
      splitLine: {
        lineStyle: { color: "rgba(22, 58, 92, 0.085)", width: 1, type: "dashed" },
      },
    });
    expect(lastChartOption?.grid).toMatchObject({
      left: 72,
      right: 126,
      top: 20,
      bottom: 44,
      containLabel: true,
    });
    expect(screen.getByLabelText("Y axis title")).toHaveTextContent("Return");
    expect(screen.getByLabelText("X axis title")).toHaveTextContent("Reporting Period");
    expect(lastChartOption?.legend).toMatchObject({ show: false });
    expect(screen.getByLabelText("Return path legend")).toHaveTextContent("Portfolio");
    expect(screen.getByLabelText("Return path legend")).toHaveTextContent("Benchmark");
    expect(screen.getByLabelText("Return path legend")).toHaveTextContent("Active");
    expect(screen.getByLabelText("Return path legend")).not.toHaveTextContent("3.30%");
    expect(screen.getByLabelText("Return path legend")).not.toHaveTextContent("2.50%");
    expect(screen.getByLabelText("Return path legend")).not.toHaveTextContent("0.80%");
    expect(screen.getByLabelText("Return decision readout")).toHaveTextContent(
      compactPattern(
        "Active Return 0.80% Money-Weighted Return 5.12% Portfolio Return 3.30% Benchmark Return 2.50%"
      )
    );
    expect(screen.queryByLabelText("Return series context")).not.toBeInTheDocument();
    expect(lastChartOption?.tooltip).toMatchObject({
      trigger: "axis",
      triggerOn: "mousemove|click",
      appendToBody: true,
      renderMode: "html",
      className: "performance-return-path-tooltip",
      backgroundColor: "rgba(252, 253, 255, 0.985)",
      borderColor: "rgba(36, 50, 70, 0.16)",
      textStyle: { color: "#172033", fontWeight: 600 },
    });
    const yAxis = Array.isArray(lastChartOption?.yAxis)
      ? lastChartOption?.yAxis[0]
      : lastChartOption?.yAxis;
    const yAxisFormatter = (yAxis?.axisLabel as { formatter?: (value: number) => string } | undefined)
      ?.formatter;
    expect(yAxisFormatter?.(1.2)).toBe("+1.2%");
    expect(yAxisFormatter?.(-0.4)).toBe("-0.4%");
    const tooltip = Array.isArray(lastChartOption?.tooltip)
      ? lastChartOption.tooltip[0]
      : lastChartOption?.tooltip;
    const tooltipFormatter = tooltip?.formatter;
    expect(typeof tooltipFormatter).toBe("function");
    expect(
      String(
        (tooltipFormatter as (...args: unknown[]) => string)?.([
          {
            seriesName: "Portfolio",
            value: 12.84,
            axisValue: "2026-03",
            dataIndex: 0,
            marker: '<span style=\"color:red\">●</span>',
          },
        ])
      )
    ).toContain("Portfolio");
    expect(
      String(
        (tooltipFormatter as (...args: unknown[]) => string)?.([
          {
            seriesName: "Portfolio",
            value: 12.84,
            axisValue: "2026-03",
            dataIndex: 0,
            marker: '<span style=\"color:red\">●</span>',
          },
        ])
      )
    ).toContain("Cumulative");
    expect(
      String((tooltipFormatter as (...args: unknown[]) => string)?.([]))
    ).toContain("No published values are available at this point.");
    expect(
      String((tooltipFormatter as (...args: unknown[]) => string)?.([]))
    ).toContain("Observation");
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
    expect(screen.queryByRole("group", { name: "Return path context" })).not.toBeInTheDocument();
  });

  it("renders a comparative single-observation stage when the resolved window has one published point", () => {
    render(
      <PerformanceChartPanel
        {...buildChartProps({
          points: [
            {
              label: "14 Apr 2026",
              frequency: "monthly",
              period_start: "2026-04-01",
              period_end: "2026-04-14",
              portfolio_return_pct: 0.11,
              benchmark_return_pct: 1.61,
              active_return_pct: -1.5,
              cumulative_portfolio_return_pct: 0.11,
              cumulative_benchmark_return_pct: 1.61,
              cumulative_active_return_pct: -1.5,
            },
          ],
          summary: {
            portfolio_return_pct: 0.11,
            benchmark_return_pct: 1.61,
            active_return_pct: -1.5,
            benchmark_return_source: "calculated",
            benchmark_input_mode: "stateful",
          },
          reportStartDate: "2026-04-01",
          reportEndDate: "2026-04-14",
        })}
      />
    );

    const singleObservation = screen.getByLabelText("Single observation comparison");
    expect(singleObservation).toBeInTheDocument();
    expect(within(singleObservation).getByText("Single published observation")).toBeInTheDocument();
    expect(within(singleObservation).getByText("14 Apr 2026")).toBeInTheDocument();
    expect(within(singleObservation).getByText("+0.11%")).toBeInTheDocument();
    expect(within(singleObservation).getByText("+1.61%")).toBeInTheDocument();
    expect(within(singleObservation).getByText("-1.5%")).toBeInTheDocument();
  });

  it("falls back to plain resolved dates when money-weighted audit metadata is absent", () => {
    render(
      <PerformanceChartPanel
        {...buildChartProps({
          moneyWeightedReturn: null,
        })}
      />
    );

    expect(screen.getByLabelText("Return decision readout")).toHaveTextContent(
      compactPattern("Money-Weighted Return Unavailable")
    );
    expect(
      within(screen.getByLabelText("Return decision readout")).getByText(
        "Money-Weighted Return"
      )
    ).toBeInTheDocument();
    expect(screen.getByLabelText("Return decision readout")).not.toHaveTextContent("XIRR");
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
    expect(
      screen.getByText("Return history is unavailable for the selected window")
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        "Published return observations are not available for the selected horizon."
      )
    ).toBeInTheDocument();
    expect(screen.getByText("Still available")).toBeInTheDocument();
    expect(screen.getByText("Needs source support")).toBeInTheDocument();
    expect(
      screen.getByText(
        "Published return observations and benchmark-relative series must be exposed by the underlying performance contract before the cumulative path can render."
      )
    ).toBeInTheDocument();
    expect(screen.getByLabelText("Executive return strip")).toBeInTheDocument();
    expect(screen.getByLabelText("Executive return strip")).toHaveTextContent(
      compactPattern("Money-Weighted Return 5.12%")
    );
    expect(screen.queryByTestId("performance-echart")).not.toBeInTheDocument();
    expect(screen.queryByRole("img", { name: "Net Return Path chart" })).not.toBeInTheDocument();
  });

  it("renders an analytical loading state while detail series are pending", () => {
    render(
      <PerformanceChartPanel
        {...buildChartProps({
          points: [],
          isDetailsPending: true,
        })}
      />
    );

    const loadingState = screen.getByRole("status");
    expect(loadingState).toHaveTextContent("Resolving return path and benchmark comparison");
    expect(loadingState).toHaveTextContent(
      "Loading published observations, benchmark context, and active comparison for the selected reporting window."
    );
    expect(screen.queryByText("Return history is unavailable for the selected window")).not.toBeInTheDocument();
    expect(screen.queryByTestId("performance-echart")).not.toBeInTheDocument();
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
    expect(benchmarkState).not.toHaveTextContent("N/A");
    const series = Array.isArray(lastChartOption?.series) ? lastChartOption.series : [];
    expect(series.map((entry) => entry?.name)).not.toContain("Active");
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
    expect(screen.getByLabelText("Return decision readout")).toHaveTextContent(
      compactPattern("Portfolio Return 6.20% Benchmark Return Unavailable")
    );
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

    expect(
      screen.getByText(/Return observations are only partially published/)
    ).toBeInTheDocument();
    expect(screen.getByTestId("performance-echart")).toBeInTheDocument();
    expect(screen.getByRole("img", { name: "Net Return Path chart" })).toBeInTheDocument();
    expect(screen.getByLabelText("Return history partial state")).toBeInTheDocument();
  });

  it("derives active comparison from portfolio and benchmark when explicit active values are absent", () => {
    render(
      <PerformanceChartPanel
        {...buildChartProps({
          points: [
            {
              label: "2026-03",
              frequency: "monthly",
              period_start: "2026-03-01",
              period_end: "2026-03-31",
              portfolio_return_pct: 1.4,
              benchmark_return_pct: 1.1,
              active_return_pct: null,
              cumulative_portfolio_return_pct: 6.2,
              cumulative_benchmark_return_pct: 5.8,
              cumulative_active_return_pct: null,
            },
          ],
          summary: {
            portfolio_return_pct: 6.2,
            benchmark_return_pct: 5.8,
            active_return_pct: 0.4,
            benchmark_return_source: "calculated",
            benchmark_input_mode: "stateful",
          },
        })}
      />
    );

    expect(screen.getByLabelText("Return path legend")).toHaveTextContent("Active");

    fireEvent.click(screen.getByText("Observation trail"));
    const observationTable = screen.getByLabelText("Return path observation table");
    expect(within(observationTable).getByText("Active Return")).toBeInTheDocument();
    expect(within(observationTable).getByText("Cumulative Active")).toBeInTheDocument();
    expect(observationTable).toHaveTextContent(compactPattern("0.30%"));
    expect(observationTable).toHaveTextContent(compactPattern("0.40%"));

    const series: ChartSeriesProbe[] = Array.isArray(lastChartOption?.series)
      ? (lastChartOption.series as ChartSeriesProbe[])
      : [];
    const activeSeries = series.find((entry) => entry?.name === "Active");
    expect(activeSeries?.data).toEqual([0.4]);

    const tooltip = Array.isArray(lastChartOption?.tooltip)
      ? lastChartOption.tooltip[0]
      : lastChartOption?.tooltip;
    const tooltipFormatter = tooltip?.formatter as
      | ((params: unknown) => string)
      | undefined;
    expect(
      String(
        tooltipFormatter?.([
          {
            seriesName: "Portfolio",
            value: 6.2,
            axisValue: "2026-03",
            dataIndex: 0,
            marker: '<span style="color:red">●</span>',
          },
        ])
      )
    ).toContain("Active");
  });

  it("keeps evidence disclosure compact while leaving values in the readout rather than the legend", () => {
    render(<PerformanceChartPanel {...buildChartProps()} />);

    const disclosure = screen.getByText("Observation trail").closest("summary");
    expect(disclosure).not.toBeNull();
    expect(disclosure).toHaveTextContent("1 period");
    expect(screen.getByLabelText("Return decision readout")).toHaveTextContent("5.42%");
    expect(screen.getByLabelText("Return decision readout")).toHaveTextContent("4.91%");
    expect(screen.getByLabelText("Return decision readout")).toHaveTextContent("0.52%");
    expect(screen.getByLabelText("Return decision readout")).toHaveTextContent("5.12%");
    expect(screen.getByLabelText("Return path legend")).not.toHaveTextContent("3.30%");
    expect(screen.getByLabelText("Return path legend")).not.toHaveTextContent("2.50%");
    expect(screen.getByLabelText("Return path legend")).not.toHaveTextContent("0.80%");
  });

  it("exposes metric definitions through executive strip tooltips instead of inline copy", async () => {
    render(<PerformanceChartPanel {...buildChartProps()} />);

    fireEvent.mouseOver(within(screen.getByLabelText("Return decision readout")).getByText("Money-Weighted Return"));

    expect(
      await screen.findByText(
        "Annualized money-weighted return for the selected window, reflecting the timing and size of external cash flows."
      )
    ).toBeInTheDocument();
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
