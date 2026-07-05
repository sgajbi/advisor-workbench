import { describe, expect, it } from "vitest";

import { resolveSelectedPortfolioId } from "../../src/apps/portfolio/portfolio-selection";

describe("portfolio selection", () => {
  it("honors an explicitly requested portfolio even when catalog data is unavailable", () => {
    expect(resolveSelectedPortfolioId([], "PB_SG_GLOBAL_BAL_001")).toBe("PB_SG_GLOBAL_BAL_001");
  });

  it("falls back to the preferred catalog portfolio when no explicit portfolio is requested", () => {
    expect(
      resolveSelectedPortfolioId(
        [
          { portfolio_id: "MANUAL_PB_USD_001" },
          { portfolio_id: "PB_SG_GLOBAL_BAL_001" },
        ],
        undefined
      )
    ).toBe("PB_SG_GLOBAL_BAL_001");
  });
});
