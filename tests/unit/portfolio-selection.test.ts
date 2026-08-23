import { describe, expect, it } from "vitest";

import {
  isPortfolioWorkspaceIdentityConfirmed,
  resolveSelectedPortfolioId,
} from "../../src/apps/portfolio/portfolio-selection";

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

  it("confirms a workspace only when its source identity matches the selected portfolio", () => {
    const workspace = {
      portfolio: { portfolio_id: "PB_SG_GLOBAL_BAL_001" },
    };

    expect(
      isPortfolioWorkspaceIdentityConfirmed(workspace, "PB_SG_GLOBAL_BAL_001"),
    ).toBe(true);
    expect(
      isPortfolioWorkspaceIdentityConfirmed(workspace, "PB_FOREIGN_001"),
    ).toBe(false);
    expect(isPortfolioWorkspaceIdentityConfirmed(workspace, null)).toBe(false);
    expect(
      isPortfolioWorkspaceIdentityConfirmed(null, "PB_SG_GLOBAL_BAL_001"),
    ).toBe(false);
  });
});
