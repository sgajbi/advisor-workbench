"use client";

import type { AgGridReactProps } from "ag-grid-react";
import { AgGridReact } from "ag-grid-react";

import { ensureAgGridModulesRegistered } from "@/design-system/utils/ag-grid-modules";

import {
  PORTFOLIO_GRID_DEFAULT_COLUMN_DEF,
  type PortfolioGridDensity,
} from "./portfolio-grid-helpers";

import "ag-grid-community/styles/ag-grid.css";
import "ag-grid-community/styles/ag-theme-quartz.css";

ensureAgGridModulesRegistered();

type PortfolioDataGridFrameProps<TRow> = AgGridReactProps<TRow> & {
  ariaLabel: string;
  density?: PortfolioGridDensity;
};

export default function PortfolioDataGridFrame<TRow>({
  ariaLabel,
  density = "essential",
  defaultColDef,
  rowHeight,
  ...gridProps
}: PortfolioDataGridFrameProps<TRow>) {
  return (
    <div
      className={`ag-theme-quartz portfolio-data-grid ${
        density === "expanded" ? "portfolio-data-grid-dense" : ""
      }`}
      aria-label={ariaLabel}
    >
      <AgGridReact<TRow>
        {...gridProps}
        theme="legacy"
        defaultColDef={defaultColDef ?? PORTFOLIO_GRID_DEFAULT_COLUMN_DEF}
        animateRows={false}
        domLayout="autoHeight"
        headerHeight={32}
        rowHeight={rowHeight ?? (density === "expanded" ? 34 : 36)}
        ensureDomOrder
        suppressCellFocus={false}
      />
    </div>
  );
}
