import type {
  AttributionSummaryView,
  PerformanceBenchmarkOptionView,
  WorkbenchPerformanceAttributionTrend,
} from "@/features/workbench/types";

import { formatPct } from "../formatters";
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
      label: "Total Effect",
      value: formatPct(latestRow.total_effect_pct),
      support:
        latestRow.active_return_pct != null
          ? `Active ${formatPct(latestRow.active_return_pct)}`
          : null,
    },
    {
      label: "Cumulative Total",
      value: formatPct(latestRow.cumulative_total_effect_pct),
    },
  ];
}
