import { describe, expect, it } from "vitest";

import {
  getPerformanceBenchmarkOptionLabel,
  getPerformanceReturnPathPresentation,
} from "../../src/apps/performance/components/performance-summary-context-helpers";
import { buildPerformanceMwrDrilldown as buildMwrDrilldown } from "../../src/apps/performance/components/performance-mwr-drilldown";
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
        benchmark_currency_state: scenario.workspace.net_performance.benchmark_currency_state,
        benchmark_calendar_alignment_state:
          scenario.workspace.net_performance.benchmark_calendar_alignment_state,
        benchmark_warning_codes: scenario.workspace.net_performance.benchmark_warning_codes,
        benchmark_missing_date_count:
          scenario.workspace.net_performance.benchmark_missing_date_count,
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
      { key: "portfolio-return", label: "Portfolio TWR", value: "5.42%", unavailable: false },
      { key: "benchmark-return", label: "Benchmark TWR", value: "4.91%", unavailable: false },
      { key: "active-return", label: "Active return", value: "0.52%", unavailable: false },
      {
        key: "benchmark-evidence",
        label: "Benchmark evidence",
        value: "Fx Decomposed • Aligned",
        unavailable: false,
      },
      {
        key: "mwrr",
        label: "Money-weighted return (MWR)",
        value: "5.12%",
        unavailable: false,
      },
      {
        key: "flow-adjusted-mv",
        label: "Flow-adjusted market value",
        value: "$1,208,000",
        unavailable: false,
      },
      {
        key: "ending-mv",
        label: "Ending market value",
        value: "$1,250,000",
        unavailable: false,
      },
      {
        key: "opening-mv",
        label: "Opening market value",
        value: "$1,200,000",
        unavailable: false,
      },
      {
        key: "net-flow",
        label: "Net cash flow",
        value: "$42,000",
        unavailable: false,
      },
      {
        key: "opening-cash",
        label: "Opening cash flow",
        value: "$50,000",
        unavailable: false,
      },
      {
        key: "closing-cash",
        label: "Closing cash flow",
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
      label: "Benchmark TWR",
      value: "Unavailable",
      unavailable: true,
    });
    expect(presentation.metrics[2]).toMatchObject({
      label: "Active return",
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
      label: "Benchmark TWR",
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
      label: "Net cash flow",
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
      label: "Net cash flow",
      value: "$42,000",
      unavailable: false,
    });
    expect(
      presentation.metrics.find((metric) => metric.key === "flow-adjusted-mv")
    ).toMatchObject({
      label: "Flow-adjusted market value",
      value: "$1,208,000",
      unavailable: false,
    });
    expect(presentation.metrics.find((metric) => metric.key === "ending-mv")).toMatchObject({
      label: "Ending market value",
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

  it("builds MWR reason-code drill-down only when supportability signals exist", () => {
    const scenario = buildSupportedPerformanceScenario();

    expect(buildMwrDrilldown(scenario.workspace.money_weighted_return)).toBeNull();

    const model = buildMwrDrilldown({
      ...scenario.workspace.money_weighted_return!,
      status: "FALLBACK_USED",
      method: "MODIFIED_DIETZ",
      reason_codes: ["NO_ROOT_FOUND", "DIETZ_FALLBACK_USED", "NO_ROOT_FOUND"],
      warnings: ["XIRR solver did not find a unique root."],
      fallback_from: "XIRR",
      fallback_reason: "No unique XIRR root was found.",
      is_approximation: true,
      holding_period_return_pct: 3.05,
      notes: ["Modified Dietz fallback used."],
    });

    expect(model).toMatchObject({
      summaryLabel: "Fallback Used • Modified Dietz • Approximation",
      statusLabel: "Fallback Used",
      methodLabel: "Modified Dietz",
      inputModeLabel: "Stateful",
      annualizedLabel: "5.12%",
      holdingPeriodLabel: "3.05%",
      approximationLabel: "Approximation",
      fallbackLabel: "XIRR: No unique XIRR root was found.",
      reasonCodes: ["NO_ROOT_FOUND", "DIETZ_FALLBACK_USED"],
      warnings: ["XIRR solver did not find a unique root."],
      notes: ["Modified Dietz fallback used."],
    });
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
