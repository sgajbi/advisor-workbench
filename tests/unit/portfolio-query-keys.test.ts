import { describe, expect, it } from "vitest";

import { portfolioQueryKeys } from "../../src/apps/portfolio/portfolio-query-keys";

const baseParams = {
  asOfDate: "2026-03-31",
  reportingCurrency: "SGD",
  includeProjected: false,
  timeWindow: "YTD" as const,
  reportStartDate: "2026-01-01",
  reportEndDate: "2026-03-31",
  usesCustomDateRange: false,
};

describe("portfolioQueryKeys", () => {
  it("separates every source-changing Portfolio review dimension", () => {
    const baseline = portfolioQueryKeys.summaryDetails(
      "PB_SG_GLOBAL_BAL_001",
      baseParams,
    );

    const variants = [
      { ...baseParams, asOfDate: "2026-02-28" },
      { ...baseParams, reportingCurrency: "USD" },
      { ...baseParams, includeProjected: true },
      { ...baseParams, timeWindow: "MTD" as const },
      { ...baseParams, reportStartDate: "2026-03-01" },
      { ...baseParams, reportEndDate: "2026-03-30" },
      { ...baseParams, usesCustomDateRange: true },
    ];

    for (const variant of variants) {
      expect(
        portfolioQueryKeys.summaryDetails("PB_SG_GLOBAL_BAL_001", variant),
      ).not.toEqual(baseline);
    }
    expect(
      portfolioQueryKeys.summaryDetails("PB_SG_GROWTH_002", baseParams),
    ).not.toEqual(baseline);
  });

  it("normalises omitted optional dimensions to stable source semantics", () => {
    expect(
      portfolioQueryKeys.summaryDetails("PB_SG_GLOBAL_BAL_001", {
        timeWindow: "YTD",
        reportStartDate: "2026-01-01",
        reportEndDate: "2026-03-31",
      }),
    ).toEqual(
      portfolioQueryKeys.summaryDetails("PB_SG_GLOBAL_BAL_001", {
        asOfDate: undefined,
        reportingCurrency: undefined,
        includeProjected: false,
        timeWindow: "YTD",
        reportStartDate: "2026-01-01",
        reportEndDate: "2026-03-31",
        usesCustomDateRange: false,
      }),
    );
  });

  it("provides a bounded root for invalidating one portfolio's detail family", () => {
    const key = portfolioQueryKeys.summaryDetails(
      "PB_SG_GLOBAL_BAL_001",
      baseParams,
    );

    expect(key.slice(0, 4)).toEqual(
      portfolioQueryKeys.summaryDetailsRoot("PB_SG_GLOBAL_BAL_001"),
    );
  });

  it("keeps server-source and latest-intent coordination inside Query ownership", () => {
    expect(portfolioQueryKeys.serverSource("PB_SG_GLOBAL_BAL_001")).toEqual([
      "portfolio",
      "workspace",
      "PB_SG_GLOBAL_BAL_001",
      "server-source",
    ]);
    expect(portfolioQueryKeys.reviewContextIntent()).toEqual([
      "portfolio",
      "workspace",
      "review-context-intent",
    ]);
  });
});
