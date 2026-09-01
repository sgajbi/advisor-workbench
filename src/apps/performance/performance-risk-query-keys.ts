import type { WorkbenchPerformanceWorkspace } from "@/features/workbench/types";

export type PerformanceRiskQueryContext = Readonly<{
  portfolioId: string;
  period: string;
  reportStartDate: string | null;
  reportEndDate: string | null;
  asOfDate: string;
  reportingCurrency: string;
  benchmark: string | null;
}>;

export const performanceRiskQueryKeys = {
  all: ["performance", "risk"] as const,
  portfolio: (portfolioId: string) =>
    ["performance", "risk", portfolioId] as const,
  review: (context: PerformanceRiskQueryContext) =>
    [
      ...performanceRiskQueryKeys.portfolio(context.portfolioId),
      {
        period: context.period,
        reportStartDate: context.reportStartDate,
        reportEndDate: context.reportEndDate,
        asOfDate: context.asOfDate,
        reportingCurrency: context.reportingCurrency,
        benchmark: context.benchmark,
      },
    ] as const,
  riskSummary: (context: PerformanceRiskQueryContext, detailBasis: string) =>
    [
      ...performanceRiskQueryKeys.review(context),
      "summary",
      { detailBasis },
    ] as const,
  concentration: (context: PerformanceRiskQueryContext) =>
    [...performanceRiskQueryKeys.review(context), "concentration"] as const,
  drawdown: (
    context: PerformanceRiskQueryContext,
    detailBasis: string,
    includeUnderwaterSeries: boolean,
  ) =>
    [
      ...performanceRiskQueryKeys.review(context),
      "drawdown",
      { detailBasis, includeUnderwaterSeries },
    ] as const,
  rolling: (
    context: PerformanceRiskQueryContext,
    detailBasis: string,
    includeTimeSeries: boolean,
  ) =>
    [
      ...performanceRiskQueryKeys.review(context),
      "rolling",
      { detailBasis, includeTimeSeries },
    ] as const,
  attribution: (
    context: PerformanceRiskQueryContext,
    detailBasis: string,
    attributionType: string,
    groupingDimension: string,
  ) =>
    [
      ...performanceRiskQueryKeys.review(context),
      "attribution",
      { detailBasis, attributionType, groupingDimension },
    ] as const,
};

export function buildPerformanceRiskQueryContext(
  workspace: WorkbenchPerformanceWorkspace,
  period: string,
): PerformanceRiskQueryContext {
  const explicitWindow = period === "EXPLICIT";
  return {
    portfolioId: workspace.portfolio.portfolio_id,
    period,
    reportStartDate: explicitWindow
      ? workspace.report_start_date?.trim() || null
      : null,
    reportEndDate: explicitWindow
      ? workspace.report_end_date?.trim() || null
      : null,
    asOfDate: workspace.report_end_date?.trim() || workspace.as_of_date,
    reportingCurrency: workspace.portfolio.base_currency,
    benchmark: workspace.benchmark_code ?? null,
  };
}
