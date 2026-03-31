import type {
  AttributionSummaryView,
  WorkbenchPerformanceAttributionTrend,
} from "@/features/workbench/types";

import { formatDate, formatLabel, formatPct } from "../formatters";

export function getAttributionDetailContextItems(
  attribution: AttributionSummaryView | null | undefined
) {
  return [
    {
      label: "Benchmark",
      value: attribution?.benchmark_id
        ? formatLabel(attribution.benchmark_id)
        : "Unassigned",
    },
    {
      label: "Source",
      value: attribution?.benchmark_return_source
        ? formatLabel(attribution.benchmark_return_source)
        : "Unavailable",
    },
    {
      label: "Model",
      value: attribution?.model ? formatLabel(attribution.model) : "Unavailable",
    },
    {
      label: "Linking",
      value: attribution?.linking ? formatLabel(attribution.linking) : "Unavailable",
    },
  ];
}

export function getAttributionDetailSummaryItems(
  attribution: AttributionSummaryView | null | undefined
) {
  if (!attribution?.benchmark_id) {
    return [];
  }

  return [
    {
      label: "Benchmark",
      value: formatLabel(attribution.benchmark_id),
    },
    {
      label: "Active Return",
      value: formatPct(attribution.active_return_pct),
    },
    {
      label: "Effects Sum",
      value: formatPct(attribution.sum_of_effects_pct),
    },
    {
      label: "Residual",
      value: formatPct(attribution.residual_pct),
    },
  ];
}

export function getAttributionTrendContextItems({
  trend,
  detailBasis,
  attributionDimension,
  benchmark,
  period,
}: {
  trend: WorkbenchPerformanceAttributionTrend | null;
  detailBasis: string;
  attributionDimension: string;
  benchmark?: string;
  period: string;
}) {
  const resolvedWindowLabel =
    trend?.report_start_date && trend?.report_end_date
      ? `${formatDate(trend.report_start_date)} - ${formatDate(trend.report_end_date)}`
      : period;

  return [
    {
      label: "Resolved window",
      value: resolvedWindowLabel,
    },
    {
      label: "Basis",
      value: detailBasis,
    },
    {
      label: "Benchmark",
      value: trend?.benchmark_code
        ? formatLabel(trend.benchmark_code)
        : benchmark
          ? formatLabel(benchmark)
          : "Unassigned",
    },
    {
      label: "Segment",
      value: formatLabel(trend?.attribution_dimension ?? attributionDimension),
    },
  ];
}

export function getAttributionTrendSummaryItems(
  trend: WorkbenchPerformanceAttributionTrend | null
) {
  const latestRow = trend?.rows?.at(-1);
  if (!latestRow) {
    return [];
  }

  return [
    {
      label: "Latest Total Effect",
      value: formatPct(latestRow.total_effect_pct),
    },
    {
      label: "Latest Active Return",
      value: formatPct(latestRow.active_return_pct),
    },
    {
      label: "Cumulative Total",
      value: formatPct(latestRow.cumulative_total_effect_pct),
    },
    {
      label: "Residual",
      value: formatPct(latestRow.residual_pct),
    },
  ];
}
