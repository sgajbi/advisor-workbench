"use client";

import { type Dispatch, type SetStateAction, useMemo, useRef, useState } from "react";

import type { ColDef, GridApi, GridReadyEvent } from "ag-grid-community";
import { AgGridReact } from "ag-grid-react";
import Button from "@mui/material/Button";
import Checkbox from "@mui/material/Checkbox";
import FormControlLabel from "@mui/material/FormControlLabel";
import Menu from "@mui/material/Menu";
import MenuItem from "@mui/material/MenuItem";
import * as XLSX from "xlsx";

import { SectionHeader } from "@/design-system";
import { ensureAgGridModulesRegistered } from "@/design-system/utils/ag-grid-modules";
import type { PortfolioPositionView } from "../types";
import { formatCount, formatCurrency, formatDate, formatPct, formatQuantity, formatStatus } from "../formatters";
import {
  PORTFOLIO_GRID_AUTO_SIZE_STRATEGY,
  shouldPinPortfolioGridLeadColumns,
} from "./portfolio-grid-helpers";
import PortfolioModuleState from "./portfolio-module-state";

import "ag-grid-community/styles/ag-grid.css";
import "ag-grid-community/styles/ag-theme-quartz.css";

ensureAgGridModulesRegistered();

type HoldingsColumnKey =
  | "instrument"
  | "assetClass"
  | "quantity"
  | "price"
  | "marketValue"
  | "weight"
  | "upl"
  | "currency"
  | "sector"
  | "heldSince"
  | "isin";

type HoldingsGridProps = {
  portfolioId: string;
  positions: PortfolioPositionView[];
  baseCurrency: string;
  asOfDate: string;
  columnMode: "essential" | "expanded";
  filterLabel?: string | null;
  onClearFilter?: () => void;
  onRowSelect?: (row: HoldingsRow) => void;
};

export type HoldingsRow = {
  securityId: string;
  instrument: string;
  assetClass: string;
  quantity: number;
  price: number | null;
  marketValue: number | null;
  weight: number | null;
  upl: number | null;
  currency: string;
  sector: string;
  heldSince: string | null;
  isin: string | null;
  raw: PortfolioPositionView;
};

const DEFAULT_COLUMN_VISIBILITY: Record<HoldingsColumnKey, boolean> = {
  instrument: true,
  assetClass: true,
  quantity: true,
  price: true,
  marketValue: true,
  weight: true,
  upl: true,
  currency: true,
  sector: false,
  heldSince: false,
  isin: false,
};

export default function PortfolioHoldingsGrid({
  portfolioId,
  positions,
  baseCurrency,
  asOfDate,
  columnMode,
  filterLabel,
  onClearFilter,
  onRowSelect,
}: HoldingsGridProps) {
  const gridApiRef = useRef<GridApi<HoldingsRow> | null>(null);
  const [chooserAnchor, setChooserAnchor] = useState<HTMLElement | null>(null);
  const [columnVisibility, setColumnVisibility] = useState<Record<HoldingsColumnKey, boolean>>(() =>
    columnMode === "essential"
      ? { ...DEFAULT_COLUMN_VISIBILITY, sector: false, heldSince: false, isin: false }
      : { ...DEFAULT_COLUMN_VISIBILITY, sector: true, heldSince: true }
  );
  const pinImportantColumns = shouldPinPortfolioGridLeadColumns(columnMode);

  const rowData = useMemo<HoldingsRow[]>(
    () =>
      positions.map((position) => ({
        securityId: position.security_id,
        instrument: position.instrument_name,
        assetClass: formatStatus(position.asset_class),
        quantity: position.quantity,
        price: position.market_price ?? null,
        marketValue: position.market_value_base ?? null,
        weight: position.weight_pct ?? null,
        upl: position.unrealized_gain_loss_base ?? null,
        currency: position.currency ?? baseCurrency,
        sector: formatStatus(position.sector),
        heldSince: position.held_since_date ?? null,
        isin: position.isin ?? null,
        raw: position,
      })),
    [baseCurrency, positions]
  );
  const unpricedCount = positions.filter(
    (position) => position.market_price == null || position.market_value_base == null
  ).length;

  const columnDefs = useMemo<ColDef<HoldingsRow>[]>(
    () => [
      buildHoldingsColumn({
        key: "instrument",
        headerName: "Instrument",
        field: "instrument",
        pinned: pinImportantColumns ? "left" : null,
        hide: !columnVisibility.instrument,
        minWidth: 190,
        flex: 2,
      }),
      buildHoldingsColumn({
        key: "assetClass",
        headerName: "Asset Class",
        field: "assetClass",
        pinned: pinImportantColumns ? "left" : null,
        hide: !columnVisibility.assetClass,
        minWidth: 126,
        flex: 1.1,
      }),
      buildHoldingsColumn({
        key: "quantity",
        headerName: "Quantity",
        field: "quantity",
        type: "numericColumn",
        hide: !columnVisibility.quantity,
        minWidth: 104,
        valueFormatter: ({ value }) => formatQuantity(value),
      }),
      buildHoldingsColumn({
        key: "price",
        headerName: "Price",
        field: "price",
        type: "numericColumn",
        hide: !columnVisibility.price,
        minWidth: 108,
        valueFormatter: ({ value, data }) =>
          value === null || value === undefined ? "—" : formatCurrency(value, data?.currency ?? baseCurrency),
      }),
      buildHoldingsColumn({
        key: "marketValue",
        headerName: "Market Value",
        field: "marketValue",
        type: "numericColumn",
        hide: !columnVisibility.marketValue,
        minWidth: 132,
        valueFormatter: ({ value }) => formatCurrency(value, baseCurrency),
      }),
      buildHoldingsColumn({
        key: "weight",
        headerName: "Weight",
        field: "weight",
        type: "numericColumn",
        hide: !columnVisibility.weight,
        minWidth: 98,
        valueFormatter: ({ value }) => formatPct(value),
      }),
      buildHoldingsColumn({
        key: "upl",
        headerName: "Unrealized P&L",
        field: "upl",
        type: "numericColumn",
        hide: !columnVisibility.upl,
        minWidth: 138,
        valueFormatter: ({ value }) => formatCurrency(value, baseCurrency),
      }),
      buildHoldingsColumn({
        key: "currency",
        headerName: "Currency",
        field: "currency",
        hide: !columnVisibility.currency,
        minWidth: 92,
      }),
      buildHoldingsColumn({
        key: "sector",
        headerName: "Sector",
        field: "sector",
        hide: !columnVisibility.sector,
        minWidth: 118,
      }),
      buildHoldingsColumn({
        key: "heldSince",
        headerName: "Held Since",
        field: "heldSince",
        hide: !columnVisibility.heldSince,
        minWidth: 116,
        valueFormatter: ({ value }) => formatDate(value),
      }),
      buildHoldingsColumn({
        key: "isin",
        headerName: "ISIN",
        field: "isin",
        hide: !columnVisibility.isin,
        minWidth: 128,
      }),
    ],
    [baseCurrency, columnVisibility, pinImportantColumns]
  );

  return (
    <div className="portfolio-grid-module">
      <SectionHeader
        title="Holdings"
        subtitle={`As of ${formatDate(asOfDate)} in ${baseCurrency}`}
        actions={
          <>
            <Button
              size="small"
              variant="outlined"
              aria-haspopup="menu"
              aria-expanded={Boolean(chooserAnchor)}
              aria-label="Choose holdings columns"
              onClick={(event) => setChooserAnchor(event.currentTarget)}
            >
              Columns
            </Button>
            <Button
              size="small"
              variant={filterLabel ? "contained" : "outlined"}
              aria-label={filterLabel ? `Filter active: ${filterLabel}` : "Filter holdings"}
              onClick={onClearFilter}
              disabled={!filterLabel || !onClearFilter}
            >
              Filter
            </Button>
            <Button
              size="small"
              variant="outlined"
              aria-label="Export holdings"
              onClick={() => exportHoldingsXlsx(rowData, columnVisibility, baseCurrency)}
            >
              Export
            </Button>
            <Button
              size="small"
              variant="outlined"
              aria-label="Show expanded holdings columns"
              onClick={() =>
                setColumnVisibility({
                  ...DEFAULT_COLUMN_VISIBILITY,
                  sector: true,
                  heldSince: true,
                  isin: true,
                })
              }
            >
              Expand
            </Button>
          </>
        }
      />

      {filterLabel ? (
        <div className="portfolio-grid-toolbar">
          <div className="portfolio-grid-toolbar-copy">
            <span>{filterLabel}</span>
          </div>
          <div className="portfolio-grid-toolbar-actions">
            <Button size="small" variant="text" onClick={onClearFilter}>
              Clear filter
            </Button>
            <span>{formatCount(rowData.length, "position")} in the current book view</span>
          </div>
        </div>
      ) : null}

      {rowData.length ? (
        <>
          {unpricedCount ? (
            <PortfolioModuleState
              variant="status"
              state="partial"
              title="Holdings partially valued"
              body={`${formatCount(unpricedCount, "holding")} is missing current price or valuation data.`}
              hint="The visible book is usable, but market value and P&L are incomplete for some positions."
            />
          ) : null}
        <div
          className={`ag-theme-quartz portfolio-data-grid ${columnMode === "expanded" ? "portfolio-data-grid-dense" : ""}`}
          aria-label="Portfolio holdings grid"
        >
          <AgGridReact<HoldingsRow>
            rowData={rowData}
            columnDefs={columnDefs}
            theme="legacy"
            autoSizeStrategy={PORTFOLIO_GRID_AUTO_SIZE_STRATEGY}
            defaultColDef={DEFAULT_GRID_COLUMN_DEF}
            animateRows={false}
            domLayout="autoHeight"
            headerHeight={columnMode === "expanded" ? 36 : 38}
            rowHeight={columnMode === "expanded" ? 38 : 42}
            ensureDomOrder
            suppressCellFocus={false}
            onGridReady={(event: GridReadyEvent<HoldingsRow>) => {
              gridApiRef.current = event.api;
            }}
            onRowClicked={({ data }) => {
              if (data) {
                onRowSelect?.(data);
              }
            }}
          />
        </div>
        </>
      ) : (
        <PortfolioModuleState
          variant="status"
          state="empty"
          title="No holdings in this portfolio"
          body="The holdings inventory is empty."
          hint="Add securities, cash funding, or subscriptions to populate the book."
          why={{
            body:
              "Holdings require booked positions or funded balances. Until inventory is booked into the portfolio, the holdings grid stays empty.",
            label: "Why holdings are unavailable",
          }}
          action={
            <>
              <a href={`/workbench?portfolioId=${encodeURIComponent(portfolioId)}`}>Book first trade</a>
              <a href={`/portfolio?portfolioId=${encodeURIComponent(portfolioId)}#portfolio-attention`}>Review readiness</a>
            </>
          }
        />
      )}

      <Menu anchorEl={chooserAnchor} open={Boolean(chooserAnchor)} onClose={() => setChooserAnchor(null)}>
        {Object.entries(HOLDINGS_COLUMN_LABELS).map(([key, label]) => (
          <MenuItem key={key} onClick={() => toggleHoldingsColumn(key as HoldingsColumnKey, setColumnVisibility)}>
            <FormControlLabel
              control={<Checkbox checked={columnVisibility[key as HoldingsColumnKey]} />}
              label={label}
            />
          </MenuItem>
        ))}
      </Menu>
    </div>
  );
}

const HOLDINGS_COLUMN_LABELS: Record<HoldingsColumnKey, string> = {
  instrument: "Instrument",
  assetClass: "Asset Class",
  quantity: "Quantity",
  price: "Price",
  marketValue: "Market Value",
  weight: "Weight",
  upl: "Unrealized P&L",
  currency: "Currency",
  sector: "Sector",
  heldSince: "Held Since",
  isin: "ISIN",
};

const DEFAULT_GRID_COLUMN_DEF: ColDef = {
  sortable: true,
  resizable: true,
  filter: false,
  suppressMovable: false,
  cellClass: "portfolio-data-grid-cell",
  headerClass: "portfolio-data-grid-header-cell",
};

function buildHoldingsColumn(
  config: ColDef<HoldingsRow> & { key: HoldingsColumnKey }
): ColDef<HoldingsRow> {
  const columnConfig = { ...config };
  delete (columnConfig as { key?: HoldingsColumnKey }).key;
  return {
    ...columnConfig,
    tooltipValueGetter: (params) => String(params.value ?? ""),
  };
}

function toggleHoldingsColumn(
  key: HoldingsColumnKey,
  setColumnVisibility: Dispatch<SetStateAction<Record<HoldingsColumnKey, boolean>>>
) {
  setColumnVisibility((current) => ({ ...current, [key]: !current[key] }));
}

function exportHoldingsXlsx(
  rows: HoldingsRow[],
  visibility: Record<HoldingsColumnKey, boolean>,
  baseCurrency: string
) {
  const visibleColumns = (Object.keys(HOLDINGS_COLUMN_LABELS) as HoldingsColumnKey[]).filter(
    (key) => visibility[key]
  );
  const exportRows = rows.map((row) => {
    const output: Record<string, string | number> = {};
    visibleColumns.forEach((key) => {
      switch (key) {
        case "instrument":
          output["Instrument"] = row.instrument;
          break;
        case "assetClass":
          output["Asset Class"] = row.assetClass;
          break;
        case "quantity":
          output["Quantity"] = row.quantity;
          break;
        case "price":
          output["Price"] = row.price ?? "";
          break;
        case "marketValue":
          output[`Market Value (${baseCurrency})`] = row.marketValue ?? "";
          break;
        case "weight":
          output["Weight %"] = row.weight ?? "";
          break;
        case "upl":
          output[`Unrealized P&L (${baseCurrency})`] = row.upl ?? "";
          break;
        case "currency":
          output["Currency"] = row.currency;
          break;
        case "sector":
          output["Sector"] = row.sector;
          break;
        case "heldSince":
          output["Held Since"] = row.heldSince ?? "";
          break;
        case "isin":
          output["ISIN"] = row.isin ?? "";
          break;
      }
    });
    return output;
  });

  const worksheet = XLSX.utils.json_to_sheet(exportRows);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Holdings");
  XLSX.writeFileXLSX(workbook, "portfolio-holdings.xlsx");
}
