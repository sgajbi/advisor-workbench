import { describe, expect, it } from "vitest";

import { buildPortfolioRecordSelectionHref } from "@/apps/portfolio/portfolio-record-selection";

describe("portfolio record selection address", () => {
  it("preserves the confirmed review and page context when selecting a record", () => {
    expect(
      buildPortfolioRecordSelectionHref({
        pathname: "/transactions",
        searchParams: new URLSearchParams(
          "portfolioId=PB_OLD&asOfDate=2026-08-21&period=YTD&reportingCurrency=SGD&page=2",
        ),
        portfolioId: "PB_SG_GLOBAL_BAL_001",
        selectedRecordId: "TX_001",
      }),
    ).toBe(
      "/transactions?portfolioId=PB_SG_GLOBAL_BAL_001&asOfDate=2026-08-21&period=YTD&reportingCurrency=SGD&selectedRecordId=TX_001&page=2",
    );
  });

  it("removes only record identity when returning to the list", () => {
    expect(
      buildPortfolioRecordSelectionHref({
        pathname: "/positions",
        searchParams: new URLSearchParams(
          "portfolioId=PB_SG_GLOBAL_BAL_001&period=1Y&selectedRecordId=EQ_001&columns=expanded",
        ),
        portfolioId: "PB_SG_GLOBAL_BAL_001",
      }),
    ).toBe(
      "/positions?portfolioId=PB_SG_GLOBAL_BAL_001&period=1Y&columns=expanded",
    );
  });

  it("refuses to build navigation from ambiguous context", () => {
    expect(
      buildPortfolioRecordSelectionHref({
        pathname: "/positions",
        searchParams: new URLSearchParams(
          "portfolioId=PB_ONE&portfolioId=PB_TWO",
        ),
        portfolioId: "PB_ONE",
        selectedRecordId: "EQ_001",
      }),
    ).toBeNull();
  });
});
