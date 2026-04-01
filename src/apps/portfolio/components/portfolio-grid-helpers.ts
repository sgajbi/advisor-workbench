import type { SizeColumnsToFitGridStrategy } from "ag-grid-community";

export type PortfolioGridDensity = "essential" | "expanded";

export const PORTFOLIO_GRID_AUTO_SIZE_STRATEGY: SizeColumnsToFitGridStrategy = {
  type: "fitGridWidth",
  defaultMinWidth: 96,
};

export function shouldPinPortfolioGridLeadColumns(density: PortfolioGridDensity) {
  return density === "essential";
}
