"use client";

import { useEffect, useMemo, useState } from "react";

import type { ColDef } from "ag-grid-community";
import { AgGridReact } from "ag-grid-react";
import Button from "@mui/material/Button";
import FormControl from "@mui/material/FormControl";
import InputLabel from "@mui/material/InputLabel";
import MenuItem from "@mui/material/MenuItem";
import Select from "@mui/material/Select";
import TextField from "@mui/material/TextField";
import * as XLSX from "xlsx";

import {
  SectionHeader,
  WorkbenchInlineRefreshNote,
} from "@/design-system";
import { ensureAgGridModulesRegistered } from "@/design-system/utils/ag-grid-modules";

import { getPortfolioTransactionLedger } from "../api";
import { formatCurrency, formatDate, formatQuantity, formatStatus } from "../formatters";
import type { PortfolioTransactionDrilldownFilter, PortfolioTransactionView } from "../types";
import { filterTransactionsByDrilldown } from "../view-model";
import {
  PORTFOLIO_GRID_AUTO_SIZE_STRATEGY,
  shouldPinPortfolioGridLeadColumns,
} from "./portfolio-grid-helpers";
import {
  buildTransactionFilterOptions,
  shouldReuseInitialTransactions,
} from "./portfolio-transactions-grid-helpers";
import PortfolioModuleState from "./portfolio-module-state";

import "ag-grid-community/styles/ag-grid.css";
import "ag-grid-community/styles/ag-theme-quartz.css";

ensureAgGridModulesRegistered();

type PortfolioTransactionsGridProps = {
  portfolioId: string;
  baseCurrency: string;
  asOfDate: string;
  defaultStartDate: string;
  defaultEndDate: string;
  initialTransactions: PortfolioTransactionView[];
  suspendInitialFetch?: boolean;
  externalFilter?: PortfolioTransactionDrilldownFilter | null;
  onClearExternalFilter?: () => void;
  onRowSelect?: (row: TransactionRow) => void;
};

export type TransactionRow = {
  transactionId: string;
  tradeDate: string;
  settleDate: string | null;
  type: string;
  instrument: string;
  quantity: number;
  amount: number | null;
  currency: string;
  status: string;
  componentType: string | null;
  raw: PortfolioTransactionView;
};

export default function PortfolioTransactionsGrid({
  portfolioId,
  baseCurrency,
  asOfDate,
  defaultStartDate,
  defaultEndDate,
  initialTransactions,
  suspendInitialFetch = false,
  externalFilter,
  onClearExternalFilter,
  onRowSelect,
}: PortfolioTransactionsGridProps) {
  const [transactionType, setTransactionType] = useState("ALL");
  const [componentType, setComponentType] = useState("ALL");
  const [startDate, setStartDate] = useState(defaultStartDate);
  const [endDate, setEndDate] = useState(defaultEndDate);
  const [transactions, setTransactions] = useState<PortfolioTransactionView[]>(initialTransactions);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [showFilters, setShowFilters] = useState(true);
  const [showExpandedColumns, setShowExpandedColumns] = useState(false);
  const gridDensity = showExpandedColumns ? "expanded" : "essential";

  useEffect(() => {
    setStartDate(defaultStartDate);
    setEndDate(defaultEndDate);
  }, [defaultEndDate, defaultStartDate]);

  useEffect(() => {
    let cancelled = false;

    async function loadTransactions() {
      if (suspendInitialFetch && !initialTransactions.length) {
        setLoading(true);
        setLoadError(false);
        return;
      }

      const shouldUseInitialTransactions = shouldReuseInitialTransactions({
        externalFilter,
        transactionType,
        componentType,
        startDate,
        endDate,
        defaultStartDate,
        defaultEndDate,
        initialTransactionCount: initialTransactions.length,
      });

      if (shouldUseInitialTransactions) {
        setTransactions(initialTransactions);
        setLoading(false);
        setLoadError(false);
        return;
      }

      setLoading(true);
      setLoadError(false);
      const payload = await getPortfolioTransactionLedger(portfolioId, {
        asOfDate,
        startDate,
        endDate,
        transactionType,
        componentType,
        securityId: externalFilter?.kind === "security" ? externalFilter.security_id : undefined,
        limit: 200,
      });

      if (!cancelled) {
        if (payload) {
          setTransactions(payload.transactions ?? []);
        } else {
          setTransactions([]);
          setLoadError(true);
        }
        setLoading(false);
      }
    }

    void loadTransactions();

    return () => {
      cancelled = true;
    };
  }, [
    asOfDate,
    defaultEndDate,
    defaultStartDate,
    endDate,
    externalFilter,
    initialTransactions,
    portfolioId,
    startDate,
    suspendInitialFetch,
    componentType,
    transactionType,
  ]);

  const transactionTypeOptions = useMemo(
    () => buildTransactionFilterOptions([...initialTransactions, ...transactions], (transaction) => transaction.transaction_type),
    [initialTransactions, transactions]
  );

  const componentTypeOptions = useMemo(
    () => buildTransactionFilterOptions([...initialTransactions, ...transactions], (transaction) => transaction.component_type),
    [initialTransactions, transactions]
  );

  const filteredTransactions = useMemo(
    () => filterTransactionsByDrilldown(transactions, externalFilter ?? null),
    [externalFilter, transactions]
  );

  const rowData = useMemo<TransactionRow[]>(
    () =>
      filteredTransactions.map((transaction) => ({
        transactionId: transaction.transaction_id,
        tradeDate: transaction.transaction_date,
        settleDate: transaction.settlement_date ?? null,
        type: formatStatus(transaction.transaction_type),
        instrument: transaction.instrument_id,
        quantity: transaction.quantity,
        amount: transaction.net_cost_base ?? transaction.gross_amount ?? null,
        currency: transaction.currency ?? baseCurrency,
        status: formatStatus(transaction.settlement_status),
        componentType: transaction.component_type ? formatStatus(transaction.component_type) : null,
        raw: transaction,
      })),
    [baseCurrency, filteredTransactions]
  );

  const columnDefs = useMemo<ColDef<TransactionRow>[]>(
    () => [
      buildTransactionColumn({
        field: "tradeDate",
        headerName: "Trade Date",
        pinned: shouldPinPortfolioGridLeadColumns(gridDensity) ? "left" : null,
        minWidth: 118,
        valueFormatter: ({ value }) => formatDate(value),
      }),
      buildTransactionColumn({
        field: "type",
        headerName: "Type",
        minWidth: 104,
      }),
      buildTransactionColumn({
        field: "settleDate",
        headerName: "Settle Date",
        minWidth: 118,
        valueFormatter: ({ value }) => formatDate(value),
      }),
      buildTransactionColumn({
        field: "instrument",
        headerName: "Instrument",
        minWidth: 126,
        flex: 1.2,
      }),
      buildTransactionColumn({
        field: "quantity",
        headerName: "Quantity",
        minWidth: 104,
        type: "numericColumn",
        valueFormatter: ({ value }) => formatQuantity(value),
      }),
      buildTransactionColumn({
        field: "amount",
        headerName: "Amount",
        minWidth: 126,
        type: "numericColumn",
        valueFormatter: ({ value, data }) => formatCurrency(value, data?.currency ?? baseCurrency),
      }),
      buildTransactionColumn({
        field: "currency",
        headerName: "Currency",
        minWidth: 92,
      }),
      buildTransactionColumn({
        field: "status",
        headerName: "Status",
        minWidth: 106,
      }),
      buildTransactionColumn({
        field: "componentType",
        headerName: "Component Type",
        minWidth: 126,
        hide: !showExpandedColumns,
      }),
      buildTransactionColumn({
        field: "transactionId",
        headerName: "Transaction ID",
        minWidth: 146,
        hide: !showExpandedColumns,
      }),
    ],
    [baseCurrency, gridDensity, showExpandedColumns]
  );

  return (
    <div className="portfolio-grid-module">
      <SectionHeader
        title="Transactions"
        subtitle={`Activity since ${formatDate(defaultStartDate)}`}
        actions={
          <>
            <Button size="small" variant={showFilters ? "contained" : "outlined"} onClick={() => setShowFilters((current) => !current)}>
              Filter
            </Button>
            <Button
              size="small"
              variant="outlined"
              aria-label="Export transactions"
              onClick={() => exportTransactionsXlsx(rowData, baseCurrency)}
            >
              Export
            </Button>
            <Button
              size="small"
              variant="outlined"
              aria-label={showExpandedColumns ? "Show essential transaction columns" : "Show expanded transaction columns"}
              onClick={() => setShowExpandedColumns((current) => !current)}
            >
              Expand
            </Button>
          </>
        }
      />

      {showFilters ? (
        <div className="portfolio-grid-toolbar portfolio-grid-toolbar-stacked">
          <div className="portfolio-grid-toolbar-copy">
            <span>Ledger view filtered by transaction type, component type, and trade date window</span>
          </div>
          <div className="portfolio-grid-filter-row">
            <FormControl size="small" className="portfolio-grid-filter-control">
              <InputLabel id="transaction-type-label">Type</InputLabel>
              <Select
                labelId="transaction-type-label"
                label="Type"
                value={transactionType}
                inputProps={{ "aria-label": "Transaction type filter" }}
                onChange={(event) => setTransactionType(event.target.value)}
              >
                {transactionTypeOptions.map((option) => (
                  <MenuItem key={option} value={option}>
                    {option === "ALL" ? "All Types" : formatStatus(option)}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <FormControl size="small" className="portfolio-grid-filter-control">
              <InputLabel id="transaction-component-type-label">Component</InputLabel>
              <Select
                labelId="transaction-component-type-label"
                label="Component"
                value={componentType}
                inputProps={{ "aria-label": "Transaction component type filter" }}
                onChange={(event) => setComponentType(event.target.value)}
              >
                {componentTypeOptions.map((option) => (
                  <MenuItem key={option} value={option}>
                    {option === "ALL" ? "All Components" : formatStatus(option)}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <TextField
              size="small"
              label="From"
              type="date"
              value={startDate}
              inputProps={{ "aria-label": "Transaction start date" }}
              onChange={(event) => setStartDate(event.target.value)}
              InputLabelProps={{ shrink: true }}
            />
            <TextField
              size="small"
              label="To"
              type="date"
              value={endDate}
              inputProps={{ "aria-label": "Transaction end date" }}
              onChange={(event) => setEndDate(event.target.value)}
              InputLabelProps={{ shrink: true }}
            />
          </div>
        </div>
      ) : null}

      {externalFilter ? (
        <div className="portfolio-grid-toolbar">
          <div className="portfolio-grid-toolbar-copy">
            <span>{externalFilter.label}</span>
          </div>
          <div className="portfolio-grid-toolbar-actions">
            <Button size="small" variant="text" onClick={onClearExternalFilter}>
              Clear drill-down
            </Button>
            <span>{rowData.length} matching transactions in the current view</span>
          </div>
        </div>
      ) : null}

      {loading && !rowData.length ? (
        <PortfolioModuleState
          variant="loading"
          title="Loading transactions"
          message="Transaction ledger detail is loading for the selected window."
          rows={5}
        />
      ) : rowData.length ? (
        <div
          className={`ag-theme-quartz portfolio-data-grid ${showExpandedColumns ? "portfolio-data-grid-dense" : ""}`}
          aria-label="Portfolio transactions grid"
        >
          <AgGridReact<TransactionRow>
            rowData={rowData}
            columnDefs={columnDefs}
            theme="legacy"
            autoSizeStrategy={PORTFOLIO_GRID_AUTO_SIZE_STRATEGY}
            defaultColDef={DEFAULT_GRID_COLUMN_DEF}
            animateRows={false}
            domLayout="autoHeight"
            headerHeight={showExpandedColumns ? 36 : 38}
            rowHeight={showExpandedColumns ? 38 : 42}
            ensureDomOrder
            suppressCellFocus={false}
            onRowClicked={({ data }) => {
              if (data) {
                onRowSelect?.(data);
              }
            }}
          />
        </div>
      ) : loadError ? (
        <PortfolioModuleState
          variant="status"
          state="error"
          title="Transaction history unavailable"
          body="We could not load the transaction ledger for the selected period."
          hint="Retry the request or narrow the date window. If the issue persists, check upstream ledger availability."
        />
      ) : externalFilter ? (
        <PortfolioModuleState
          variant="status"
          state="empty"
          title="No matching transactions in view"
          body="The current drill-down does not match any transactions in the selected ledger window."
          hint="Clear the drill-down or widen the period to inspect a broader transaction history."
          action={
            <Button size="small" variant="text" onClick={onClearExternalFilter}>
              Clear drill-down
            </Button>
          }
        />
      ) : (
        <PortfolioModuleState
          variant="status"
          state="empty"
          title="No transactions booked"
          body="No funding, trading, or cash activity has been recorded in the selected window."
          hint="Start with a funding entry or the first trade."
          action={
            <a href={`/workbench?portfolioId=${encodeURIComponent(portfolioId)}`}>Book first transaction</a>
          }
        />
      )}

      {loading && rowData.length ? (
        <WorkbenchInlineRefreshNote message="Refreshing transactions…" />
      ) : null}
    </div>
  );
}

const DEFAULT_GRID_COLUMN_DEF: ColDef = {
  sortable: true,
  resizable: true,
  filter: false,
  suppressMovable: false,
  cellClass: "portfolio-data-grid-cell",
  headerClass: "portfolio-data-grid-header-cell",
};

function buildTransactionColumn(config: ColDef<TransactionRow>): ColDef<TransactionRow> {
  const isNumericColumn = config.type === "numericColumn";
  return {
    ...config,
    cellClass: isNumericColumn
      ? "portfolio-data-grid-cell portfolio-data-grid-cell-numeric"
      : "portfolio-data-grid-cell",
    headerClass: isNumericColumn
      ? "portfolio-data-grid-header-cell portfolio-data-grid-header-cell-numeric"
      : "portfolio-data-grid-header-cell",
    tooltipValueGetter: (params) => String(params.value ?? ""),
  };
}

function exportTransactionsXlsx(rows: TransactionRow[], baseCurrency: string) {
  const exportRows = rows.map((row) => ({
    "Trade Date": formatDate(row.tradeDate),
    "Settle Date": formatDate(row.settleDate),
    Type: row.type,
    Instrument: row.instrument,
    Quantity: row.quantity,
    [`Amount (${baseCurrency})`]: row.amount ?? "",
    Currency: row.currency,
    Status: row.status,
  }));
  const worksheet = XLSX.utils.json_to_sheet(exportRows);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Transactions");
  XLSX.writeFileXLSX(workbook, "portfolio-transactions.xlsx");
}
