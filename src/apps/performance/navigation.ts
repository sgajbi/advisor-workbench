import { CANONICAL_PERFORMANCE_PERIOD_OPTIONS } from "./periods";
import type { PerformanceWorkspaceMode } from "./performance-workspace-modes";
import {
  isReviewPeriod,
  serializeReviewContext,
} from "@/shell/review-context";

export const PERIOD_OPTIONS = CANONICAL_PERFORMANCE_PERIOD_OPTIONS;
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
  mode,
  asOfDate,
  reportingCurrency,
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
  mode?: PerformanceWorkspaceMode;
  asOfDate?: string;
  reportingCurrency?: string;
}) {
  if (!isReviewPeriod(period)) {
    throw new TypeError("Performance period must be a governed review period.");
  }

  const query = serializeReviewContext({
    portfolioId,
    asOfDate,
    period,
    reportingCurrency,
  });
  const isExplicitWindow = period === "EXPLICIT";
  if (mode && mode !== "summary") {
    query.set("mode", mode);
  }
  query.set("detailBasis", detailBasis);
  query.set("contributionDimension", contributionDimension);
  query.set("attributionDimension", attributionDimension);
  query.set("chartFrequency", chartFrequency);
  if (benchmark) {
    query.set("benchmark", benchmark);
  }
  if (isExplicitWindow && reportStartDate) {
    query.set("reportStartDate", reportStartDate);
  }
  if (isExplicitWindow && reportEndDate) {
    query.set("reportEndDate", reportEndDate);
  }
  return `/performance?${query.toString()}`;
}
