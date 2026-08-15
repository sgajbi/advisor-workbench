import type {
  PerformanceBenchmarkOptionView,
  PerformanceChartPoint,
} from "@/features/workbench/types";

import { formatDate } from "../formatters";
import {
  buildPercentAxisBounds,
  resolveActiveCumulativeReturn,
  resolveActivePeriodReturn,
  toNumeric,
} from "./performance-return-path-chart-model";
import type {
  PerformanceReturnPathPresentation,
} from "./performance-summary-context-helpers";
import type { PerformanceReturnPathSingleObservationPresentation } from "./performance-return-path-single-observation-stage";

export type PerformanceControlPatch = {
  portfolioId?: string;
  period?: string;
  detailBasis?: string;
  contributionDimension?: string;
  attributionDimension?: string;
  chartFrequency?: string;
  benchmark?: string;
  reportStartDate?: string;
  reportEndDate?: string;
};

export type ComparativeSummary = {
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
  benchmark_input_mode?: string | null;
};

export type PerformanceChartViewMode = "combined" | "absolute" | "relative";

function clampPercent(value: number) {
  return Math.min(100, Math.max(0, value));
}

export function buildSingleObservationPresentation({
  points,
  chartViewMode,
  hasBenchmarkSeries,
}: {
  points: PerformanceChartPoint[];
  chartViewMode: PerformanceChartViewMode;
  hasBenchmarkSeries: boolean;
}): PerformanceReturnPathSingleObservationPresentation | null {
  if (points.length !== 1) {
    return null;
  }

  const point = points[0];
  const rows = [
    ...(chartViewMode !== "relative"
      ? [
          {
            key: "portfolio",
            label: "Portfolio",
            value: toNumeric(point.cumulative_portfolio_return_pct),
            tone: "portfolio" as const,
          },
          ...(hasBenchmarkSeries
            ? [
                {
                  key: "benchmark",
                  label: "Benchmark",
                  value: toNumeric(point.cumulative_benchmark_return_pct),
                  tone: "benchmark" as const,
                },
              ]
            : []),
        ]
      : []),
    ...(chartViewMode !== "absolute"
      ? [
          {
            key: "active",
            label: "Active",
            value: resolveActiveCumulativeReturn(point),
            tone: "active" as const,
          },
        ]
      : []),
  ].filter(
    (row): row is {
      key: string;
      label: string;
      value: number;
      tone: "portfolio" | "benchmark" | "active";
    } =>
      row.value !== null
  );

  if (!rows.length) {
    return null;
  }

  const bounds = buildPercentAxisBounds(rows.map((row) => row.value));
  const span = Math.max(bounds.max - bounds.min, 0.1);
  const baselinePct = clampPercent(((0 - bounds.min) / span) * 100);

  return {
    observationLabel: point.label,
    axisMinLabel: `${bounds.min}%`,
    axisMaxLabel: `${bounds.max > 0 ? "+" : ""}${bounds.max}%`,
    baselinePct,
    rows: rows.map((row) => {
      const markerPct = clampPercent(((row.value - bounds.min) / span) * 100);
      const startPct = Math.min(markerPct, baselinePct);
      const widthPct = Math.max(Math.abs(markerPct - baselinePct), 1.2);
      return {
        key: row.key,
        label: row.label,
        valueLabel: `${row.value > 0 ? "+" : ""}${row.value}%`,
        startPct,
        widthPct,
        markerPct,
        tone: row.tone,
      };
    }),
  };
}

export function buildResolvedBenchmarkOptions({
  benchmark,
  benchmarkOptions,
}: {
  benchmark?: string;
  benchmarkOptions: PerformanceBenchmarkOptionView[];
}) {
  if (benchmarkOptions.length > 0) {
    return benchmarkOptions;
  }
  if (!benchmark) {
    return [];
  }
  return [
    {
      benchmark_code: benchmark,
      benchmark_name: benchmark,
      is_assigned: true,
    } satisfies PerformanceBenchmarkOptionView,
  ];
}

export function buildReturnDecisionItems(
  presentation: PerformanceReturnPathPresentation,
  hasRenderableReturnPath: boolean
) {
  const moneyWeightedMetric = presentation.metrics.find((metric) => metric.key === "mwrr");

  const summaryItems = [
    {
      key: "active-return",
      label: "Active Return",
      value: presentation.activeReturnValue,
    },
    {
      key: "money-weighted-return",
      label: "Money-Weighted Return",
      value: moneyWeightedMetric?.value?.toString() ?? "Unavailable",
      definition: moneyWeightedMetric?.definition,
    },
    {
      key: "portfolio-return",
      label: "Portfolio Return",
      value: presentation.portfolioReturnValue,
    },
    {
      key: "benchmark-return",
      label: "Benchmark Return",
      value: presentation.benchmarkReturnValue,
    },
  ];

  const outcomeItems = presentation.metrics.filter((metric) =>
    hasRenderableReturnPath
      ? !["portfolio-return", "benchmark-return", "active-return", "mwrr"].includes(metric.key)
      : !["portfolio-return", "benchmark-return", "active-return"].includes(metric.key)
  );

  return { summaryItems, outcomeItems };
}

export function buildChartLegendItems({
  hasBenchmarkSeries,
  hasActiveSeries,
}: {
  hasBenchmarkSeries: boolean;
  hasActiveSeries: boolean;
}) {
  return [
    {
      key: "portfolio",
      label: "Portfolio",
      className: "performance-chart-legend-item-portfolio",
    },
    ...(hasBenchmarkSeries
      ? [
          {
            key: "benchmark",
            label: "Benchmark",
            className: "performance-chart-legend-item-benchmark",
          },
        ]
      : []),
    ...(hasActiveSeries
      ? [
          {
            key: "active",
            label: "Active",
            className: "performance-chart-legend-item-active",
          },
        ]
      : []),
  ];
}

export function resolveWindowAndBasisLabels({
  period,
  detailBasis,
  startDate,
  endDate,
}: {
  period: string;
  detailBasis: string;
  startDate?: string;
  endDate?: string;
}) {
  const resolvedWindowLabel =
    startDate && endDate ? `${formatDate(startDate)} - ${formatDate(endDate)}` : period;

  return {
    resolvedWindowLabel,
    resolvedBasisLabel: detailBasis === "GROSS" ? "Gross" : "Net",
  };
}

export function buildObservationCountLabel(observationCount: number) {
  return observationCount > 0
    ? `${observationCount} published observations remain visible.`
    : "No published return observations are exposed for this resolved window.";
}

export function resolveChartViewMode({
  preferredMode,
  hasBenchmarkSeries,
  hasActiveSeries,
}: {
  preferredMode?: PerformanceChartViewMode;
  hasBenchmarkSeries: boolean;
  hasActiveSeries: boolean;
}): PerformanceChartViewMode {
  const requestedMode = preferredMode ?? (hasBenchmarkSeries && hasActiveSeries ? "combined" : "absolute");

  if (requestedMode === "relative") {
    if (hasActiveSeries) {
      return "relative";
    }
    return hasBenchmarkSeries ? "combined" : "absolute";
  }

  if (requestedMode === "combined") {
    return hasBenchmarkSeries ? "combined" : "absolute";
  }

  return "absolute";
}

export function buildPerformanceControlSelectionPatch({
  patch,
  portfolioId,
  period,
  detailBasis,
  contributionDimension,
  attributionDimension,
  chartFrequency,
  benchmark,
  reportStartDate,
  reportEndDate,
}: {
  patch: PerformanceControlPatch;
  portfolioId: string;
  period: string;
  detailBasis: string;
  contributionDimension: string;
  attributionDimension: string;
  chartFrequency: string;
  benchmark?: string;
  reportStartDate: string;
  reportEndDate: string;
}) {
  return {
    portfolioId,
    period,
    detailBasis,
    contributionDimension,
    attributionDimension,
    chartFrequency,
    benchmark,
    reportStartDate,
    reportEndDate,
    ...patch,
  } satisfies PerformanceControlPatch;
}

export function hasBenchmarkReturnSeries(points: PerformanceChartPoint[]) {
  return points.some(
    (point) =>
      point.benchmark_return_pct !== null || point.cumulative_benchmark_return_pct !== null
  );
}

export function hasActiveReturnSeries(points: PerformanceChartPoint[]) {
  return points.some(
    (point) =>
      resolveActivePeriodReturn(point) !== null || resolveActiveCumulativeReturn(point) !== null
  );
}
