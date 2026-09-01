import type { PortfolioSummaryDetailsRequest } from "./portfolio-workspace-client-view-model";

type PortfolioSummaryDetailsParams = PortfolioSummaryDetailsRequest["params"];

export const portfolioQueryKeys = {
  all: ["portfolio"] as const,
  workspace: (portfolioId: string) =>
    ["portfolio", "workspace", portfolioId] as const,
  summaryDetailsRoot: (portfolioId: string) =>
    ["portfolio", "workspace", portfolioId, "summary-details"] as const,
  summaryDetails: (
    portfolioId: string,
    params: PortfolioSummaryDetailsParams,
  ) =>
    [
      ...portfolioQueryKeys.summaryDetailsRoot(portfolioId),
      {
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
