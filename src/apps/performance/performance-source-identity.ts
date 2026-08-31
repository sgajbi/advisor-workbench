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
    return !identity.asOfDate || source.report_end_date === source.effective_as_of_date;
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
      source.contribution_dimension === identity.contributionDimension) &&
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

export function isPerformanceSummarySourceCurrent(
  summary: WorkbenchPerformanceWorkspaceSummary,
  identity: PerformanceSourceIdentity
): boolean {
  return (
    isPerformanceSummaryPortfolioIdentityCurrent(summary, identity.portfolioId) &&
    (!identity.period || summary.period === identity.period) &&
    confirmsRequestedWindow(summary, identity) &&
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
  identity: PerformanceSourceIdentity
): boolean {
  return (
    details.portfolio_id === identity.portfolioId &&
    (!identity.period || details.period === identity.period) &&
    confirmsRequestedWindow(details, identity) &&
    isPerformanceReviewContextCurrent(details, identity)
  );
}

export function doPerformanceSummaryAndDetailsShareReviewContext(
  summary: WorkbenchPerformanceWorkspaceSummary,
  details: WorkbenchPerformanceWorkspaceDetails
): boolean {
  return arePerformanceReviewContextsCoherent(summary, details);
}
