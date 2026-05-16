import type { ColDef, SizeColumnsToFitGridStrategy } from "ag-grid-community";

export type PortfolioGridDensity = "essential" | "expanded";

export const PORTFOLIO_GRID_AUTO_SIZE_STRATEGY: SizeColumnsToFitGridStrategy = {
  type: "fitGridWidth",
  defaultMinWidth: 96,
};

export function shouldPinPortfolioGridLeadColumns(density: PortfolioGridDensity) {
  return density === "essential";
}

export const PORTFOLIO_GRID_DEFAULT_COLUMN_DEF: ColDef = {
  sortable: true,
  resizable: true,
  filter: false,
  suppressMovable: false,
  cellClass: "portfolio-data-grid-cell",
  headerClass: "portfolio-data-grid-header-cell",
};

export function buildPortfolioDataGridColumn<TRow>(
  config: ColDef<TRow>,
): ColDef<TRow> {
  const isNumericColumn = config.type === "numericColumn";
  return {
    ...config,
    cellClass:
      config.cellClass ??
      (isNumericColumn
        ? "portfolio-data-grid-cell portfolio-data-grid-cell-numeric"
        : "portfolio-data-grid-cell"),
    headerClass: isNumericColumn
      ? "portfolio-data-grid-header-cell portfolio-data-grid-header-cell-numeric"
      : "portfolio-data-grid-header-cell",
    tooltipValueGetter: (params) => String(params.value ?? ""),
  };
}

export function getPortfolioAmountToneClass(value: unknown) {
  if (typeof value !== "number") {
    return "";
  }
  if (value > 0) {
    return "portfolio-data-grid-cell-positive";
  }
  if (value < 0) {
    return "portfolio-data-grid-cell-negative";
  }
  return "";
}
