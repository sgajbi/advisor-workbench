export const PERIOD_OPTIONS = ["MTD", "QTD", "YTD", "1Y", "3Y", "5Y"] as const;
export const BASIS_OPTIONS = ["NET", "GROSS"] as const;
export const DIMENSION_OPTIONS = ["asset_class", "sector", "country"] as const;
export const CHART_FREQUENCY_OPTIONS = [
  { value: "monthly", label: "Monthly" },
  { value: "quarterly", label: "Quarterly" },
] as const;
export const BENCHMARK_OPTIONS = [
  { value: "", label: "No Benchmark" },
  { value: "BMK_GLOBAL_BALANCED_60_40", label: "Global Balanced 60/40" },
] as const;

export function buildPerformanceHref({
  portfolioId,
  period,
  detailBasis,
  detailDimension,
  chartFrequency,
  benchmark,
}: {
  portfolioId: string;
  period: string;
  detailBasis: string;
  detailDimension: string;
  chartFrequency: string;
  benchmark?: string;
}) {
  const query = new URLSearchParams();
  query.set("portfolioId", portfolioId);
  query.set("period", period);
  query.set("detailBasis", detailBasis);
  query.set("detailDimension", detailDimension);
  query.set("chartFrequency", chartFrequency);
  if (benchmark) {
    query.set("benchmark", benchmark);
  }
  return `/performance?${query.toString()}`;
}
