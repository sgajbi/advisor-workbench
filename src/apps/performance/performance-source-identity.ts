import type {
  WorkbenchPerformanceWorkspaceDetails,
  WorkbenchPerformanceWorkspaceSummary
} from "@/features/workbench/types";
import {
  arePerformanceReviewContextsCoherent,
  isPerformanceReviewContextCurrent
} from "./performance-review-context";

export type PerformanceSourceIdentity = Readonly<{
  portfolioId: string;
  period?: string;
  reportStartDate?: string;
  reportEndDate?: string;
  asOfDate?: string;
  reportingCurrency?: string;
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
