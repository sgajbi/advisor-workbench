import type {
  AttributionSummaryView,
  PerformanceBenchmarkOptionView,
  WorkbenchPerformanceAttributionTrend,
  WorkbenchOverview,
} from "@/features/workbench/types";

import { formatLabel, formatPct } from "../formatters";
import { PERFORMANCE_RETURN_LABELS } from "../performance-terminology";
import { getPerformanceBenchmarkContextValue } from "./performance-summary-context-helpers";

function getAttributionResidualAssessment(
  attribution:
    | AttributionSummaryView
    | {
        residual_pct: number | null | undefined;
        residual_materiality?: AttributionSummaryView["residual_materiality"];
      }
): string | null {
  const materiality = attribution.residual_materiality;
  if (materiality?.classification) {
    if (materiality.classification === "immaterial") {
      return "Residual immaterial";
    }
    if (materiality.classification === "watch") {
      return "Residual under review";
    }
    if (materiality.classification === "material") {
      return "Material residual";
    }
  }
  const residualPct = attribution.residual_pct;
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
        residual_materiality?: AttributionSummaryView["residual_materiality"];
      }
) {
  const effectsPct =
    "sum_of_effects_pct" in attribution
      ? attribution.sum_of_effects_pct
      : attribution.total_effect_pct;

  return {
    headline:
      getAttributionResidualAssessment(attribution) ??
      "Attribution reconciliation unavailable",
    detail: [
      attribution.active_return_pct != null
        ? `Active return ${formatPct(attribution.active_return_pct)}`
        : null,
      effectsPct != null ? `effects sum ${formatPct(effectsPct)}` : null,
      attribution.residual_pct != null ? `residual ${formatPct(attribution.residual_pct)}` : null,
      attribution.residual_materiality?.treatment
        ? `treatment ${formatLabel(attribution.residual_materiality.treatment)}`
        : null,
    ]
      .filter(Boolean)
      .join(" • "),
  };
}

export function getAttributionSourcePosture(
  attribution: AttributionSummaryView | null | undefined
): { state: "supported" | "partial" | "unavailable"; reason: string | null } | null {
  if (!attribution) {
    return null;
  }
  const status = attribution.status?.toLowerCase();
  const firstReason = attribution.reasons?.[0]?.message;
  const reasonCode = attribution.reason_codes?.[0];
  const reason = firstReason ?? (reasonCode ? formatLabel(reasonCode) : null);

  if (status === "partial" || status === "warning") {
    return { state: "partial", reason };
  }
  if (status === "unavailable" || status === "invalid") {
    return { state: "unavailable", reason };
  }
  return { state: "supported", reason };
}

export function getAttributionSupportabilityLine(
  attribution: AttributionSummaryView | null | undefined
): string | null {
  if (!attribution?.supportability_evidence) {
    return null;
  }
  const evidence = attribution.supportability_evidence;
  const counts = [
    evidence.portfolio_only_group_count
      ? `${evidence.portfolio_only_group_count} portfolio-only group`
      : null,
    evidence.benchmark_only_group_count
      ? `${evidence.benchmark_only_group_count} benchmark-only group`
      : null,
    evidence.unclassified_group_count
      ? `${evidence.unclassified_group_count} unclassified group`
      : null,
    evidence.missing_benchmark_return_count
      ? `${evidence.missing_benchmark_return_count} missing benchmark return`
      : null,
    evidence.negative_weight_count ? `${evidence.negative_weight_count} negative weight` : null,
  ].filter(Boolean);

  if (counts.length) {
    return counts.join(" • ");
  }
  return `Linking ${formatLabel(evidence.linking_status)} • currency ${formatLabel(
    evidence.currency_attribution_status
  )}`;
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
      label: "Total effect",
      value: formatPct(latestRow.total_effect_pct),
      support:
        latestRow.active_return_pct != null
          ? `${PERFORMANCE_RETURN_LABELS.activeReturn} ${formatPct(latestRow.active_return_pct)}`
          : null,
    },
    {
      label: "Cumulative effect",
      value: formatPct(latestRow.cumulative_total_effect_pct),
    },
  ];
}

export function getAttributionTrendUnavailableBody(
  trend: WorkbenchPerformanceAttributionTrend | null
): string {
  const upstreamFailure = getMissingClassificationFailure(
    trend?.partial_failures,
    trend?.attribution_dimension
  );

  if (upstreamFailure?.detail) {
    const requestedDimension = formatLabel(trend?.attribution_dimension ?? "selection");
    return `${requestedDimension} attribution trend is unavailable because the selected benchmark does not expose complete ${requestedDimension.toLowerCase()} classification for every component.`;
  }

  if (trend?.requested_reporting_currency) {
    const requestedCurrency = trend.requested_reporting_currency;
    const effectiveCurrency = trend.effective_reporting_currency;

    if (trend.reporting_currency_state === "rejected") {
      return `Attribution history remains unavailable because the requested ${requestedCurrency} restatement was not accepted. Source evidence remains in ${effectiveCurrency}.`;
    }

    if (trend.reporting_currency_state === "accepted_unverified") {
      return `Attribution history is unavailable for this selection. The requested ${requestedCurrency} restatement is not source-verified, so no restated history has been inferred.`;
    }

    if (trend.reporting_currency_state === "unavailable") {
      return `Attribution history is unavailable because reporting-currency evidence for ${requestedCurrency} could not be confirmed.`;
    }
  }

  return "Attribution trend is not available for the current selection.";
}

export function getAttributionDetailClassificationGapBody(args: {
  partialFailures?: WorkbenchOverview["partial_failures"] | null;
  attributionDimension?: string | null;
}): string | null {
  const upstreamFailure = getMissingClassificationFailure(
    args.partialFailures,
    args.attributionDimension
  );

  if (!upstreamFailure?.detail) {
    return null;
  }

  const requestedDimension = formatLabel(args.attributionDimension ?? "selection");
  return `${requestedDimension} attribution detail is unavailable because the selected benchmark does not expose complete ${requestedDimension.toLowerCase()} classification for every component.`;
}

function getMissingClassificationFailure(
  partialFailures: WorkbenchOverview["partial_failures"] | null | undefined,
  requestedDimension?: string | null
) {
  const normalizedDimension = requestedDimension?.toLowerCase();
  return partialFailures?.find((failure) => {
    if (
      failure.source_service !== "lotus-performance" ||
      failure.error_code !== "HTTP_422" ||
      typeof failure.detail !== "string"
    ) {
      return false;
    }

    const detail = failure.detail.toLowerCase();
    if (!detail.includes("missing classification label")) {
      return false;
    }

    if (!normalizedDimension) {
      return true;
    }

    return detail.includes(`for ${normalizedDimension}`);
  });
}
