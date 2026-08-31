import { describe, expect, it } from "vitest";

import {
  buildPerformanceHorizonComparisonCacheKey,
  isHorizonComparisonCurrent,
} from "../../src/apps/performance/components/performance-horizon-comparison-state";
import { buildPerformanceHorizonComparison } from "../fixtures/performance-workspace-fixtures";

describe("performance-horizon-comparison-state", () => {
  const request = {
    portfolioId: "PF_1001",
    period: "YTD",
    detailBasis: "NET",
    benchmark: "BMK_GLOBAL_BALANCED_60_40",
    chartFrequency: "monthly",
    reportStartDate: "2026-01-01",
    reportEndDate: "2026-03-27",
    asOfDate: "2026-03-27",
    reportingCurrency: "SGD",
  };

  it("builds a stable cache key from governed analytical inputs", () => {
    const baseline = buildPerformanceHorizonComparisonCacheKey({
      portfolioId: "PF_1001",
      period: "YTD",
      detailBasis: "NET",
      benchmark: "BMK_GLOBAL_BALANCED_60_40",
      chartFrequency: "monthly",
      reportStartDate: "2026-01-01",
      reportEndDate: "2026-03-27",
      asOfDate: "2026-03-27",
      reportingCurrency: "SGD",
    });

    expect(
      buildPerformanceHorizonComparisonCacheKey({
        portfolioId: "PF_1001",
        period: "YTD",
        detailBasis: "NET",
        benchmark: "BMK_GLOBAL_BALANCED_60_40",
        chartFrequency: "monthly",
        reportStartDate: "2026-01-01",
        reportEndDate: "2026-03-27",
        asOfDate: "2026-03-27",
        reportingCurrency: "sgd",
      })
    ).toBe(baseline);

    expect(
      buildPerformanceHorizonComparisonCacheKey({
        portfolioId: "PF_1001",
        period: "YTD",
        detailBasis: "NET",
        benchmark: "BMK_GLOBAL_BALANCED_60_40",
        chartFrequency: "monthly",
        reportStartDate: "2026-01-01",
        reportEndDate: "2026-03-27",
        asOfDate: "2026-03-27",
        reportingCurrency: "USD",
      })
    ).not.toBe(baseline);

    expect(
      buildPerformanceHorizonComparisonCacheKey({
        portfolioId: "PF_1001",
        period: "YTD",
        detailBasis: "NET",
        benchmark: "BMK_GLOBAL_BALANCED_60_40",
        chartFrequency: "weekly",
        reportStartDate: "2026-01-01",
        reportEndDate: "2026-03-27",
      })
    ).not.toBe(baseline);
  });

  it.each([
    ["portfolio", { portfolio_id: "PF_OTHER" }],
    ["period", { period: "1Y" }],
    ["basis", { detail_basis: "GROSS" }],
    ["benchmark", { benchmark_code: "BMK_OTHER" }],
    ["frequency", { chart_frequency: "weekly" }],
    ["start date", { report_start_date: "2026-01-02" }],
    ["end date", { report_end_date: "2026-03-26" }],
    ["valuation date", { as_of_date: "2026-03-26" }],
    ["currency", { reporting_currency: "USD" }],
  ])("rejects horizon evidence with a different %s", (_label, override) => {
    const comparison = {
      ...buildPerformanceHorizonComparison("PF_1001"),
      portfolio_id: "PF_1001",
      report_start_date: "2026-01-01",
      report_end_date: "2026-03-27",
      as_of_date: "2026-03-27",
      reporting_currency: "SGD",
      ...override,
    };

    expect(isHorizonComparisonCurrent(comparison, request)).toBe(false);
  });

  it("accepts only explicit source-declared frequency normalization", () => {
    const normalized = {
      ...buildPerformanceHorizonComparison("PF_1001"),
      portfolio_id: "PF_1001",
      report_start_date: "2026-01-01",
      report_end_date: "2026-03-27",
      as_of_date: "2026-03-27",
      reporting_currency: "SGD",
      chart_frequency: "quarterly",
      requested_chart_frequency_supported: false,
    };

    expect(isHorizonComparisonCurrent(normalized, request)).toBe(true);
    expect(
      isHorizonComparisonCurrent(
        { ...normalized, requested_chart_frequency_supported: true },
        request,
      ),
    ).toBe(false);
  });

  it("requires benchmark absence when no benchmark was requested", () => {
    const comparison = {
      ...buildPerformanceHorizonComparison("PF_1001"),
      portfolio_id: "PF_1001",
      report_start_date: "2026-01-01",
      report_end_date: "2026-03-27",
      as_of_date: "2026-03-27",
      reporting_currency: "SGD",
      benchmark_code: null,
    };
    const unassignedRequest = { ...request, benchmark: undefined };

    expect(isHorizonComparisonCurrent(comparison, unassignedRequest)).toBe(true);
    expect(
      isHorizonComparisonCurrent(
        { ...comparison, benchmark_code: "BMK_UNSOLICITED" },
        unassignedRequest,
      ),
    ).toBe(false);
  });
});
