import type {
  PerformanceBenchmarkOptionView,
  PerformanceChartPoint,
} from "@/features/workbench/types";

import type { PerformanceWorkspaceCapabilities } from "../capabilities";

import { formatPct } from "../formatters";

type PerformanceChartContextStatus = "available" | "partial" | "unavailable";

export type PerformanceReturnPathMetric = {
  label: string;
  value: string | number;
  unavailable?: boolean;
};

export type PerformanceReturnPathPresentation = {
  benchmarkAssigned: boolean;
  benchmarkLabel: string;
  activeReturnValue: string;
  relativeContextStatus: PerformanceChartContextStatus;
  benchmarkStateBody: string | null;
  metrics: PerformanceReturnPathMetric[];
};

export function getPerformanceReturnPathPresentation({
  summary,
  points,
  benchmark,
  benchmarkOptions = [],
  capabilities,
}: {
  summary: {
    portfolio_return_pct: number | null;
    benchmark_return_pct: number | null;
    active_return_pct: number | null;
  };
  points: PerformanceChartPoint[];
  benchmark?: string;
  benchmarkOptions?: PerformanceBenchmarkOptionView[];
  capabilities: PerformanceWorkspaceCapabilities;
}): PerformanceReturnPathPresentation {
  const benchmarkLabel = formatBenchmarkLabel(benchmark, benchmarkOptions);
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
    activeReturnValue,
    relativeContextStatus,
    benchmarkStateBody: benchmarkAssigned
      ? null
      : capabilities.benchmarkComparison.reason ??
        "Assign a benchmark to enable relative comparison and active return context.",
    metrics: [
      {
        label: "Portfolio Return",
        value: formatPct(summary.portfolio_return_pct),
        unavailable: summary.portfolio_return_pct == null,
      },
      {
        label: "Benchmark Return",
        value:
          benchmarkAssigned && summary.benchmark_return_pct != null
            ? formatPct(summary.benchmark_return_pct)
            : "Unavailable",
        unavailable: !benchmarkAssigned || summary.benchmark_return_pct == null,
      },
      {
        label: "Active Return",
        value: activeReturnValue,
        unavailable: activeReturnValue === "Unavailable",
      },
      {
        label: "Observations",
        value: points.length,
        unavailable: points.length === 0,
      },
    ],
  };
}

function formatBenchmarkLabel(
  benchmark?: string,
  benchmarkOptions: PerformanceBenchmarkOptionView[] = []
) {
  if (!benchmark) {
    return "Benchmark";
  }
  return (
    benchmarkOptions.find((option) => option.benchmark_code === benchmark)?.benchmark_name ??
    benchmark
  );
}
