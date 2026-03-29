import React from "react";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("ag-grid-react", () => ({
  AgGridReact: ({ rowData = [], columnDefs = [], onRowClicked }: any) => {
    const visibleColumns = columnDefs.filter((column: any) => !column.hide);
    return (
      <div data-testid="mock-grid">
        <div>
          {visibleColumns.map((column: any) => (
            <span key={column.field}>{column.headerName}</span>
          ))}
        </div>
        {rowData.map((row: any) => (
          <button key={row.securityId ?? row.transactionId} onClick={() => onRowClicked?.({ data: row })}>
            {visibleColumns
              .map((column: any) => {
                const value = row[column.field];
                if (typeof column.valueFormatter === "function") {
                  return column.valueFormatter({ value, data: row });
                }
                return value ?? "";
              })
              .join(" | ")}
          </button>
        ))}
      </div>
    );
  },
}));

vi.mock("xlsx", () => ({
  utils: {
    json_to_sheet: vi.fn(() => ({})),
    book_new: vi.fn(() => ({})),
    book_append_sheet: vi.fn(),
  },
  writeFileXLSX: vi.fn(),
}));

import PortfolioHoldingsGrid from "../../src/apps/portfolio/components/portfolio-holdings-grid";
import PortfolioTransactionsGrid from "../../src/apps/portfolio/components/portfolio-transactions-grid";

describe("portfolio data grids", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("renders holdings columns, supports clearing a filter, and opens the detail drawer", async () => {
    const onClearFilter = vi.fn();
    const onRowSelect = vi.fn();

    render(
      <PortfolioHoldingsGrid
        portfolioId="MANUAL_PB_USD_001"
        positions={[
          {
            security_id: "EQ_1",
            instrument_name: "Apple Inc.",
            asset_class: "Equities",
            quantity: 700,
            market_price: 210,
            market_value_base: 147000,
            unrealized_gain_loss_base: 12000,
            weight_pct: 14.67,
            currency: "USD",
            sector: "Technology",
            held_since_date: "2026-03-10",
          },
        ]}
        baseCurrency="USD"
        asOfDate="2026-03-28"
        columnMode="expanded"
        filterLabel="Filtered by Asset Class: Equities"
        onClearFilter={onClearFilter}
        onRowSelect={onRowSelect}
      />
    );

    expect(screen.getByRole("heading", { name: "Holdings" })).toBeInTheDocument();
    expect(screen.getByText("As of 28 Mar 2026 in USD")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Choose holdings columns" })).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Filter active: Filtered by Asset Class: Equities" })
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Export holdings" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Show expanded holdings columns" })).toBeInTheDocument();
    expect(screen.getByText("Instrument")).toBeInTheDocument();
    expect(screen.getByText("Market Value")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /Clear filter/i }));
    expect(onClearFilter).toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: /Apple Inc/i }));
    await waitFor(() => expect(onRowSelect).toHaveBeenCalledTimes(1));
    expect(onRowSelect.mock.calls[0][0].securityId).toBe("EQ_1");
  });

  it("renders transactions with filters and raises the row-selection callback", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        new Response(
          JSON.stringify({
            total: 1,
            skip: 0,
            limit: 200,
            transactions: [
              {
                transaction_id: "TX_1",
                transaction_date: "2026-03-20T00:00:00Z",
                transaction_type: "BUY",
                component_type: "TRADE",
                security_id: "EQ_1",
                instrument_id: "AAPL",
                quantity: 50,
                net_cost_base: 9000,
                currency: "USD",
                settlement_status: "SETTLED",
              },
            ],
          }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        )
      )
    );

    const onRowSelect = vi.fn();

    render(
      <PortfolioTransactionsGrid
        portfolioId="MANUAL_PB_USD_001"
        baseCurrency="USD"
        asOfDate="2026-03-28"
        defaultStartDate="2026-03-01"
        defaultEndDate="2026-03-28"
        initialTransactions={[
          {
            transaction_id: "TX_1",
            transaction_date: "2026-03-20T00:00:00Z",
            transaction_type: "BUY",
            security_id: "EQ_1",
            instrument_id: "AAPL",
            quantity: 50,
            net_cost_base: 9000,
            currency: "USD",
            settlement_status: "SETTLED",
          },
        ]}
        onRowSelect={onRowSelect}
      />
    );

    expect(screen.getByRole("heading", { name: "Transactions" })).toBeInTheDocument();
    expect(screen.getByText("Activity since 01 Mar 2026")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Filter" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Export transactions" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Show expanded transaction columns" })).toBeInTheDocument();
    expect(screen.getByLabelText("Transaction type filter")).toBeInTheDocument();
    expect(screen.getByLabelText("Transaction start date")).toHaveValue("2026-03-01");
    expect(screen.getByLabelText("Transaction end date")).toHaveValue("2026-03-28");

    await waitFor(() => {
      expect(screen.getByText("Trade Date")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: /20 Mar 2026/i }));
    await waitFor(() => expect(onRowSelect).toHaveBeenCalledTimes(1));
    expect(onRowSelect.mock.calls[0][0].transactionId).toBe("TX_1");
  });

  it("applies an external transaction drill-down filter and allows clearing it", async () => {
    const onClearExternalFilter = vi.fn();

    render(
      <PortfolioTransactionsGrid
        portfolioId="MANUAL_PB_USD_001"
        baseCurrency="USD"
        asOfDate="2026-03-28"
        defaultStartDate="2026-03-01"
        defaultEndDate="2026-03-28"
        externalFilter={{
          kind: "security",
          security_id: "EQ_1",
          label: "Filtered by security: Apple Inc.",
        }}
        onClearExternalFilter={onClearExternalFilter}
        initialTransactions={[
          {
            transaction_id: "TX_1",
            transaction_date: "2026-03-20T00:00:00Z",
            transaction_type: "BUY",
            security_id: "EQ_1",
            instrument_id: "AAPL",
            quantity: 50,
            net_cost_base: 9000,
            currency: "USD",
            settlement_status: "SETTLED",
          },
          {
            transaction_id: "TX_2",
            transaction_date: "2026-03-18T00:00:00Z",
            transaction_type: "BUY",
            security_id: "EQ_2",
            instrument_id: "MSFT",
            quantity: 25,
            net_cost_base: 5000,
            currency: "USD",
            settlement_status: "SETTLED",
          },
        ]}
      />
    );

    expect(screen.getByText("Filtered by security: Apple Inc.")).toBeInTheDocument();
    expect(screen.getByText("1 matching transactions in the current view")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /18 Mar 2026 \| — \| Buy \| MSFT/i })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /Clear drill-down/i }));
    expect(onClearExternalFilter).toHaveBeenCalled();
  });

  it("shows an empty-state CTA for holdings with no rows", () => {
    render(
      <PortfolioHoldingsGrid
        portfolioId="MANUAL_PB_USD_001"
        positions={[]}
        baseCurrency="USD"
        asOfDate="2026-03-28"
        columnMode="essential"
      />
    );

    expect(screen.getByText("No holdings in this portfolio")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Book first trade/i })).toBeInTheDocument();
  });

  it("shows a partial state when some holdings are unpriced", () => {
    render(
      <PortfolioHoldingsGrid
        portfolioId="MANUAL_PB_USD_001"
        positions={[
          {
            security_id: "EQ_1",
            instrument_name: "Apple Inc.",
            asset_class: "Equities",
            quantity: 700,
            market_price: null,
            market_value_base: null,
            weight_pct: null,
            currency: "USD",
          },
        ]}
        baseCurrency="USD"
        asOfDate="2026-03-28"
        columnMode="essential"
      />
    );

    expect(screen.getByText("Holdings partially valued")).toBeInTheDocument();
  });

  it("shows an actionable error state when transactions cannot be loaded", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response("{}", { status: 500 }))
    );

    render(
      <PortfolioTransactionsGrid
        portfolioId="MANUAL_PB_USD_001"
        baseCurrency="USD"
        asOfDate="2026-03-28"
        defaultStartDate="2026-03-01"
        defaultEndDate="2026-03-28"
        initialTransactions={[]}
      />
    );

    await waitFor(() => {
      expect(screen.getByText("Transaction history unavailable")).toBeInTheDocument();
    });
  });

  it("does not fetch the default transaction ledger while parent detailed data is still loading", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    render(
      <PortfolioTransactionsGrid
        portfolioId="MANUAL_PB_USD_001"
        baseCurrency="USD"
        asOfDate="2026-03-28"
        defaultStartDate="2026-03-01"
        defaultEndDate="2026-03-28"
        initialTransactions={[]}
        suspendInitialFetch
      />
    );

    expect(screen.getByRole("heading", { name: "Transactions" })).toBeInTheDocument();
    await waitFor(() => expect(fetchMock).not.toHaveBeenCalled());
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
