import { describe, expect, it } from "vitest";

import {
  getPerformanceBenchmarkOptionLabel,
  getPerformanceReturnPathPresentation,
} from "../../src/apps/performance/components/performance-summary-context-helpers";
import {
  buildBenchmarkUnassignedPerformanceScenario,
  buildPartialBenchmarkPerformanceScenario,
  buildSupportedPerformanceScenario,
} from "../fixtures/performance-workspace-fixtures";

describe("performance summary context helpers", () => {
  it("builds a supported return-path presentation from summary data", () => {
    const scenario = buildSupportedPerformanceScenario();

    const presentation = getPerformanceReturnPathPresentation({
      summary: {
        portfolio_return_pct: scenario.workspace.net_performance.portfolio_return_pct,
        benchmark_return_pct: scenario.workspace.net_performance.benchmark_return_pct,
        active_return_pct: scenario.workspace.net_performance.active_return_pct,
        annualized_return_pct: scenario.workspace.net_performance.annualized_return_pct,
        end_market_value: scenario.workspace.net_performance.end_market_value,
        beginning_cash_flow: scenario.workspace.net_performance.beginning_cash_flow,
        ending_cash_flow: scenario.workspace.net_performance.ending_cash_flow,
        flow_adjusted_end_market_value:
          scenario.workspace.net_performance.flow_adjusted_end_market_value,
        net_cash_flow: scenario.workspace.net_performance.net_cash_flow,
        fees: scenario.workspace.net_performance.fees,
        benchmark_return_source: scenario.workspace.net_performance.benchmark_return_source,
        benchmark_input_mode: scenario.workspace.net_performance.benchmark_input_mode,
      },
      moneyWeightedReturn: scenario.workspace.money_weighted_return,
      benchmark: scenario.workspace.benchmark_code ?? undefined,
      benchmarkOptions: scenario.workspace.benchmark_options ?? [],
      capabilities: scenario.capabilities,
      reportingCurrency: scenario.workspace.portfolio.base_currency,
    });

    expect(presentation).toMatchObject({
      benchmarkAssigned: true,
      benchmarkLabel: "Global Balanced 60/40",
      benchmarkContextValue: "Global Balanced 60/40 • USD",
      activeReturnValue: "0.52%",
      benchmarkStateBody: null,
    });
    expect(presentation.metrics).toMatchObject([
      { key: "portfolio-return", label: "Portfolio Return", value: "5.42%", unavailable: false },
      { key: "benchmark-return", label: "Benchmark Return", value: "4.91%", unavailable: false },
      { key: "active-return", label: "Active Return", value: "0.52%", unavailable: false },
      {
        key: "mwrr",
        label: "Money-Weighted Return",
        value: "5.12%",
        unavailable: false,
      },
      {
        key: "flow-adjusted-mv",
        label: "Flow-Adjusted MV",
        value: "$1,208,000",
        unavailable: false,
      },
      {
        key: "ending-mv",
        label: "Ending MV",
        value: "$1,250,000",
        unavailable: false,
      },
      {
        key: "opening-mv",
        label: "Opening MV",
        value: "$1,200,000",
        unavailable: false,
      },
      {
        key: "net-flow",
        label: "Net Flow",
        value: "$42,000",
        unavailable: false,
      },
      {
        key: "opening-cash",
        label: "Opening Cash",
        value: "$50,000",
        unavailable: false,
      },
      {
        key: "closing-cash",
        label: "Closing Cash",
        value: "-$8,000",
        unavailable: false,
      },
    ]);
  });

  it("keeps an assigned benchmark visible when relative comparison is partial", () => {
    const scenario = buildPartialBenchmarkPerformanceScenario();

    const presentation = getPerformanceReturnPathPresentation({
      summary: {
        portfolio_return_pct: scenario.workspace.net_performance.portfolio_return_pct,
        benchmark_return_pct: scenario.workspace.net_performance.benchmark_return_pct,
        active_return_pct: scenario.workspace.net_performance.active_return_pct,
        annualized_return_pct: scenario.workspace.net_performance.annualized_return_pct,
        end_market_value: scenario.workspace.net_performance.end_market_value,
        beginning_cash_flow: scenario.workspace.net_performance.beginning_cash_flow,
        ending_cash_flow: scenario.workspace.net_performance.ending_cash_flow,
        flow_adjusted_end_market_value:
          scenario.workspace.net_performance.flow_adjusted_end_market_value,
        net_cash_flow: scenario.workspace.net_performance.net_cash_flow,
        fees: scenario.workspace.net_performance.fees,
        benchmark_return_source: scenario.workspace.net_performance.benchmark_return_source,
        benchmark_input_mode: scenario.workspace.net_performance.benchmark_input_mode,
      },
      benchmark: scenario.workspace.benchmark_code ?? undefined,
      benchmarkOptions: scenario.workspace.benchmark_options ?? [],
      capabilities: scenario.capabilities,
      reportingCurrency: scenario.workspace.portfolio.base_currency,
    });

    expect(presentation).toMatchObject({
      benchmarkAssigned: true,
      benchmarkLabel: "Global Balanced 60/40",
      benchmarkContextValue: "Global Balanced 60/40 • USD",
      activeReturnValue: "Unavailable",
      benchmarkStateBody: null,
    });
    expect(presentation.metrics[1]).toMatchObject({
      label: "Benchmark Return",
      value: "Unavailable",
      unavailable: true,
    });
    expect(presentation.metrics[2]).toMatchObject({
      label: "Active Return",
      value: "Unavailable",
      unavailable: true,
    });
  });

  it("builds an honest benchmark-unassigned presentation without fake comparison values", () => {
    const scenario = buildBenchmarkUnassignedPerformanceScenario();

    const presentation = getPerformanceReturnPathPresentation({
      summary: {
        portfolio_return_pct: 6.2,
        benchmark_return_pct: null,
        active_return_pct: null,
        annualized_return_pct: null,
        end_market_value: null,
        flow_adjusted_end_market_value: null,
        net_cash_flow: null,
        fees: null,
        benchmark_return_source: null,
        benchmark_input_mode: null,
      },
      capabilities: {
        ...scenario.capabilities,
        returnPath: { state: "supported" },
      },
      reportingCurrency: "USD",
    });

    expect(presentation).toMatchObject({
      benchmarkAssigned: false,
      benchmarkLabel: "Benchmark",
      activeReturnValue: "Unavailable",
      benchmarkStateBody: "No benchmark is assigned to this mandate.",
    });
    expect(presentation.metrics[1]).toMatchObject({
      label: "Benchmark Return",
      value: "Unavailable",
      unavailable: true,
    });
  });

  it("falls back to fees when split cash flow components are unavailable everywhere", () => {
    const scenario = buildSupportedPerformanceScenario();
    const moneyWeightedReturn = scenario.workspace.money_weighted_return
      ? {
          ...scenario.workspace.money_weighted_return,
          beginning_cash_flow: null,
          ending_cash_flow: null,
          fees: 125,
        }
      : null;

    const presentation = getPerformanceReturnPathPresentation({
      summary: {
        portfolio_return_pct: scenario.workspace.net_performance.portfolio_return_pct,
        benchmark_return_pct: scenario.workspace.net_performance.benchmark_return_pct,
        active_return_pct: scenario.workspace.net_performance.active_return_pct,
        annualized_return_pct: scenario.workspace.net_performance.annualized_return_pct,
        end_market_value: scenario.workspace.net_performance.end_market_value,
        beginning_cash_flow: null,
        ending_cash_flow: null,
        flow_adjusted_end_market_value:
          scenario.workspace.net_performance.flow_adjusted_end_market_value,
        net_cash_flow: scenario.workspace.net_performance.net_cash_flow,
        fees: 125,
        benchmark_return_source: scenario.workspace.net_performance.benchmark_return_source,
        benchmark_input_mode: scenario.workspace.net_performance.benchmark_input_mode,
      },
      benchmark: scenario.workspace.benchmark_code ?? undefined,
      benchmarkOptions: scenario.workspace.benchmark_options ?? [],
      moneyWeightedReturn,
      capabilities: scenario.capabilities,
      reportingCurrency: scenario.workspace.portfolio.base_currency,
    });

    expect(presentation.metrics.find((metric) => metric.key === "net-flow")).toMatchObject({
      label: "Net Flow",
      value: "$42,000",
      unavailable: false,
    });
  });

  it("falls back to money-weighted economics when summary economics are absent", () => {
    const scenario = buildSupportedPerformanceScenario();

    const presentation = getPerformanceReturnPathPresentation({
      summary: {
        portfolio_return_pct: scenario.workspace.net_performance.portfolio_return_pct,
        benchmark_return_pct: scenario.workspace.net_performance.benchmark_return_pct,
        active_return_pct: scenario.workspace.net_performance.active_return_pct,
        annualized_return_pct: scenario.workspace.net_performance.annualized_return_pct,
        end_market_value: null,
        beginning_cash_flow: null,
        ending_cash_flow: null,
        flow_adjusted_end_market_value: null,
        net_cash_flow: null,
        fees: null,
        benchmark_return_source: scenario.workspace.net_performance.benchmark_return_source,
        benchmark_input_mode: scenario.workspace.net_performance.benchmark_input_mode,
      },
      moneyWeightedReturn: scenario.workspace.money_weighted_return,
      benchmark: scenario.workspace.benchmark_code ?? undefined,
      benchmarkOptions: scenario.workspace.benchmark_options ?? [],
      capabilities: scenario.capabilities,
      reportingCurrency: scenario.workspace.portfolio.base_currency,
    });

    expect(presentation.metrics.find((metric) => metric.key === "net-flow")).toMatchObject({
      label: "Net Flow",
      value: "$42,000",
      unavailable: false,
    });
    expect(
      presentation.metrics.find((metric) => metric.key === "flow-adjusted-mv")
    ).toMatchObject({
      label: "Flow-Adjusted MV",
      value: "$1,208,000",
      unavailable: false,
    });
    expect(presentation.metrics.find((metric) => metric.key === "ending-mv")).toMatchObject({
      label: "Ending MV",
      value: "$1,250,000",
      unavailable: false,
    });
  });

  it("builds a benchmark option label from contract metadata when available", () => {
    expect(
      getPerformanceBenchmarkOptionLabel({
        benchmark_code: "BMK_GLOBAL_BALANCED_60_40",
        benchmark_name: "Global Balanced 60/40",
        benchmark_currency: "USD",
        benchmark_type: "composite",
        benchmark_family: "multi_asset_strategic",
        benchmark_provider: "LOTUS_DEMO",
        is_assigned: true,
      })
    ).toBe("Global Balanced 60/40 • USD • Composite");
  });

  it("keeps benchmark context focused on benchmark identity and market metadata", () => {
    const scenario = buildSupportedPerformanceScenario();

    const presentation = getPerformanceReturnPathPresentation({
      summary: {
        portfolio_return_pct: scenario.workspace.net_performance.portfolio_return_pct,
        benchmark_return_pct: scenario.workspace.net_performance.benchmark_return_pct,
        active_return_pct: scenario.workspace.net_performance.active_return_pct,
        annualized_return_pct: scenario.workspace.net_performance.annualized_return_pct,
        end_market_value: scenario.workspace.net_performance.end_market_value,
        beginning_cash_flow: scenario.workspace.net_performance.beginning_cash_flow,
        ending_cash_flow: scenario.workspace.net_performance.ending_cash_flow,
        flow_adjusted_end_market_value:
          scenario.workspace.net_performance.flow_adjusted_end_market_value,
        net_cash_flow: scenario.workspace.net_performance.net_cash_flow,
        fees: scenario.workspace.net_performance.fees,
        benchmark_return_source: scenario.workspace.net_performance.benchmark_return_source,
        benchmark_input_mode: scenario.workspace.net_performance.benchmark_input_mode,
      },
      benchmark: scenario.workspace.benchmark_code ?? undefined,
      benchmarkOptions: scenario.workspace.benchmark_options ?? [],
      capabilities: scenario.capabilities,
      reportingCurrency: scenario.workspace.portfolio.base_currency,
    });

    expect(presentation.benchmarkContextValue).toBe("Global Balanced 60/40 • USD");
    expect(presentation.benchmarkContextValue).not.toContain("Stateful benchmark");
    expect(presentation.benchmarkContextValue).not.toContain("Lotus Demo");
    expect(presentation.benchmarkContextValue).not.toContain("Composite");
  });
});
