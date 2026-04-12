import type {
  PerformanceBenchmarkOptionView,
  PerformanceChartPoint,
  MoneyWeightedReturnSummary,
} from "@/features/workbench/types";

import type { PerformanceWorkspaceCapabilities } from "../capabilities";

import { formatCurrency, formatLabel, formatPct } from "../formatters";

type PerformanceChartContextStatus = "available" | "partial" | "unavailable";

export type PerformanceReturnPathMetric = {
  key: string;
  label: string;
  value: string | number;
  support?: string;
  unavailable?: boolean;
};

export type PerformanceReturnPathPresentation = {
  benchmarkAssigned: boolean;
  benchmarkLabel: string;
  benchmarkSourceLabel: string | null;
  benchmarkContextValue: string;
  portfolioReturnValue: string;
  benchmarkReturnValue: string;
  activeReturnValue: string;
  relativeContextStatus: PerformanceChartContextStatus;
  benchmarkStateBody: string | null;
  metrics: PerformanceReturnPathMetric[];
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
  };
  moneyWeightedReturn?: MoneyWeightedReturnSummary | null;
  points: PerformanceChartPoint[];
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
  const relativeContextStatus: PerformanceChartContextStatus = !benchmarkAssigned
    ? "unavailable"
    : capabilities.benchmarkComparison.state === "supported"
      ? "available"
      : capabilities.benchmarkComparison.state === "partial"
        ? "partial"
        : "unavailable";
  const resolvedNetCashFlow =
    summary.net_cash_flow ?? moneyWeightedReturn?.net_cash_flow ?? null;
  const resolvedBeginMarketValue =
    summary.begin_market_value ?? moneyWeightedReturn?.begin_market_value ?? null;
  const resolvedEndMarketValue =
    summary.end_market_value ?? moneyWeightedReturn?.end_market_value ?? null;
  const resolvedFlowAdjustedEndMarketValue =
    summary.flow_adjusted_end_market_value ??
    moneyWeightedReturn?.flow_adjusted_end_market_value ??
    null;
  const resolvedMoneyWeightedReturn =
    moneyWeightedReturn?.money_weighted_return_pct != null
      ? formatPct(moneyWeightedReturn.money_weighted_return_pct)
      : "Unavailable";
  const netFlowSupport = getPerformanceNetFlowSupport(summary, reportingCurrency, moneyWeightedReturn);
  const flowAdjustedSupport =
    resolvedEndMarketValue != null
      ? `Ending MV ${formatCurrency(resolvedEndMarketValue, reportingCurrency)}`
      : null;

  return {
    benchmarkAssigned,
    benchmarkLabel,
    benchmarkSourceLabel: formatBenchmarkSourceLabel(summary.benchmark_return_source),
    benchmarkContextValue: getPerformanceBenchmarkContextValue({
      benchmark,
      benchmarkOptions,
      benchmarkReturnSource: summary.benchmark_return_source,
      benchmarkInputMode: summary.benchmark_input_mode,
    }),
    portfolioReturnValue:
      summary.portfolio_return_pct != null
        ? formatPct(summary.portfolio_return_pct)
        : "Unavailable",
    benchmarkReturnValue:
      benchmarkAssigned && summary.benchmark_return_pct != null
        ? formatPct(summary.benchmark_return_pct)
        : "Unavailable",
    activeReturnValue,
    relativeContextStatus,
    benchmarkStateBody: benchmarkAssigned
      ? null
      : capabilities.benchmarkComparison.reason ??
        "Assign a benchmark to enable relative comparison and active return context.",
    metrics: [
      {
        key: "portfolio-return",
        label: "Portfolio Return",
        value:
          summary.portfolio_return_pct != null
            ? formatPct(summary.portfolio_return_pct)
            : "Unavailable",
        unavailable: summary.portfolio_return_pct == null,
      },
      {
        key: "benchmark-return",
        label: "Benchmark Return",
        value:
          benchmarkAssigned && summary.benchmark_return_pct != null
            ? formatPct(summary.benchmark_return_pct)
            : "Unavailable",
        unavailable: !benchmarkAssigned || summary.benchmark_return_pct == null,
      },
      {
        key: "active-return",
        label: "Active Return",
        value: activeReturnValue,
        unavailable: activeReturnValue === "Unavailable",
      },
      {
        key: "mwrr",
        label: "Money-Weighted Return",
        value: resolvedMoneyWeightedReturn,
        unavailable: moneyWeightedReturn?.money_weighted_return_pct == null,
      },
      {
        key: "opening-mv",
        label: "Opening MV",
        value: formatCurrency(resolvedBeginMarketValue, reportingCurrency),
        unavailable: resolvedBeginMarketValue == null,
      },
      {
        key: "net-flow",
        label: "Net Flow",
        value: formatCurrency(resolvedNetCashFlow, reportingCurrency),
        support: netFlowSupport,
        unavailable: resolvedNetCashFlow == null,
      },
      {
        key: "flow-adjusted-mv",
        label: "Flow-Adjusted MV",
        value: formatCurrency(resolvedFlowAdjustedEndMarketValue, reportingCurrency),
        support: flowAdjustedSupport ?? undefined,
        unavailable: resolvedFlowAdjustedEndMarketValue == null,
      },
    ],
  };
}

export function getPerformanceNetFlowSupport(
  summary: {
    beginning_cash_flow?: number | null;
    ending_cash_flow?: number | null;
    fees?: number | null;
  },
  reportingCurrency: string,
  moneyWeightedReturn?: MoneyWeightedReturnSummary | null
) {
  const beginningCashFlow =
    summary.beginning_cash_flow ?? moneyWeightedReturn?.beginning_cash_flow ?? null;
  const endingCashFlow =
    summary.ending_cash_flow ?? moneyWeightedReturn?.ending_cash_flow ?? null;
  const fees = summary.fees ?? moneyWeightedReturn?.fees ?? null;

  if (beginningCashFlow != null || endingCashFlow != null) {
    const supportSegments = [
      beginningCashFlow != null
        ? `Opening Cash ${formatCurrency(beginningCashFlow, reportingCurrency)}`
        : null,
      endingCashFlow != null
        ? `Closing Cash ${formatCurrency(endingCashFlow, reportingCurrency)}`
        : null,
    ].filter(Boolean);

    if (supportSegments.length > 0) {
      return supportSegments.join(" • ");
    }
  }

  if (fees != null) {
    return `Fees ${formatCurrency(fees, reportingCurrency)}`;
  }

  return undefined;
}

export function getPerformanceMoneyWeightedAuditSupport({
  explicitDateRange,
}: {
  explicitDateRange: string;
  moneyWeightedReturn?: MoneyWeightedReturnSummary | null;
  reportingCurrency?: string;
}) {
  return explicitDateRange;
}

export function getPerformanceMoneyWeightedEconomicsSupport(
  moneyWeightedReturn: MoneyWeightedReturnSummary | null | undefined,
  reportingCurrency: string
) {
  if (moneyWeightedReturn?.flow_adjusted_end_market_value != null) {
    return `Flow-Adjusted MV ${formatCurrency(
      moneyWeightedReturn.flow_adjusted_end_market_value,
      reportingCurrency
    )}`;
  }

  if (moneyWeightedReturn?.net_cash_flow != null) {
    return `Net Flow ${formatCurrency(moneyWeightedReturn.net_cash_flow, reportingCurrency)}`;
  }

  return null;
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
  benchmarkReturnSource?: string | null;
  benchmarkInputMode?: string | null;
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

function formatBenchmarkSourceLabel(source?: string | null) {
  if (!source) {
    return null;
  }

  switch (source.trim().toLowerCase()) {
    case "calculated":
      return "Calculated";
    case "published":
      return "Published";
    case "vendor":
      return "Vendor";
    default:
      return source
        .split(/[_\s-]+/)
        .filter(Boolean)
        .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1).toLowerCase())
        .join(" ");
  }
}
