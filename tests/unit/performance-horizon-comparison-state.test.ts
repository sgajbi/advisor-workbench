import { describe, expect, it } from "vitest";

import {
  buildPerformanceHorizonComparisonCacheKey,
} from "../../src/apps/performance/components/performance-horizon-comparison-state";

describe("performance-horizon-comparison-state", () => {
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
});
