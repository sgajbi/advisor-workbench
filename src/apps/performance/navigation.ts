export const PERIOD_OPTIONS = ["MTD", "QTD", "YTD", "1Y", "3Y", "5Y"] as const;
export const BASIS_OPTIONS = ["NET", "GROSS"] as const;
export const CONTRIBUTION_DIMENSION_OPTIONS = ["asset_class", "sector", "country"] as const;
export const ATTRIBUTION_DIMENSION_OPTIONS = [
  "asset_class",
  "sector",
  "country",
  "currency",
] as const;
export const CHART_FREQUENCY_OPTIONS = [
  { value: "monthly", label: "Monthly" },
  { value: "quarterly", label: "Quarterly" },
] as const;

export function buildPerformanceHref({
  portfolioId,
  period,
  detailBasis,
  contributionDimension,
  attributionDimension,
  chartFrequency,
  benchmark,
  reportStartDate,
  reportEndDate,
}: {
  portfolioId: string;
  period: string;
  detailBasis: string;
  contributionDimension: string;
  attributionDimension: string;
  chartFrequency: string;
  benchmark?: string;
  reportStartDate?: string;
  reportEndDate?: string;
}) {
  const query = new URLSearchParams();
  query.set("portfolioId", portfolioId);
  query.set("period", period);
  query.set("detailBasis", detailBasis);
  query.set("contributionDimension", contributionDimension);
  query.set("attributionDimension", attributionDimension);
  query.set("chartFrequency", chartFrequency);
  if (benchmark) {
    query.set("benchmark", benchmark);
  }
  if (reportStartDate) {
    query.set("reportStartDate", reportStartDate);
  }
  if (reportEndDate) {
    query.set("reportEndDate", reportEndDate);
  }
  return `/performance?${query.toString()}`;
}
