import type {
  PerformanceBenchmarkOptionView,
  PerformanceChartPoint,
  MoneyWeightedReturnSummary,
} from "@/features/workbench/types";

import type { PerformanceWorkspaceCapabilities } from "../capabilities";

import { formatCurrency, formatDate, formatLabel, formatPct } from "../formatters";

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
  activeReturnValue: string;
  relativeContextStatus: PerformanceChartContextStatus;
  benchmarkStateBody: string | null;
  metrics: PerformanceReturnPathMetric[];
};

export function getPerformanceReturnPathPresentation({
  summary,
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
    end_market_value?: number | null;
    beginning_cash_flow?: number | null;
    ending_cash_flow?: number | null;
    flow_adjusted_end_market_value?: number | null;
    net_cash_flow?: number | null;
    fees?: number | null;
    benchmark_return_source?: string | null;
  };
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

  return {
    benchmarkAssigned,
    benchmarkLabel,
    benchmarkSourceLabel: formatBenchmarkSourceLabel(summary.benchmark_return_source),
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
        value: formatPct(summary.portfolio_return_pct),
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
        key: "net-flow",
        label: "Net Flow",
        value: formatCurrency(summary.net_cash_flow, reportingCurrency),
        support: getPerformanceNetFlowSupport(summary, reportingCurrency),
        unavailable: summary.net_cash_flow == null,
      },
      {
        key: "ending-mv",
        label: "Ending MV",
        value: formatCurrency(summary.end_market_value, reportingCurrency),
        support:
          summary.flow_adjusted_end_market_value != null
            ? `Flow-adj ${formatCurrency(summary.flow_adjusted_end_market_value, reportingCurrency)}`
            : undefined,
        unavailable: summary.end_market_value == null,
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
  reportingCurrency: string
) {
  if (summary.beginning_cash_flow != null || summary.ending_cash_flow != null) {
    const supportSegments = [
      summary.beginning_cash_flow != null
        ? `BoD ${formatCurrency(summary.beginning_cash_flow, reportingCurrency)}`
        : null,
      summary.ending_cash_flow != null
        ? `EoD ${formatCurrency(summary.ending_cash_flow, reportingCurrency)}`
        : null,
    ].filter(Boolean);

    if (supportSegments.length > 0) {
      return supportSegments.join(" • ");
    }
  }

  if (summary.fees != null) {
    return `Fees ${formatCurrency(summary.fees, reportingCurrency)}`;
  }

  return undefined;
}

export function getPerformanceMoneyWeightedAuditSupport({
  explicitDateRange,
  moneyWeightedReturn,
}: {
  explicitDateRange: string;
  moneyWeightedReturn?: MoneyWeightedReturnSummary | null;
}) {
  const supportSegments = [
    moneyWeightedReturn?.method ? `MWR ${moneyWeightedReturn.method}` : null,
    moneyWeightedReturn?.start_date && moneyWeightedReturn?.end_date
      ? `${formatDate(moneyWeightedReturn.start_date)} - ${formatDate(moneyWeightedReturn.end_date)}`
      : null,
    moneyWeightedReturn?.notes?.[0] ?? null,
  ].filter(Boolean);

  if (supportSegments.length === 0) {
    return explicitDateRange;
  }

  return `${explicitDateRange} • ${supportSegments.join(" • ")}`;
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
