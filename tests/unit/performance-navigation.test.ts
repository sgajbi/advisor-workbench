import { describe, expect, it } from "vitest";

import { buildPerformanceHref } from "../../src/apps/performance/navigation";

describe("buildPerformanceHref", () => {
  it("omits resolved dates for canonical periods", () => {
    expect(
      buildPerformanceHref({
        portfolioId: "PF_1001",
        period: "YTD",
        detailBasis: "NET",
        contributionDimension: "asset_class",
        attributionDimension: "asset_class",
        chartFrequency: "monthly",
        benchmark: "BMK_GLOBAL_BALANCED_60_40",
        reportStartDate: "2026-01-01",
        reportEndDate: "2026-03-31",
      })
    ).toBe(
      "/performance?portfolioId=PF_1001&period=YTD&detailBasis=NET&contributionDimension=asset_class&attributionDimension=asset_class&chartFrequency=monthly&benchmark=BMK_GLOBAL_BALANCED_60_40"
    );
  });

  it("preserves explicit window dates only for EXPLICIT period", () => {
    expect(
      buildPerformanceHref({
        portfolioId: "PF_1001",
        period: "EXPLICIT",
        detailBasis: "NET",
        contributionDimension: "asset_class",
        attributionDimension: "asset_class",
        chartFrequency: "monthly",
        benchmark: "BMK_GLOBAL_BALANCED_60_40",
        reportStartDate: "2026-01-01",
        reportEndDate: "2026-03-31",
      })
    ).toBe(
      "/performance?portfolioId=PF_1001&period=EXPLICIT&detailBasis=NET&contributionDimension=asset_class&attributionDimension=asset_class&chartFrequency=monthly&benchmark=BMK_GLOBAL_BALANCED_60_40&reportStartDate=2026-01-01&reportEndDate=2026-03-31"
    );
  });

  it("preserves governed valuation context ahead of page-local analytical controls", () => {
    expect(
      buildPerformanceHref({
        portfolioId: "PF_1001",
        asOfDate: "2026-02-24",
        period: "YTD",
        reportingCurrency: "USD",
        mode: "analysis",
        detailBasis: "NET",
        contributionDimension: "asset_class",
        attributionDimension: "asset_class",
        chartFrequency: "monthly",
      }),
    ).toBe(
      "/performance?portfolioId=PF_1001&asOfDate=2026-02-24&period=YTD&reportingCurrency=USD&mode=analysis&detailBasis=NET&contributionDimension=asset_class&attributionDimension=asset_class&chartFrequency=monthly",
    );
  });

  it("rejects unsupported governed context instead of serializing an ambiguous route", () => {
    expect(() =>
      buildPerformanceHref({
        portfolioId: "PF_1001",
        period: "ROLLING",
        reportingCurrency: "US",
        detailBasis: "NET",
        contributionDimension: "asset_class",
        attributionDimension: "asset_class",
        chartFrequency: "monthly",
      }),
    ).toThrow("governed review period");
  });
});
