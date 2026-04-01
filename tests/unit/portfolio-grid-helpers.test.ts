import { describe, expect, it } from "vitest";

import {
  PORTFOLIO_GRID_AUTO_SIZE_STRATEGY,
  shouldPinPortfolioGridLeadColumns,
} from "../../src/apps/portfolio/components/portfolio-grid-helpers";

describe("portfolio grid helpers", () => {
  it("pins lead columns only in essential density", () => {
    expect(shouldPinPortfolioGridLeadColumns("essential")).toBe(true);
    expect(shouldPinPortfolioGridLeadColumns("expanded")).toBe(false);
  });

  it("uses one shared fit-grid strategy for portfolio AG Grid modules", () => {
    expect(PORTFOLIO_GRID_AUTO_SIZE_STRATEGY).toEqual({
      type: "fitGridWidth",
      defaultMinWidth: 96,
    });
  });
});
