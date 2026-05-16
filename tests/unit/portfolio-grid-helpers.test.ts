import { describe, expect, it } from "vitest";

import {
  PORTFOLIO_GRID_DEFAULT_COLUMN_DEF,
  PORTFOLIO_GRID_AUTO_SIZE_STRATEGY,
  buildPortfolioDataGridColumn,
  getPortfolioAmountToneClass,
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

  it("keeps one default AG Grid column policy for portfolio record grids", () => {
    expect(PORTFOLIO_GRID_DEFAULT_COLUMN_DEF).toMatchObject({
      sortable: true,
      resizable: true,
      filter: false,
      suppressMovable: false,
      cellClass: "portfolio-data-grid-cell",
      headerClass: "portfolio-data-grid-header-cell",
    });
  });

  it("applies shared numeric and text grid column classes", () => {
    expect(buildPortfolioDataGridColumn({ field: "instrument" })).toMatchObject({
      cellClass: "portfolio-data-grid-cell",
      headerClass: "portfolio-data-grid-header-cell",
    });

    expect(
      buildPortfolioDataGridColumn({ field: "marketValue", type: "numericColumn" }),
    ).toMatchObject({
      cellClass: "portfolio-data-grid-cell portfolio-data-grid-cell-numeric",
      headerClass: "portfolio-data-grid-header-cell portfolio-data-grid-header-cell-numeric",
    });
  });

  it("classifies positive and negative financial amounts without color-only meaning", () => {
    expect(getPortfolioAmountToneClass(25)).toBe("portfolio-data-grid-cell-positive");
    expect(getPortfolioAmountToneClass(-25)).toBe("portfolio-data-grid-cell-negative");
    expect(getPortfolioAmountToneClass(0)).toBe("");
    expect(getPortfolioAmountToneClass(null)).toBe("");
  });
});
