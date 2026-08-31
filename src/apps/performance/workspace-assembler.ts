import type {
  WorkbenchPerformanceWorkspace,
  WorkbenchPerformanceWorkspaceDetails,
  WorkbenchPerformanceWorkspaceSummary
} from "@/features/workbench/types";
import { arePerformanceReviewContextsCoherent } from "./performance-review-context";

export function assemblePerformanceWorkspace(
  summary: WorkbenchPerformanceWorkspaceSummary,
  details: WorkbenchPerformanceWorkspaceDetails | null
): WorkbenchPerformanceWorkspace {
  if (details && !arePerformanceReviewContextsCoherent(summary, details)) {
    throw new TypeError(
      "Performance summary and details do not share one source-confirmed review context."
    );
  }

  return {
    correlation_id: details?.correlation_id ?? summary.correlation_id,
    contract_version: details?.contract_version ?? summary.contract_version,
    portfolio_id: summary.portfolio_id,
    as_of_date: details?.as_of_date ?? summary.as_of_date,
    requested_as_of_date: summary.requested_as_of_date,
    effective_as_of_date: summary.effective_as_of_date,
    requested_reporting_currency: summary.requested_reporting_currency,
    effective_reporting_currency: summary.effective_reporting_currency,
    reporting_currency_state: summary.reporting_currency_state,
    period: details?.period ?? summary.period,
    report_start_date: details?.report_start_date ?? summary.report_start_date,
    report_end_date: details?.report_end_date ?? summary.report_end_date,
    chart_frequency: details?.chart_frequency ?? summary.chart_frequency,
    contribution_dimension: details?.contribution_dimension ?? "asset_class",
    attribution_dimension: details?.attribution_dimension ?? "asset_class",
    detail_basis: details?.detail_basis ?? summary.detail_basis,
    requested_chart_frequency_supported:
      details?.requested_chart_frequency_supported ??
      summary.requested_chart_frequency_supported ??
      true,
    requested_contribution_dimension_supported:
      details?.requested_contribution_dimension_supported ??
      summary.requested_contribution_dimension_supported ??
      true,
    requested_attribution_dimension_supported:
      details?.requested_attribution_dimension_supported ??
      summary.requested_attribution_dimension_supported ??
      true,
    segment: details?.segment,
    benchmark_code: details?.benchmark_code ?? summary.benchmark_code,
    benchmark_options: summary.benchmark_options,
    capabilities: details?.capabilities ?? summary.capabilities,
    evidence_view: details?.evidence_view ?? summary.evidence_view ?? null,
    portfolio: summary.portfolio,
    overview: summary.overview,
    net_performance: summary.net_performance,
    gross_performance: summary.gross_performance,
    money_weighted_return: summary.money_weighted_return,
    net_chart: details?.net_chart ?? [],
    gross_chart: details?.gross_chart ?? [],
    contribution: details?.contribution ?? null,
    attribution: details?.attribution ?? null,
    warnings: mergeUnique(summary.warnings, details?.warnings ?? []),
    partial_failures: mergePartialFailures(
      summary.partial_failures,
      details?.partial_failures ?? []
    )
  };
}

function mergeUnique(left: string[], right: string[]): string[] {
  return [...new Set([...left, ...right])];
}

function mergePartialFailures(
  left: WorkbenchPerformanceWorkspaceSummary["partial_failures"],
  right: WorkbenchPerformanceWorkspaceDetails["partial_failures"]
) {
  const merged = [...left];
  for (const item of right) {
    const exists = merged.some(
      (current) =>
        current.source_service === item.source_service &&
        current.error_code === item.error_code &&
        current.detail === item.detail
    );
    if (!exists) {
      merged.push(item);
    }
  }
  return merged;
}
