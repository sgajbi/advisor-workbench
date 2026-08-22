import type {
  WorkbenchPerformanceWorkspaceDetails,
  WorkbenchPerformanceWorkspaceSummary,
} from "@/features/workbench/types";

export type PerformanceSourceIdentity = Readonly<{
  portfolioId: string;
  asOfDate?: string;
  period?: string;
  reportingCurrency?: string;
}>;

export function isPerformanceSummarySourceCurrent(
  summary: WorkbenchPerformanceWorkspaceSummary,
  identity: PerformanceSourceIdentity,
): boolean {
  return (
    summary.portfolio_id === identity.portfolioId &&
    summary.portfolio.portfolio_id === identity.portfolioId &&
    (!identity.asOfDate || summary.as_of_date === identity.asOfDate) &&
    (!identity.reportingCurrency ||
      summary.portfolio.base_currency === identity.reportingCurrency)
  );
}

export function isPerformanceDetailsSourceCurrent(
  details: WorkbenchPerformanceWorkspaceDetails,
  identity: PerformanceSourceIdentity,
): boolean {
  return (
    details.portfolio_id === identity.portfolioId &&
    (!identity.asOfDate || details.as_of_date === identity.asOfDate) &&
    (!identity.period || details.period === identity.period)
  );
}
