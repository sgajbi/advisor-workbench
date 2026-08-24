import type {
  PerformanceBenchmarkOptionView,
  MoneyWeightedReturnSummary,
} from "@/features/workbench/types";

import type { PerformanceWorkspaceCapabilities } from "../capabilities";
import { formatCurrency, formatLabel, formatPct } from "../formatters";
import {
  PERFORMANCE_ECONOMICS_LABELS,
  PERFORMANCE_RETURN_DEFINITIONS,
  PERFORMANCE_RETURN_LABELS,
} from "../performance-terminology";

export type PerformanceReturnPathMetric = {
  key: string;
  label: string;
  value: string | number;
  support?: string;
  definition?: string;
  unavailable?: boolean;
};

export type PerformanceReturnPathPresentation = {
  benchmarkAssigned: boolean;
  benchmarkLabel: string;
  benchmarkContextValue: string;
  portfolioReturnValue: string;
  benchmarkReturnValue: string;
  activeReturnValue: string;
  benchmarkStateBody: string | null;
  metrics: PerformanceReturnPathMetric[];
};

type PerformanceEconomicsResolution = {
  netCashFlow: number | null;
  beginMarketValue: number | null;
  endMarketValue: number | null;
  flowAdjustedEndMarketValue: number | null;
  beginningCashFlow: number | null;
  endingCashFlow: number | null;
  moneyWeightedReturnValue: string;
};

export function getPerformanceReturnPathPresentation({
  summary,
  moneyWeightedReturn,
  benchmark,
  benchmarkOptions = [],
  capabilities,
  reportingCurrency,
}: {
  summary: {
    portfolio_return_pct: number | null;
    benchmark_return_pct: number | null;
    active_return_pct: number | null;
    annualized_return_pct?: number | null;
    begin_market_value?: number | null;
    end_market_value?: number | null;
    beginning_cash_flow?: number | null;
    ending_cash_flow?: number | null;
    flow_adjusted_end_market_value?: number | null;
    net_cash_flow?: number | null;
    fees?: number | null;
    benchmark_return_source?: string | null;
    benchmark_input_mode?: string | null;
    benchmark_currency_state?: string | null;
    benchmark_calendar_alignment_state?: string | null;
    benchmark_warning_codes?: string[];
    benchmark_missing_date_count?: number | null;
  };
  moneyWeightedReturn?: MoneyWeightedReturnSummary | null;
  benchmark?: string;
  benchmarkOptions?: PerformanceBenchmarkOptionView[];
  capabilities: PerformanceWorkspaceCapabilities;
  reportingCurrency: string;
}): PerformanceReturnPathPresentation {
  const benchmarkLabel = getPerformanceBenchmarkLabel(benchmark, benchmarkOptions);
  const benchmarkAssigned =
    Boolean(benchmark) || benchmarkOptions.some((option) => option.is_assigned);
  const activeReturnValue =
    !benchmarkAssigned || summary.active_return_pct == null
      ? "Unavailable"
      : formatPct(summary.active_return_pct);
  const resolvedEconomics = resolvePerformanceEconomics(summary, moneyWeightedReturn);
  const portfolioReturnValue =
    summary.portfolio_return_pct != null ? formatPct(summary.portfolio_return_pct) : "Unavailable";
  const benchmarkReturnValue =
    benchmarkAssigned && summary.benchmark_return_pct != null
      ? formatPct(summary.benchmark_return_pct)
      : "Unavailable";

  return {
    benchmarkAssigned,
    benchmarkLabel,
    benchmarkContextValue: getPerformanceBenchmarkContextValue({
      benchmark,
      benchmarkOptions,
    }),
    portfolioReturnValue,
    benchmarkReturnValue,
    activeReturnValue,
    benchmarkStateBody: benchmarkAssigned
      ? null
      : capabilities.benchmarkComparison.reason ??
        "Assign a benchmark to enable relative comparison and active return context.",
    metrics: buildPerformanceReturnPathMetrics({
      summary,
      benchmarkAssigned,
      portfolioReturnValue,
      benchmarkReturnValue,
      activeReturnValue,
      moneyWeightedReturn,
      resolvedEconomics,
      reportingCurrency,
    }),
  };
}

export function getPerformanceBenchmarkLabel(
  benchmark?: string,
  benchmarkOptions: PerformanceBenchmarkOptionView[] = []
) {
  if (!benchmark) {
    return "Benchmark";
  }
  return (
    benchmarkOptions.find((option) => option.benchmark_code === benchmark)?.benchmark_name ??
    formatLabel(benchmark)
  );
}

export function getPerformanceBenchmarkContextValue({
  benchmark,
  benchmarkOptions = [],
}: {
  benchmark?: string;
  benchmarkOptions?: PerformanceBenchmarkOptionView[];
}) {
  if (!benchmark) {
    return "Unassigned";
  }

  const selectedOption = benchmarkOptions.find((option) => option.benchmark_code === benchmark);
  const supportSegments = [
    selectedOption?.benchmark_currency ?? null,
  ].filter(Boolean);

  const benchmarkLabel =
    selectedOption?.benchmark_name ?? getPerformanceBenchmarkLabel(benchmark, benchmarkOptions);

  if (supportSegments.length === 0) {
    return benchmarkLabel;
  }

  return `${benchmarkLabel} • ${supportSegments.join(" • ")}`;
}

function resolvePerformanceEconomics(
  summary: {
    begin_market_value?: number | null;
    end_market_value?: number | null;
    beginning_cash_flow?: number | null;
    ending_cash_flow?: number | null;
    flow_adjusted_end_market_value?: number | null;
    net_cash_flow?: number | null;
  },
  moneyWeightedReturn?: MoneyWeightedReturnSummary | null
): PerformanceEconomicsResolution {
  return {
    netCashFlow: summary.net_cash_flow ?? moneyWeightedReturn?.net_cash_flow ?? null,
    beginMarketValue:
      summary.begin_market_value ?? moneyWeightedReturn?.begin_market_value ?? null,
    endMarketValue: summary.end_market_value ?? moneyWeightedReturn?.end_market_value ?? null,
    flowAdjustedEndMarketValue:
      summary.flow_adjusted_end_market_value ??
      moneyWeightedReturn?.flow_adjusted_end_market_value ??
      null,
    beginningCashFlow:
      summary.beginning_cash_flow ?? moneyWeightedReturn?.beginning_cash_flow ?? null,
    endingCashFlow: summary.ending_cash_flow ?? moneyWeightedReturn?.ending_cash_flow ?? null,
    moneyWeightedReturnValue:
      moneyWeightedReturn?.money_weighted_return_pct != null
        ? formatPct(moneyWeightedReturn.money_weighted_return_pct)
        : "Unavailable",
  };
}

function buildPerformanceReturnPathMetrics({
  summary,
  benchmarkAssigned,
  portfolioReturnValue,
  benchmarkReturnValue,
  activeReturnValue,
  moneyWeightedReturn,
  resolvedEconomics,
  reportingCurrency,
}: {
  summary: {
    portfolio_return_pct: number | null;
    benchmark_return_pct: number | null;
    benchmark_currency_state?: string | null;
    benchmark_calendar_alignment_state?: string | null;
    benchmark_warning_codes?: string[];
    benchmark_missing_date_count?: number | null;
  };
  benchmarkAssigned: boolean;
  portfolioReturnValue: string;
  benchmarkReturnValue: string;
  activeReturnValue: string;
  moneyWeightedReturn?: MoneyWeightedReturnSummary | null;
  resolvedEconomics: PerformanceEconomicsResolution;
  reportingCurrency: string;
}): PerformanceReturnPathMetric[] {
  return [
    {
      key: "portfolio-return",
      label: PERFORMANCE_RETURN_LABELS.portfolioTwr,
      value: portfolioReturnValue,
      definition: PERFORMANCE_RETURN_DEFINITIONS.timeWeightedReturn,
      unavailable: summary.portfolio_return_pct == null,
    },
    {
      key: "benchmark-return",
      label: PERFORMANCE_RETURN_LABELS.benchmarkTwr,
      value: benchmarkReturnValue,
      unavailable: !benchmarkAssigned || summary.benchmark_return_pct == null,
    },
    {
      key: "active-return",
      label: PERFORMANCE_RETURN_LABELS.activeReturn,
      value: activeReturnValue,
      definition: PERFORMANCE_RETURN_DEFINITIONS.activeReturn,
      unavailable: activeReturnValue === "Unavailable",
    },
    ...(benchmarkAssigned
      ? [
          {
            key: "benchmark-evidence",
            label: "Benchmark evidence",
            value: formatBenchmarkEvidenceValue(summary),
            definition:
              "Benchmark supportability evidence from lotus-performance, including currency treatment and portfolio-vs-benchmark calendar alignment.",
            unavailable: !summary.benchmark_currency_state && !summary.benchmark_calendar_alignment_state,
          } satisfies PerformanceReturnPathMetric,
        ]
      : []),
    {
      key: "mwrr",
      label: PERFORMANCE_RETURN_LABELS.moneyWeightedReturn,
      value: resolvedEconomics.moneyWeightedReturnValue,
      definition:
        PERFORMANCE_RETURN_DEFINITIONS.moneyWeightedReturn,
      unavailable: moneyWeightedReturn?.money_weighted_return_pct == null,
    },
    {
      key: "flow-adjusted-mv",
      label: PERFORMANCE_ECONOMICS_LABELS.flowAdjustedMarketValue,
      value: formatCurrency(resolvedEconomics.flowAdjustedEndMarketValue, reportingCurrency),
      definition:
        "Ending market value adjusted for external cash flows to isolate investment performance from funding activity.",
      unavailable: resolvedEconomics.flowAdjustedEndMarketValue == null,
    },
    ...(resolvedEconomics.endMarketValue != null
      ? [
          {
            key: "ending-mv",
            label: PERFORMANCE_ECONOMICS_LABELS.endingMarketValue,
            value: formatCurrency(resolvedEconomics.endMarketValue, reportingCurrency),
            definition:
              "Ending market value at the close of the reporting window after market movement and cash activity are recognized.",
            unavailable: false,
          } satisfies PerformanceReturnPathMetric,
        ]
      : []),
    {
      key: "opening-mv",
      label: PERFORMANCE_ECONOMICS_LABELS.openingMarketValue,
      value: formatCurrency(resolvedEconomics.beginMarketValue, reportingCurrency),
      definition:
        "Opening market value at the start of the reporting window before current-period returns and flows.",
      unavailable: resolvedEconomics.beginMarketValue == null,
    },
    {
      key: "net-flow",
      label: PERFORMANCE_ECONOMICS_LABELS.netCashFlow,
      value: formatCurrency(resolvedEconomics.netCashFlow, reportingCurrency),
      definition:
        "Net external cash movement during the reporting window after subscriptions, withdrawals, and other funded activity.",
      unavailable: resolvedEconomics.netCashFlow == null,
    },
    ...(resolvedEconomics.beginningCashFlow != null
      ? [
          {
            key: "opening-cash",
            label: PERFORMANCE_ECONOMICS_LABELS.openingCashFlow,
            value: formatCurrency(resolvedEconomics.beginningCashFlow, reportingCurrency),
            definition:
              "Opening external cash position resolved for the reporting window before current-period activity is applied.",
            unavailable: false,
          } satisfies PerformanceReturnPathMetric,
        ]
      : []),
    ...(resolvedEconomics.endingCashFlow != null
      ? [
          {
            key: "closing-cash",
            label: PERFORMANCE_ECONOMICS_LABELS.closingCashFlow,
            value: formatCurrency(resolvedEconomics.endingCashFlow, reportingCurrency),
            definition:
              "Closing external cash position after subscriptions, withdrawals, and other funded activity in the selected window.",
            unavailable: false,
          } satisfies PerformanceReturnPathMetric,
        ]
      : []),
  ];
}

function formatBenchmarkEvidenceValue(summary: {
  benchmark_currency_state?: string | null;
  benchmark_calendar_alignment_state?: string | null;
  benchmark_warning_codes?: string[];
  benchmark_missing_date_count?: number | null;
}): string {
  const parts = [
    summary.benchmark_currency_state ? formatLabel(summary.benchmark_currency_state) : null,
    summary.benchmark_calendar_alignment_state
      ? formatLabel(summary.benchmark_calendar_alignment_state)
      : null,
  ].filter(Boolean);
  const missingCount = summary.benchmark_missing_date_count ?? 0;
  if (missingCount > 0) {
    parts.push(`${missingCount} missing benchmark date${missingCount === 1 ? "" : "s"}`);
  }
  if (summary.benchmark_warning_codes?.length) {
    parts.push(`${summary.benchmark_warning_codes.length} warning code${summary.benchmark_warning_codes.length === 1 ? "" : "s"}`);
  }
  return parts.length ? parts.join(" • ") : "Unavailable";
}

export function getPerformanceBenchmarkOptionLabel(
  option: PerformanceBenchmarkOptionView
) {
  const supportSegments = [
    option.benchmark_currency ?? null,
    option.benchmark_type ? formatLabel(option.benchmark_type) : null,
  ].filter(Boolean);

  if (supportSegments.length === 0) {
    return option.benchmark_name;
  }

  return `${option.benchmark_name} • ${supportSegments.join(" • ")}`;
}
