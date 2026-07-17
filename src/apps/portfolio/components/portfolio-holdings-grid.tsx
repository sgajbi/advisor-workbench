"use client";

import { type Dispatch, type SetStateAction, useMemo, useRef, useState } from "react";

import type { ColDef, GridApi, GridReadyEvent, ICellRendererParams } from "ag-grid-community";
import Button from "@mui/material/Button";
import Checkbox from "@mui/material/Checkbox";
import FormControlLabel from "@mui/material/FormControlLabel";
import Menu from "@mui/material/Menu";
import MenuItem from "@mui/material/MenuItem";
import TextField from "@mui/material/TextField";

import type { PortfolioPositionView } from "../types";
import { formatCount, formatCurrency, formatDate, formatPct, formatQuantity, formatStatus } from "../formatters";
import {
  buildDefaultHoldingsColumnVisibility,
  buildExpandedHoldingsColumnVisibility,
  buildHoldingsExportRows,
  buildHoldingsRows,
  countUnpricedHoldings,
  HOLDINGS_COLUMN_LABELS,
  type HoldingsColumnKey,
  type HoldingsRow,
  sumHoldingsMarketValue,
} from "./portfolio-holdings-grid-helpers";
import {
  buildPortfolioDataGridColumn,
  getPortfolioAmountToneClass,
  shouldPinPortfolioGridLeadColumns,
} from "./portfolio-grid-helpers";
import PortfolioDataGridFrame from "./portfolio-data-grid-frame";
import { downloadCsv } from "./portfolio-grid-export";
import PortfolioModuleState from "./portfolio-module-state";
import PortfolioRecordGridShell from "./portfolio-record-grid-shell";

type HoldingsGridProps = {
  portfolioId: string;
  positions: PortfolioPositionView[];
  baseCurrency: string;
  asOfDate: string;
  columnMode: "essential" | "expanded";
  kicker?: string;
  title?: string;
  description?: string;
  filterLabel?: string | null;
  onClearFilter?: () => void;
  onRowSelect?: (row: HoldingsRow) => void;
};

export type { HoldingsRow };

export default function PortfolioHoldingsGrid({
  portfolioId,
  positions,
  baseCurrency,
  asOfDate,
  columnMode,
  kicker = "Positions",
  title = "Holdings",
  description = `As of ${formatDate(asOfDate)} in ${baseCurrency}`,
  filterLabel,
  onClearFilter,
  onRowSelect,
}: HoldingsGridProps) {
  const gridApiRef = useRef<GridApi<HoldingsRow> | null>(null);
  const [chooserAnchor, setChooserAnchor] = useState<HTMLElement | null>(null);
  const [quickSearch, setQuickSearch] = useState("");
  const [columnVisibility, setColumnVisibility] = useState<Record<HoldingsColumnKey, boolean>>(() =>
    buildDefaultHoldingsColumnVisibility(columnMode)
  );
  const hasHiddenColumns = Object.values(columnVisibility).some((isVisible) => !isVisible);
  const pinImportantColumns = shouldPinPortfolioGridLeadColumns(columnMode);

  const rowData = useMemo<HoldingsRow[]>(
    () => buildHoldingsRows(positions, baseCurrency),
    [baseCurrency, positions]
  );
  const unpricedCount = useMemo(() => countUnpricedHoldings(positions), [positions]);

  const columnDefs = useMemo<ColDef<HoldingsRow>[]>(
    () => [
      buildHoldingsColumn({
        key: "instrument",
        headerName: "Instrument",
        field: "instrument",
        pinned: pinImportantColumns ? "left" : null,
        hide: !columnVisibility.instrument,
        minWidth: 230,
        flex: 2,
        cellRenderer: holdingsInstrumentCellRenderer,
        cellRendererParams: { onReview: onRowSelect },
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
        key: "costBasis",
        headerName: "Cost Basis",
        field: "costBasis",
        type: "numericColumn",
        hide: !columnVisibility.costBasis,
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
        cellClass: ({ value }) =>
          `portfolio-data-grid-cell portfolio-data-grid-cell-numeric ${getPortfolioAmountToneClass(value)}`,
      }),
      buildHoldingsColumn({
        key: "currency",
        headerName: "Currency",
        field: "currency",
        hide: !columnVisibility.currency,
        minWidth: 92,
      }),
      buildHoldingsColumn({
        key: "status",
        headerName: "Status",
        field: "status",
        hide: !columnVisibility.status,
        minWidth: 112,
        cellRenderer: holdingsStatusCellRenderer,
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
    [baseCurrency, columnVisibility, onRowSelect, pinImportantColumns]
  );

  return (
    <PortfolioRecordGridShell
      kicker={kicker}
      title={title}
      description={description}
      summaryLabel={formatCount(rowData.length, "holding")}
      summaryValue={formatCurrency(sumHoldingsMarketValue(rowData), baseCurrency)}
      searchControl={
        <TextField
          size="small"
          value={quickSearch}
          onChange={(event) => setQuickSearch(event.target.value)}
          placeholder="Search ticker or description"
          inputProps={{ "aria-label": "Search holdings" }}
          className="portfolio-record-search"
        />
      }
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
          {filterLabel && onClearFilter ? (
            <Button
              size="small"
              variant="contained"
              aria-label={`Filter active: ${filterLabel}`}
              onClick={onClearFilter}
            >
              Filter
            </Button>
          ) : null}
          <Button
            size="small"
            variant="outlined"
            aria-label="Export holdings"
            onClick={() => exportHoldingsCsv(rowData, columnVisibility, baseCurrency)}
          >
            Export
          </Button>
          {hasHiddenColumns ? (
            <Button
              size="small"
              variant="outlined"
              aria-label="Show all holdings columns"
              onClick={() => setColumnVisibility(buildExpandedHoldingsColumnVisibility())}
            >
              Show all columns
            </Button>
          ) : null}
        </>
      }
    >

      {filterLabel ? (
        <div className="portfolio-grid-toolbar">
          <div className="portfolio-grid-toolbar-copy">
            <span>{filterLabel}</span>
          </div>
          <div className="portfolio-grid-toolbar-actions">
            <Button size="small" variant="text" onClick={onClearFilter}>
              Clear filter
            </Button>
            <span>{formatCount(rowData.length, "holding")} in the current book view</span>
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
          <PortfolioDataGridFrame<HoldingsRow>
            ariaLabel="Portfolio holdings grid"
            density={columnMode}
            rowData={rowData}
            columnDefs={columnDefs}
            quickFilterText={quickSearch}
            getRowId={({ data }) => data.securityId}
            onGridReady={(event: GridReadyEvent<HoldingsRow>) => {
              gridApiRef.current = event.api;
            }}
            onRowClicked={({ data }) => {
              if (data) {
                onRowSelect?.(data);
              }
            }}
          />
        </>
      ) : filterLabel ? (
        <PortfolioModuleState
          variant="status"
          state="empty"
          title="No contributing holdings found"
          body={`No booked holdings match ${filterLabel}.`}
          hint="The exposure may rely on classification detail that is not present on the booked positions."
          action={
            <button type="button" onClick={onClearFilter}>
              Clear exposure
            </button>
          }
        />
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
    </PortfolioRecordGridShell>
  );
}

function buildHoldingsColumn(
  config: ColDef<HoldingsRow> & { key: HoldingsColumnKey }
): ColDef<HoldingsRow> {
  const columnConfig = { ...config };
  delete (columnConfig as { key?: HoldingsColumnKey }).key;
  return buildPortfolioDataGridColumn(columnConfig);
}

function holdingsInstrumentCellRenderer(
  params: ICellRendererParams<HoldingsRow, string> & {
    onReview?: (row: HoldingsRow) => void;
  },
) {
  const row = params.data;
  if (!row) {
    return params.value ?? "";
  }

  const content = (
    <>
      <strong>{row.instrument}</strong>
      <span>{row.securityId}{row.isin ? ` / ${row.isin}` : ""}</span>
    </>
  );

  return params.onReview ? (
    <button
      type="button"
      className="portfolio-instrument-cell portfolio-instrument-review"
      aria-label={`Review ${row.instrument} holding`}
      onClick={(event) => {
        event.stopPropagation();
        params.onReview?.(row);
      }}
    >
      {content}
    </button>
  ) : (
    <div className="portfolio-instrument-cell">{content}</div>
  );
}

function holdingsStatusCellRenderer(params: ICellRendererParams<HoldingsRow, string | null>) {
  const value = params.value;
  if (!value) {
    return <span className="portfolio-position-status portfolio-position-status-clear">Current</span>;
  }
  const normalized = value.toLowerCase();
  const tone = normalized.includes("fail")
    ? "danger"
    : normalized.includes("stale") || normalized.includes("pending")
      ? "warn"
      : "neutral";
  return (
    <span className={`portfolio-position-status portfolio-position-status-${tone}`}>
      {formatStatus(value)}
    </span>
  );
}

function toggleHoldingsColumn(
  key: HoldingsColumnKey,
  setColumnVisibility: Dispatch<SetStateAction<Record<HoldingsColumnKey, boolean>>>
) {
  setColumnVisibility((current) => ({ ...current, [key]: !current[key] }));
}

function exportHoldingsCsv(
  rows: HoldingsRow[],
  visibility: Record<HoldingsColumnKey, boolean>,
  baseCurrency: string
) {
  downloadCsv("portfolio-holdings.csv", buildHoldingsExportRows(rows, visibility, baseCurrency));
}
