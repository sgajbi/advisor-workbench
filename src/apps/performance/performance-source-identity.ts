import type {
  WorkbenchPerformanceWorkspaceDetails,
  WorkbenchPerformanceWorkspaceSummary
} from "@/features/workbench/types";
import {
  arePerformanceReviewContextsCoherent,
  isPerformanceReviewContextCurrent,
  type PerformanceReviewContextSource,
} from "./performance-review-context";

export type PerformanceSourceIdentity = Readonly<{
  portfolioId: string;
  period?: string;
  reportStartDate?: string;
  reportEndDate?: string;
  asOfDate?: string;
  reportingCurrency?: string;
  detailBasis?: string;
  contributionDimension?: string;
  attributionDimension?: string;
  chartFrequency?: string;
  benchmark?: string | null;
}>;

type PerformanceAnalyticalSource = PerformanceReviewContextSource &
  Readonly<{
    portfolio_id: string;
    period: string;
    report_start_date?: string | null;
    report_end_date?: string | null;
    detail_basis: string;
    contribution_dimension?: string;
    attribution_dimension: string;
    chart_frequency: string;
    benchmark_code: string | null;
    requested_chart_frequency_supported?: boolean;
    requested_contribution_dimension_supported?: boolean;
    requested_attribution_dimension_supported?: boolean;
  }>;

function confirmsRequestedWindow(
  source: Readonly<{
    period: string;
    report_start_date?: string | null;
    report_end_date?: string | null;
    effective_as_of_date?: string | null;
  }>,
  identity: PerformanceSourceIdentity
): boolean {
  if (identity.period !== "EXPLICIT") {
    return source.report_end_date === source.effective_as_of_date;
  }
  return (
    Boolean(identity.reportStartDate) &&
    Boolean(identity.reportEndDate) &&
    source.report_start_date === identity.reportStartDate &&
    source.report_end_date === identity.reportEndDate
  );
}

export function isPerformanceAnalyticalSourceCurrent(
  source: PerformanceAnalyticalSource,
  identity: PerformanceSourceIdentity,
): boolean {
  return (
    source.portfolio_id === identity.portfolioId &&
    (!identity.period || source.period === identity.period) &&
    confirmsRequestedWindow(source, identity) &&
    (!identity.detailBasis || source.detail_basis === identity.detailBasis) &&
    (!identity.contributionDimension ||
      source.contribution_dimension === undefined ||
      isPerformanceRequestedValueCurrent(
        source.contribution_dimension,
        identity.contributionDimension,
        source.requested_contribution_dimension_supported,
      )) &&
    isPerformanceRequestedValueCurrent(
      source.attribution_dimension,
      identity.attributionDimension,
      source.requested_attribution_dimension_supported,
    ) &&
    isPerformanceRequestedValueCurrent(
      source.chart_frequency,
      identity.chartFrequency,
      source.requested_chart_frequency_supported,
    ) &&
    (identity.benchmark === undefined ||
      source.benchmark_code === identity.benchmark) &&
    isPerformanceReviewContextCurrent(source, identity)
  );
}

export function isPerformanceRequestedValueCurrent(
  actual: string,
  requested: string | undefined,
  requestedValueSupported: boolean | undefined,
): boolean {
  return !requested || actual === requested || requestedValueSupported === false;
}

export function arePerformanceObservationWindowsCurrent(
  rows: ReadonlyArray<{
    frequency: string;
    period_start?: string | null;
    period_end?: string | null;
  }>,
  source: Readonly<{
    chart_frequency: string;
    report_start_date?: string | null;
    report_end_date?: string | null;
  }>,
): boolean {
  const reportStartDate = source.report_start_date?.trim();
  const reportEndDate = source.report_end_date?.trim();
  if (!reportStartDate || !reportEndDate) {
    return false;
  }
  let previousPeriodEnd: string | null = null;
  for (const row of rows) {
    const periodStart = row.period_start?.trim();
    const periodEnd = row.period_end?.trim();
    if (!periodStart || !periodEnd) {
      return false;
    }
    if (
      row.frequency !== source.chart_frequency ||
      periodStart < reportStartDate ||
      periodEnd > reportEndDate ||
      periodStart > periodEnd ||
      (previousPeriodEnd !== null && periodStart <= previousPeriodEnd)
    ) {
      return false;
    }
    previousPeriodEnd = periodEnd;
  }
  return true;
}

export function isPerformanceSummarySourceCurrent(
  summary: WorkbenchPerformanceWorkspaceSummary,
  identity: PerformanceSourceIdentity,
): boolean {
  return (
    isPerformanceSummaryPortfolioIdentityCurrent(
      summary,
      identity.portfolioId,
    ) &&
    (!identity.period || summary.period === identity.period) &&
    confirmsRequestedWindow(summary, identity) &&
    (!identity.detailBasis || summary.detail_basis === identity.detailBasis) &&
    isPerformanceRequestedValueCurrent(
      summary.chart_frequency,
      identity.chartFrequency,
      summary.requested_chart_frequency_supported,
    ) &&
    (identity.benchmark === undefined ||
      summary.benchmark_code === identity.benchmark) &&
    isPerformanceReviewContextCurrent(summary, identity)
  );
}

export function isPerformanceSummaryPortfolioIdentityCurrent(
  summary: WorkbenchPerformanceWorkspaceSummary,
  portfolioId: string
): boolean {
  return summary.portfolio_id === portfolioId && summary.portfolio.portfolio_id === portfolioId;
}

export function isPerformanceDetailsSourceCurrent(
  details: WorkbenchPerformanceWorkspaceDetails,
  identity: PerformanceSourceIdentity,
): boolean {
  return (
    Boolean(details.contribution_dimension) &&
    isPerformanceAnalyticalSourceCurrent(details, identity) &&
    arePerformanceObservationWindowsCurrent(details.net_chart, details) &&
    arePerformanceObservationWindowsCurrent(details.gross_chart, details)
  );
}

export function doPerformanceSummaryAndDetailsShareReviewContext(
  summary: WorkbenchPerformanceWorkspaceSummary,
  details: WorkbenchPerformanceWorkspaceDetails
): boolean {
  return arePerformanceReviewContextsCoherent(summary, details);
}
