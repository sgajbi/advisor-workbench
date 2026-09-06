"use client";

import { useEffect, useMemo, useState } from "react";

import type { ColDef, ICellRendererParams } from "ag-grid-community";
import Button from "@mui/material/Button";
import FormControl from "@mui/material/FormControl";
import InputLabel from "@mui/material/InputLabel";
import MenuItem from "@mui/material/MenuItem";
import Select from "@mui/material/Select";
import TextField from "@mui/material/TextField";

import { WorkbenchInlineRefreshNote } from "@/design-system";

import { getPortfolioTransactionLedger } from "../api";
import {
  formatBusinessDate,
  formatCurrency,
  formatDate,
  formatQuantity,
  formatStatus,
} from "../formatters";
import type {
  PortfolioTransactionDrilldownFilter,
  PortfolioTransactionLedgerPage,
  PortfolioTransactionView,
} from "../types";
import { filterTransactionsByDrilldown } from "../view-model";
import { buildPortfolioTransactionSettlementSummary } from "../portfolio-transaction-settlement-view-model";
import { PORTFOLIO_CURRENCY_LABELS } from "../portfolio-terminology";
import {
  buildPortfolioDataGridColumn,
  getPortfolioAmountToneClass,
} from "./portfolio-grid-helpers";
import {
  buildTransactionExportRows,
  buildTransactionFilterOptions,
  buildTransactionLedgerQuery,
  buildTransactionRows,
  formatTransactionLedgerCoverage,
  shouldReuseInitialTransactions,
  type TransactionRow,
} from "./portfolio-transactions-grid-helpers";
import PortfolioDataGridFrame from "./portfolio-data-grid-frame";
import { downloadCsv } from "./portfolio-grid-export";
import PortfolioModuleState from "./portfolio-module-state";
import PortfolioRecordGridShell from "./portfolio-record-grid-shell";

export type { TransactionRow } from "./portfolio-transactions-grid-helpers";

type PortfolioTransactionsGridProps = {
  portfolioId: string;
  baseCurrency: string;
  asOfDate: string;
  defaultStartDate: string;
  defaultEndDate: string;
  initialTransactions: PortfolioTransactionView[];
  initialLedgerPage?: PortfolioTransactionLedgerPage;
  suspendInitialFetch?: boolean;
  externalFilter?: PortfolioTransactionDrilldownFilter | null;
  onClearExternalFilter?: () => void;
  onRowSelect?: (row: TransactionRow) => void;
};

type TransactionDateDraft = {
  defaultDateKey: string;
  startDate: string;
  endDate: string;
};

type TransactionPageDraft = {
  pageScopeKey: string;
  pageSkip: number;
};

export default function PortfolioTransactionsGrid(props: PortfolioTransactionsGridProps) {
  const defaultDateKey = `${props.defaultStartDate}|${props.defaultEndDate}`;

  return (
    <PortfolioTransactionsGridBody
      key={`${props.portfolioId}|${defaultDateKey}|${JSON.stringify(props.externalFilter ?? null)}`}
      {...props}
    />
  );
}

function PortfolioTransactionsGridBody({
  portfolioId,
  baseCurrency,
  asOfDate,
  defaultStartDate,
  defaultEndDate,
  initialTransactions,
  initialLedgerPage,
  suspendInitialFetch = false,
  externalFilter,
  onClearExternalFilter,
  onRowSelect,
}: PortfolioTransactionsGridProps) {
  const [transactionType, setTransactionType] = useState("ALL");
  const [componentType, setComponentType] = useState("ALL");
  const defaultDateKey = `${defaultStartDate}|${defaultEndDate}`;
  const [dateDraft, setDateDraft] = useState<TransactionDateDraft>({
    defaultDateKey,
    startDate: defaultStartDate,
    endDate: defaultEndDate,
  });
  const activeDateDraft =
    dateDraft.defaultDateKey === defaultDateKey
      ? dateDraft
      : {
          defaultDateKey,
          startDate: defaultStartDate,
          endDate: defaultEndDate,
        };
  const startDate = activeDateDraft.startDate;
  const endDate = activeDateDraft.endDate;
  const [transactions, setTransactions] = useState<PortfolioTransactionView[]>(initialTransactions);
  const [ledgerPage, setLedgerPage] = useState<PortfolioTransactionLedgerPage>(() => ({
    total: initialLedgerPage?.total ?? initialTransactions.length,
    skip: initialLedgerPage?.skip ?? 0,
    limit: initialLedgerPage?.limit ?? 200,
  }));
  const pageScopeKey = `${portfolioId}|${defaultDateKey}|${JSON.stringify(externalFilter ?? null)}`;
  const [pageDraft, setPageDraft] = useState<TransactionPageDraft>({
    pageScopeKey,
    pageSkip: initialLedgerPage?.skip ?? 0,
  });
  const pageSkip = pageDraft.pageScopeKey === pageScopeKey ? pageDraft.pageSkip : 0;
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [showFilters, setShowFilters] = useState(true);
  const [showExpandedColumns, setShowExpandedColumns] = useState(false);
  const [quickSearch, setQuickSearch] = useState("");
  const gridDensity = showExpandedColumns ? "expanded" : "essential";

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
        skip: pageSkip,
      });

      if (shouldUseInitialTransactions) {
        setTransactions(initialTransactions);
        setLedgerPage({
          total: initialLedgerPage?.total ?? initialTransactions.length,
          skip: initialLedgerPage?.skip ?? 0,
          limit: initialLedgerPage?.limit ?? 200,
        });
        setLoading(false);
        setLoadError(false);
        return;
      }

      setLoading(true);
      setLoadError(false);
      const payload = await getPortfolioTransactionLedger(portfolioId, buildTransactionLedgerQuery({
        asOfDate,
        startDate,
        endDate,
        transactionType,
        componentType,
        externalFilter,
        skip: pageSkip,
      }));

      if (!cancelled) {
        if (payload) {
          setTransactions(payload.transactions ?? []);
          setLedgerPage({
            total: payload.total ?? payload.transactions.length,
            skip: payload.skip ?? pageSkip,
            limit: payload.limit ?? 200,
          });
        } else {
          setTransactions([]);
          setLedgerPage({ total: 0, skip: pageSkip, limit: 200 });
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
    initialLedgerPage,
    pageSkip,
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
    () => buildTransactionRows(filteredTransactions, baseCurrency),
    [baseCurrency, filteredTransactions]
  );

  const columnDefs = useMemo<ColDef<TransactionRow>[]>(
    () => [
      buildTransactionColumn({
        field: "tradeDate",
        headerName: "Trade Date",
        minWidth: 118,
        valueFormatter: ({ value }) => formatBusinessDate(value),
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
        valueFormatter: ({ value }) => formatBusinessDate(value),
      }),
      buildTransactionColumn({
        field: "instrument",
        headerName: "Instrument",
        minWidth: 190,
        flex: 1.5,
        cellRenderer: transactionInstrumentCellRenderer,
      }),
      buildTransactionColumn({
        colId: "settlementStatus",
        headerName: "Settlement Status",
        minWidth: 132,
        maxWidth: 152,
        pinned: "right",
        valueGetter: ({ data }) => data?.settlementState.label ?? "",
        cellRenderer: transactionStatusCellRenderer,
      }),
      buildTransactionColumn({
        field: "quantity",
        headerName: "Quantity",
        minWidth: 104,
        type: "numericColumn",
        valueFormatter: ({ value }) => formatQuantity(value),
        hide: !showExpandedColumns,
      }),
      buildTransactionColumn({
        field: "price",
        headerName: "Price",
        minWidth: 108,
        type: "numericColumn",
        valueFormatter: ({ value, data }) =>
          value === null || value === undefined
            ? "—"
            : formatCurrency(value, data?.priceCurrency ?? baseCurrency),
        hide: !showExpandedColumns,
      }),
      buildTransactionColumn({
        field: "grossAmount",
        headerName: "Gross Amount",
        minWidth: 126,
        type: "numericColumn",
        valueFormatter: ({ value, data }) =>
          formatCurrency(value, data?.transactionCurrency ?? baseCurrency),
      }),
      buildTransactionColumn({
        field: "transactionCurrency",
        headerName: PORTFOLIO_CURRENCY_LABELS.transaction,
        minWidth: 118,
        hide: !showExpandedColumns,
      }),
      buildTransactionColumn({
        field: "netCostBase",
        headerName: `Net Cost (${baseCurrency})`,
        minWidth: 132,
        type: "numericColumn",
        valueFormatter: ({ value }) => formatCurrency(value, baseCurrency),
        cellClass: ({ value }) =>
          `portfolio-data-grid-cell portfolio-data-grid-cell-numeric ${getPortfolioAmountToneClass(value)}`,
      }),
      buildTransactionColumn({
        field: "realizedGainLossBase",
        headerName: `Realised P&L (${baseCurrency})`,
        minWidth: 142,
        type: "numericColumn",
        valueFormatter: ({ value }) => formatCurrency(value, baseCurrency),
        cellClass: ({ value }) =>
          `portfolio-data-grid-cell portfolio-data-grid-cell-numeric ${getPortfolioAmountToneClass(value)}`,
        hide: !showExpandedColumns,
      }),
      buildTransactionColumn({
        field: "componentType",
        headerName: "Component Type",
        minWidth: 126,
        hide: !showExpandedColumns,
      }),
      buildTransactionColumn({
        field: "sourceSystem",
        headerName: "Source",
        minWidth: 116,
        hide: !showExpandedColumns,
      }),
      buildTransactionColumn({
        field: "transactionId",
        headerName: "Transaction ID",
        minWidth: 146,
        hide: !showExpandedColumns,
      }),
      buildTransactionColumn({
        colId: "review",
        headerName: "Review",
        minWidth: 92,
        maxWidth: 104,
        pinned: "right",
        sortable: false,
        filter: false,
        hide: !onRowSelect,
        cellRenderer: (params: ICellRendererParams<TransactionRow>) =>
          params.data ? (
            <Button
              size="small"
              variant="text"
              onClick={(event) => {
                event.stopPropagation();
                onRowSelect?.(params.data!);
              }}
              aria-label={`Review transaction ${params.data.transactionId}`}
              data-transaction-review-id={params.data.transactionId}
            >
              Review
            </Button>
          ) : null,
      }),
    ],
    [baseCurrency, onRowSelect, showExpandedColumns]
  );

  const settlementSummary = buildPortfolioTransactionSettlementSummary(filteredTransactions);
  const coverageLabel = formatTransactionLedgerCoverage({
    total: ledgerPage.total,
    skip: ledgerPage.skip,
    visibleCount: rowData.length,
  });
  const hasPreviousPage = ledgerPage.skip > 0;
  const hasNextPage = ledgerPage.skip + rowData.length < ledgerPage.total;

  return (
    <PortfolioRecordGridShell
      kicker="Transaction review"
      title="Booked activity"
      description={`Source-booked activity from ${formatDate(startDate)} to ${formatDate(endDate)}. Local gross amounts remain distinct from ${baseCurrency} portfolio amounts.`}
      summaryLabel={coverageLabel}
      summaryValue={settlementSummary.detail}
      searchControl={
        <TextField
          size="small"
          value={quickSearch}
          onChange={(event) => setQuickSearch(event.target.value)}
          placeholder="Search transaction, instrument, or status"
          inputProps={{ "aria-label": "Search transactions" }}
          className="portfolio-record-search"
        />
      }
      actions={
        <>
          <Button size="small" variant={showFilters ? "contained" : "outlined"} onClick={() => setShowFilters((current) => !current)}>
            Filters
          </Button>
          <Button
            size="small"
            variant="outlined"
            aria-label="Export transactions"
            onClick={() => exportTransactionsCsv(rowData, baseCurrency)}
          >
            Export
          </Button>
          <Button
            size="small"
            variant="outlined"
            aria-label={showExpandedColumns ? "Show essential transaction columns" : "Show expanded transaction columns"}
            onClick={() => setShowExpandedColumns((current) => !current)}
          >
            {showExpandedColumns ? "Show essential columns" : "Show all columns"}
          </Button>
        </>
      }
    >

      {showFilters ? (
        <div className="portfolio-grid-toolbar portfolio-grid-toolbar-stacked">
          <div className="portfolio-grid-toolbar-copy">
            <span>Refine booked activity by activity type, booking component, and trade-date window.</span>
          </div>
          <div className="portfolio-grid-filter-row">
            <FormControl size="small" className="portfolio-grid-filter-control">
              <InputLabel id="transaction-type-label">Activity type</InputLabel>
              <Select
                labelId="transaction-type-label"
                label="Activity type"
                value={transactionType}
                inputProps={{ "aria-label": "Transaction type filter" }}
                onChange={(event) => {
                  setTransactionType(event.target.value);
                  setPageDraft({ pageScopeKey, pageSkip: 0 });
                }}
              >
                {transactionTypeOptions.map((option) => (
                  <MenuItem key={option} value={option}>
                    {option === "ALL" ? "All Types" : formatStatus(option)}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <FormControl size="small" className="portfolio-grid-filter-control">
              <InputLabel id="transaction-component-type-label">Booking component</InputLabel>
              <Select
                labelId="transaction-component-type-label"
                label="Booking component"
                value={componentType}
                inputProps={{ "aria-label": "Transaction component type filter" }}
                onChange={(event) => {
                  setComponentType(event.target.value);
                  setPageDraft({ pageScopeKey, pageSkip: 0 });
                }}
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
              label="Trade date from"
              type="date"
              value={startDate}
              inputProps={{ "aria-label": "Transaction start date" }}
              onChange={(event) => {
                setDateDraft({
                  ...activeDateDraft,
                  startDate: event.target.value,
                });
                setPageDraft({ pageScopeKey, pageSkip: 0 });
              }}
              InputLabelProps={{ shrink: true }}
            />
            <TextField
              size="small"
              label="Trade date to"
              type="date"
              value={endDate}
              inputProps={{ "aria-label": "Transaction end date" }}
              onChange={(event) => {
                setDateDraft({
                  ...activeDateDraft,
                  endDate: event.target.value,
                });
                setPageDraft({ pageScopeKey, pageSkip: 0 });
              }}
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
            <span>{ledgerPage.total} matching transactions in the selected period</span>
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
        <PortfolioDataGridFrame<TransactionRow>
          ariaLabel="Portfolio transactions grid"
          density={gridDensity}
          rowData={rowData}
          columnDefs={columnDefs}
          quickFilterText={quickSearch}
          getRowId={({ data }) => data.transactionId}
          onRowClicked={({ data }) => {
            if (data) {
              onRowSelect?.(data);
            }
          }}
        />
      ) : loadError ? (
        <PortfolioModuleState
          variant="status"
          state="error"
          title="Transaction history unavailable"
          body="We could not load the transaction ledger for the selected period."
          hint="Retry the request or narrow the date window. If the issue persists, verify ledger availability."
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
          hint="Confirm the trade-date window and source-book availability. Transaction booking is completed in the owning booking workflow."
        />
      )}

      {rowData.length && (hasPreviousPage || hasNextPage) ? (
        <div className="portfolio-grid-toolbar" aria-label="Transaction ledger pages">
          <div className="portfolio-grid-toolbar-copy">
            <span>{coverageLabel}</span>
          </div>
          <div className="portfolio-grid-toolbar-actions">
            <Button
              size="small"
              variant="outlined"
              disabled={!hasPreviousPage || loading}
              onClick={() =>
                setPageDraft({
                  pageScopeKey,
                  pageSkip: Math.max(0, ledgerPage.skip - ledgerPage.limit),
                })
              }
            >
              Previous entries
            </Button>
            <Button
              size="small"
              variant="outlined"
              disabled={!hasNextPage || loading}
              onClick={() =>
                setPageDraft({
                  pageScopeKey,
                  pageSkip: ledgerPage.skip + ledgerPage.limit,
                })
              }
            >
              Next entries
            </Button>
          </div>
        </div>
      ) : null}

      {loading && rowData.length ? (
        <WorkbenchInlineRefreshNote message="Refreshing transactions…" />
      ) : null}
    </PortfolioRecordGridShell>
  );
}

function buildTransactionColumn(config: ColDef<TransactionRow>): ColDef<TransactionRow> {
  return buildPortfolioDataGridColumn(config);
}

function transactionInstrumentCellRenderer(params: ICellRendererParams<TransactionRow, string>) {
  const row = params.data;
  if (!row) {
    return params.value ?? "";
  }

  return (
    <div className="portfolio-instrument-cell">
      <strong>{row.instrument}</strong>
      <span>{row.securityId || row.transactionId}</span>
    </div>
  );
}

function transactionStatusCellRenderer(params: ICellRendererParams<TransactionRow, string>) {
  const state = params.data?.settlementState;
  return (
    <span className={`portfolio-position-status portfolio-position-status-${state?.tone ?? "neutral"}`}>
      {state?.label ?? "Not applicable"}
    </span>
  );
}

function exportTransactionsCsv(rows: TransactionRow[], baseCurrency: string) {
  downloadCsv("portfolio-transactions.csv", buildTransactionExportRows(rows, baseCurrency));
}
