import type { PortfolioWorkspaceContext } from "./view-model";

export type PortfolioSummaryDetailsRequest = {
  key: string;
  params: {
    asOfDate?: string;
    reportingCurrency?: string;
    includeProjected?: boolean;
    timeWindow: PortfolioWorkspaceContext["timeWindow"];
    reportStartDate: string;
    reportEndDate: string;
    usesCustomDateRange?: boolean;
  };
};

export function buildPortfolioSummaryDetailsRequest(
  portfolioId: string,
  context: PortfolioWorkspaceContext
): PortfolioSummaryDetailsRequest {
  const params: PortfolioSummaryDetailsRequest["params"] = {
    asOfDate: context.selectedAsOfDate,
    reportingCurrency: context.selectedReportingCurrency,
    includeProjected: false,
    timeWindow: context.timeWindow,
    reportStartDate: context.effectivePeriodStartDate,
    reportEndDate: context.effectivePeriodEndDate,
    usesCustomDateRange: context.usesCustomDateRange,
  };

  return {
    key: [
      portfolioId,
      params.asOfDate,
      params.reportingCurrency,
      params.timeWindow,
      params.reportStartDate,
      params.reportEndDate,
      String(params.usesCustomDateRange),
    ].join(":"),
    params,
  };
}
