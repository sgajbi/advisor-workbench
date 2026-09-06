import type { PortfolioSummaryDetailsRequest } from "./portfolio-workspace-client-view-model";
import type { PortfolioWorkspace } from "./types";

type PortfolioSummaryDetailsParams = PortfolioSummaryDetailsRequest["params"];

export const portfolioQueryKeys = {
  all: ["portfolio"] as const,
  workspaceRoot: (portfolioId: string) =>
    ["portfolio", "workspace", portfolioId] as const,
  workspaceSource: (portfolioId: string, sourceGeneration: string) =>
    [
      ...portfolioQueryKeys.workspaceRoot(portfolioId),
      "shell",
      { sourceGeneration },
    ] as const,
  reviewContextIntent: () =>
    ["portfolio", "workspace", "review-context-intent"] as const,
  activeShellGeneration: (portfolioId: string) =>
    ["portfolio", "workspace", portfolioId, "active-shell-generation"] as const,
  transactionRecord: (
    portfolioId: string,
    transactionId: string,
    asOfDate: string,
    reportingCurrency: string,
  ) =>
    [
      "portfolio",
      "transactions",
      portfolioId,
      transactionId,
      { asOfDate, reportingCurrency, includeProjected: false },
    ] as const,
  summaryDetailsRoot: (portfolioId: string) =>
    ["portfolio", "workspace", portfolioId, "summary-details"] as const,
  summaryDetails: (
    portfolioId: string,
    sourceGeneration: string,
    params: PortfolioSummaryDetailsParams,
  ) =>
    [
      ...portfolioQueryKeys.summaryDetailsRoot(portfolioId),
      {
        sourceGeneration,
        asOfDate: params.asOfDate ?? null,
        reportingCurrency: params.reportingCurrency ?? null,
        includeProjected: params.includeProjected ?? false,
        timeWindow: params.timeWindow,
        reportStartDate: params.reportStartDate,
        reportEndDate: params.reportEndDate,
        usesCustomDateRange: params.usesCustomDateRange ?? false,
      },
    ] as const,
};

export function buildPortfolioWorkspaceSourceGeneration(
  selectedPortfolioId: string | null,
  workspace: PortfolioWorkspace | null,
): string {
  return JSON.stringify({
    selectedPortfolioId,
    initialWorkspace: workspace,
  });
}
