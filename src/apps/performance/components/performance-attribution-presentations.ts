import type {
  AttributionSummaryView,
  PerformanceBenchmarkOptionView,
  WorkbenchPerformanceAttributionTrend,
} from "@/features/workbench/types";

import { formatDate, formatLabel, formatPct } from "../formatters";
import {
  getPerformanceBenchmarkContextValue,
  getPerformanceBenchmarkLabel,
} from "./performance-summary-context-helpers";

function getAttributionResidualAssessment(
  residualPct: number | null | undefined
): string | null {
  if (residualPct == null) {
    return null;
  }
  if (Math.abs(residualPct) < 0.005) {
    return "Residual de minimis";
  }
  return "Residual remains after effects";
}

function getAttributionReconciliationSupport({
  activeReturnPct,
  effectsSumPct,
  residualPct,
}: {
  activeReturnPct: number | null | undefined;
  effectsSumPct: number | null | undefined;
  residualPct: number | null | undefined;
}): {
  activeReturnSupport: string | null;
  effectsSumSupport: string | null;
  residualSupport: string | null;
} {
  return {
    activeReturnSupport:
      effectsSumPct != null || residualPct != null
        ? [effectsSumPct != null ? `Effects ${formatPct(effectsSumPct)}` : null, residualPct != null ? `Residual ${formatPct(residualPct)}` : null]
            .filter(Boolean)
            .join(" + ")
        : null,
    effectsSumSupport:
      activeReturnPct != null
        ? [getAttributionResidualAssessment(residualPct), `Active ${formatPct(activeReturnPct)}`]
            .filter(Boolean)
            .join(" • ")
        : getAttributionResidualAssessment(residualPct),
    residualSupport:
      activeReturnPct != null || effectsSumPct != null
        ? [
            getAttributionResidualAssessment(residualPct),
            activeReturnPct != null ? `Active ${formatPct(activeReturnPct)}` : null,
            effectsSumPct != null ? `Effects ${formatPct(effectsSumPct)}` : null,
          ]
            .filter(Boolean)
            .join(" • ")
        : getAttributionResidualAssessment(residualPct),
  };
}

export function getAttributionDetailContextItems(
  attribution: AttributionSummaryView | null | undefined,
  benchmarkOptions: PerformanceBenchmarkOptionView[] = []
) {
  return [
    {
      label: "Benchmark",
      value: attribution?.benchmark_id
        ? getPerformanceBenchmarkContextValue({
            benchmark: attribution.benchmark_id,
            benchmarkOptions,
            benchmarkReturnSource: attribution.benchmark_return_source,
          })
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
  attribution: AttributionSummaryView | null | undefined,
  benchmarkOptions: PerformanceBenchmarkOptionView[] = []
) {
  if (!attribution?.benchmark_id) {
    return [];
  }

  const reconciliationSupport = getAttributionReconciliationSupport({
    activeReturnPct: attribution.active_return_pct,
    effectsSumPct: attribution.sum_of_effects_pct,
    residualPct: attribution.residual_pct,
  });

  return [
    {
      label: "Benchmark",
      value: getPerformanceBenchmarkLabel(attribution.benchmark_id, benchmarkOptions),
    },
    {
      label: "Active Return",
      value: formatPct(attribution.active_return_pct),
      support: reconciliationSupport.activeReturnSupport,
    },
    {
      label: "Effects Sum",
      value: formatPct(attribution.sum_of_effects_pct),
      support: reconciliationSupport.effectsSumSupport,
    },
    {
      label: "Residual",
      value: formatPct(attribution.residual_pct),
      support: reconciliationSupport.residualSupport,
    },
  ];
}

export function getAttributionTrendContextItems({
  trend,
  detailBasis,
  attributionDimension,
  benchmark,
  benchmarkOptions = [],
  period,
}: {
  trend: WorkbenchPerformanceAttributionTrend | null;
  detailBasis: string;
  attributionDimension: string;
  benchmark?: string;
  benchmarkOptions?: PerformanceBenchmarkOptionView[];
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
        ? getPerformanceBenchmarkContextValue({
            benchmark: trend.benchmark_code,
            benchmarkOptions,
          })
        : benchmark
          ? getPerformanceBenchmarkContextValue({
              benchmark,
              benchmarkOptions,
            })
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

  const reconciliationSupport = getAttributionReconciliationSupport({
    activeReturnPct: latestRow.active_return_pct,
    effectsSumPct: latestRow.total_effect_pct,
    residualPct: latestRow.residual_pct,
  });

  return [
    {
      label: "Latest Total Effect",
      value: formatPct(latestRow.total_effect_pct),
      support: reconciliationSupport.effectsSumSupport,
    },
    {
      label: "Latest Active Return",
      value: formatPct(latestRow.active_return_pct),
      support: reconciliationSupport.activeReturnSupport,
    },
    {
      label: "Cumulative Total",
      value: formatPct(latestRow.cumulative_total_effect_pct),
    },
    {
      label: "Residual",
      value: formatPct(latestRow.residual_pct),
      support: reconciliationSupport.residualSupport,
    },
  ];
}
