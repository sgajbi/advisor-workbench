import { describe, expect, it } from "vitest";

import { resolveSelectedPortfolioId } from "../../src/apps/portfolio/portfolio-selection";

describe("portfolio selection", () => {
  it("accepts only an explicitly requested portfolio confirmed by the catalogue", () => {
    expect(
      resolveSelectedPortfolioId(
        [{ portfolio_id: "PB_SG_GLOBAL_BAL_001" }],
        "PB_SG_GLOBAL_BAL_001",
      ),
    ).toBe("PB_SG_GLOBAL_BAL_001");
  });

  it.each([undefined, null, "", "   "])(
    "does not substitute a portfolio for missing request %s",
    (requested) => {
      expect(
        resolveSelectedPortfolioId(
          [{ portfolio_id: "PB_SG_GLOBAL_BAL_001" }],
          requested,
        ),
      ).toBeNull();
    },
  );

  it("fails closed when the requested portfolio is absent from the catalogue", () => {
    expect(
      resolveSelectedPortfolioId(
        [{ portfolio_id: "PB_SG_GLOBAL_BAL_001" }],
        "PB_NOT_ASSIGNED_001",
      ),
    ).toBeNull();
  });
});
