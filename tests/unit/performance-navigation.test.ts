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
});
