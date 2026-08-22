import type {
  WorkbenchPerformanceWorkspaceDetails,
  WorkbenchPerformanceWorkspaceSummary,
} from "@/features/workbench/types";

export type PerformanceSourceIdentity = Readonly<{
  portfolioId: string;
  period?: string;
  reportStartDate?: string;
  reportEndDate?: string;
}>;

function confirmsRequestedWindow(
  source: Readonly<{
    period: string;
    report_start_date?: string | null;
    report_end_date?: string | null;
  }>,
  identity: PerformanceSourceIdentity,
): boolean {
  if (identity.period !== "EXPLICIT") {
    return true;
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
  identity: PerformanceSourceIdentity,
): boolean {
  return (
    summary.portfolio_id === identity.portfolioId &&
    summary.portfolio.portfolio_id === identity.portfolioId &&
    (!identity.period || summary.period === identity.period) &&
    confirmsRequestedWindow(summary, identity)
  );
}

export function isPerformanceDetailsSourceCurrent(
  details: WorkbenchPerformanceWorkspaceDetails,
  identity: PerformanceSourceIdentity,
): boolean {
  return (
    details.portfolio_id === identity.portfolioId &&
    (!identity.period || details.period === identity.period) &&
    confirmsRequestedWindow(details, identity)
  );
}
