import type {
  WorkbenchPerformanceWorkspaceDetails,
  WorkbenchPerformanceWorkspaceSummary,
} from "@/features/workbench/types";

export type PerformanceSourceIdentity = Readonly<{
  portfolioId: string;
  period?: string;
}>;

export function isPerformanceSummarySourceCurrent(
  summary: WorkbenchPerformanceWorkspaceSummary,
  identity: PerformanceSourceIdentity,
): boolean {
  return (
    summary.portfolio_id === identity.portfolioId &&
    summary.portfolio.portfolio_id === identity.portfolioId &&
    (!identity.period || summary.period === identity.period)
  );
}

export function isPerformanceDetailsSourceCurrent(
  details: WorkbenchPerformanceWorkspaceDetails,
  identity: PerformanceSourceIdentity,
): boolean {
  return (
    details.portfolio_id === identity.portfolioId &&
    (!identity.period || details.period === identity.period)
  );
}
