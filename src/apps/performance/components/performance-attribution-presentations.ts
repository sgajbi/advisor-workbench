import type {
  AttributionSummaryView,
  PerformanceBenchmarkOptionView,
  WorkbenchPerformanceAttributionTrend,
} from "@/features/workbench/types";

import { formatDate, formatLabel, formatPct } from "../formatters";
import {
  getPerformanceBenchmarkContextValue,
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

function formatAttributionModelLabel(model?: string | null) {
  switch (model?.trim().toUpperCase()) {
    case "BF":
      return "Brinson-Fachler";
    default:
      return model ? formatLabel(model) : "Unavailable";
  }
}

function formatAttributionLinkingLabel(linking?: string | null) {
  switch (linking?.trim().toUpperCase()) {
    case "CARINO":
      return "Carino";
    default:
      return linking ? formatLabel(linking) : "Unavailable";
  }
}

export function getAttributionReconciliationText(
  attribution:
    | AttributionSummaryView
    | {
        active_return_pct: number | null | undefined;
        sum_of_effects_pct?: number | null | undefined;
        total_effect_pct?: number | null | undefined;
        residual_pct: number | null | undefined;
      }
) {
  const effectsPct =
    "sum_of_effects_pct" in attribution
      ? attribution.sum_of_effects_pct
      : attribution.total_effect_pct;

  return {
    headline:
      getAttributionResidualAssessment(attribution.residual_pct) ??
      "Attribution reconciliation unavailable",
    detail: [
      attribution.active_return_pct != null
        ? `Active return ${formatPct(attribution.active_return_pct)}`
        : null,
      effectsPct != null ? `effects sum ${formatPct(effectsPct)}` : null,
      attribution.residual_pct != null ? `residual ${formatPct(attribution.residual_pct)}` : null,
    ]
      .filter(Boolean)
      .join(" • "),
  };
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
          })
        : "Unassigned",
    },
    {
      label: "Benchmark Source",
      value: attribution?.benchmark_return_source
        ? formatLabel(attribution.benchmark_return_source)
        : "Unavailable",
    },
    {
      label: "Attribution Model",
      value: formatAttributionModelLabel(attribution?.model),
    },
    {
      label: "Linking Method",
      value: formatAttributionLinkingLabel(attribution?.linking),
    },
  ];
}

export function getAttributionDetailSummaryItems(
  attribution: AttributionSummaryView | null | undefined,
  _benchmarkOptions: PerformanceBenchmarkOptionView[] = []
) {
  void _benchmarkOptions;

  if (!attribution?.benchmark_id) {
    return [];
  }

  return [
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
      label: "Period Range",
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
      label: "Total Effect",
      value: formatPct(latestRow.total_effect_pct),
      support: reconciliationSupport.effectsSumSupport,
    },
    {
      label: "Active Return",
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
