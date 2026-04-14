import { describe, expect, it } from "vitest";

import {
  buildEmptyPerformanceHorizonComparison,
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
      })
    ).toBe(baseline);

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

  it("builds an honest empty comparison payload when the horizon service fails", () => {
    expect(
      buildEmptyPerformanceHorizonComparison({
        portfolioId: "PF_1001",
        period: "YTD",
        detailBasis: "NET",
        benchmark: "BMK_GLOBAL_BALANCED_60_40",
        chartFrequency: "monthly",
        reportStartDate: "2026-01-01",
        reportEndDate: "2026-03-27",
        benchmarkOptions: [
          {
            benchmark_code: "BMK_GLOBAL_BALANCED_60_40",
            benchmark_name: "Global Balanced 60/40",
            is_assigned: true,
          },
        ],
      })
    ).toMatchObject({
      portfolio_id: "PF_1001",
      period: "YTD",
      detail_basis: "NET",
      chart_frequency: "monthly",
      benchmark_code: "BMK_GLOBAL_BALANCED_60_40",
      report_start_date: "2026-01-01",
      report_end_date: "2026-03-27",
      requested_chart_frequency_supported: true,
      rows: [],
      warnings: [],
      partial_failures: [],
    });
  });
});
