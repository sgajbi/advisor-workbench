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
            <React.Fragment key={column.field}>
              <span>{column.headerName}</span>
              <span data-testid={`${column.field}-header-class`}>
                {column.headerClass ?? ""}
              </span>
            </React.Fragment>
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
import * as XLSX from "xlsx";

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
    expect(screen.getByText("Weight")).toBeInTheDocument();
    expect(screen.getByText("Unrealized P&L")).toBeInTheDocument();
    expect(screen.getByTestId("marketValue-header-class")).toHaveTextContent(
      "portfolio-data-grid-header-cell-numeric"
    );
    expect(screen.getByTestId("weight-header-class")).toHaveTextContent(
      "portfolio-data-grid-header-cell-numeric"
    );
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
                settlement_date: "2026-03-24",
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
            settlement_date: "2026-03-24",
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
    expect(screen.getByLabelText("Transaction component type filter")).toBeInTheDocument();
    expect(screen.getByLabelText("Transaction start date")).toHaveValue("2026-03-01");
    expect(screen.getByLabelText("Transaction end date")).toHaveValue("2026-03-28");

    await waitFor(() => {
      expect(screen.getByText("Trade Date")).toBeInTheDocument();
    });
    expect(screen.getByText("Amount")).toBeInTheDocument();
    expect(screen.getByText("Settle Date")).toBeInTheDocument();
    expect(screen.getByText("Currency")).toBeInTheDocument();
    expect(screen.getByText("Status")).toBeInTheDocument();
    expect(screen.getByTestId("amount-header-class")).toHaveTextContent(
      "portfolio-data-grid-header-cell-numeric"
    );
    expect(screen.queryByText("Transaction lifecycle detail is limited")).not.toBeInTheDocument();
    expect(screen.queryByText(/does not expose settlement dates/i)).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /20 Mar 2026/i }));
    await waitFor(() => expect(onRowSelect).toHaveBeenCalledTimes(1));
    expect(onRowSelect.mock.calls[0][0].transactionId).toBe("TX_1");
    expect(onRowSelect.mock.calls[0][0].settleDate).toBe("2026-03-24");

    fireEvent.click(screen.getByRole("button", { name: "Export transactions" }));
    expect(XLSX.utils.json_to_sheet).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({
          "Trade Date": "20 Mar 2026",
          "Settle Date": "24 Mar 2026",
        }),
      ])
    );
  });

  it("renders the component filter alongside the strategic ledger controls", async () => {
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
            settlement_date: "2026-03-24",
            transaction_type: "BUY",
            component_type: "TRADE",
            security_id: "EQ_1",
            instrument_id: "AAPL",
            quantity: 50,
            net_cost_base: 9000,
            currency: "USD",
            settlement_status: "SETTLED",
          },
        ]}
      />
    );

    expect(screen.getByLabelText("Transaction component type filter")).toBeInTheDocument();
    expect(
      screen.getByText("Ledger view filtered by transaction type, component type, and trade date window")
    ).toBeInTheDocument();
  });

  it("applies an external transaction drill-down filter and allows clearing it", async () => {
    const onClearExternalFilter = vi.fn();
    const fetchMock = vi.fn(async () =>
      new Response(
        JSON.stringify({
          total: 1,
          skip: 0,
          limit: 200,
          transactions: [
            {
              transaction_id: "TX_3",
              transaction_date: "2026-03-12T00:00:00Z",
              settlement_date: "2026-03-14",
              transaction_type: "DIVIDEND",
              security_id: "EQ_1",
              instrument_id: "AAPL",
              quantity: 0,
              gross_amount: 1250,
              currency: "USD",
              settlement_status: "SETTLED",
            },
          ],
        }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      )
    );
    vi.stubGlobal("fetch", fetchMock);

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
            settlement_date: "2026-03-24",
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
            settlement_date: "2026-03-21",
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
    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledTimes(1);
    });
    const requestUrl = String((fetchMock.mock.calls as unknown[][])[0]?.[0] ?? "");
    expect(requestUrl).toContain("security_id=EQ_1");
    expect(screen.getByText("1 matching transactions in the current view")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /12 Mar 2026 \| Dividend \| 14 Mar 2026 \| AAPL/i })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /18 Mar 2026 \| Buy \| MSFT/i })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /Clear drill-down/i }));
    expect(onClearExternalFilter).toHaveBeenCalled();
  });

  it("requests the strategic ledger for linked transaction-group drill-downs", async () => {
    const onClearExternalFilter = vi.fn();
    const fetchMock = vi.fn(async () =>
      new Response(
        JSON.stringify({
          total: 1,
          skip: 0,
          limit: 200,
          transactions: [
            {
              transaction_id: "TX_7",
              transaction_date: "2026-03-18T00:00:00Z",
              settlement_date: "2026-03-21",
              transaction_type: "BUY",
              component_type: "FX_CONTRACT_OPEN",
              security_id: "EQ_1",
              instrument_id: "AAPL",
              quantity: 25,
              net_cost_base: 5000,
              currency: "USD",
              settlement_status: "SETTLED",
              linked_transaction_group_id: "LTG-FX-2026-0001",
            },
          ],
        }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      )
    );
    vi.stubGlobal("fetch", fetchMock);

    render(
      <PortfolioTransactionsGrid
        portfolioId="MANUAL_PB_USD_001"
        baseCurrency="USD"
        asOfDate="2026-03-28"
        defaultStartDate="2026-03-01"
        defaultEndDate="2026-03-28"
        externalFilter={{
          kind: "linked_group",
          linked_transaction_group_id: "LTG-FX-2026-0001",
          label: "Filtered by transaction group: LTG-FX-2026-0001",
        }}
        onClearExternalFilter={onClearExternalFilter}
        initialTransactions={[
          {
            transaction_id: "TX_1",
            transaction_date: "2026-03-20T00:00:00Z",
            settlement_date: "2026-03-24",
            transaction_type: "BUY",
            component_type: "TRADE",
            security_id: "EQ_1",
            instrument_id: "AAPL",
            quantity: 50,
            net_cost_base: 9000,
            currency: "USD",
            settlement_status: "SETTLED",
          },
        ]}
      />
    );

    expect(screen.getByText("Filtered by transaction group: LTG-FX-2026-0001")).toBeInTheDocument();
    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledTimes(1);
    });
    const requestUrl = String((fetchMock.mock.calls as unknown[][])[0]?.[0] ?? "");
    expect(requestUrl).toContain("linked_transaction_group_id=LTG-FX-2026-0001");
    expect(screen.getByText("1 matching transactions in the current view")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /Clear drill-down/i }));
    expect(onClearExternalFilter).toHaveBeenCalled();
  });

  it("requests the strategic ledger for FX contract drill-downs", async () => {
    const onClearExternalFilter = vi.fn();
    const fetchMock = vi.fn(async () =>
      new Response(
        JSON.stringify({
          total: 1,
          skip: 0,
          limit: 200,
          transactions: [
            {
              transaction_id: "TX_8",
              transaction_date: "2026-03-18T00:00:00Z",
              settlement_date: "2026-03-21",
              transaction_type: "BUY",
              component_type: "FX_CONTRACT_OPEN",
              security_id: "EQ_1",
              instrument_id: "AAPL",
              quantity: 25,
              net_cost_base: 5000,
              currency: "USD",
              settlement_status: "SETTLED",
              fx_contract_id: "FXC-2026-0001",
            },
          ],
        }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      )
    );
    vi.stubGlobal("fetch", fetchMock);

    render(
      <PortfolioTransactionsGrid
        portfolioId="MANUAL_PB_USD_001"
        baseCurrency="USD"
        asOfDate="2026-03-28"
        defaultStartDate="2026-03-01"
        defaultEndDate="2026-03-28"
        externalFilter={{
          kind: "fx_contract",
          fx_contract_id: "FXC-2026-0001",
          label: "Filtered by FX contract: FXC-2026-0001",
        }}
        onClearExternalFilter={onClearExternalFilter}
        initialTransactions={[
          {
            transaction_id: "TX_1",
            transaction_date: "2026-03-20T00:00:00Z",
            settlement_date: "2026-03-24",
            transaction_type: "BUY",
            component_type: "TRADE",
            security_id: "EQ_1",
            instrument_id: "AAPL",
            quantity: 50,
            net_cost_base: 9000,
            currency: "USD",
            settlement_status: "SETTLED",
          },
        ]}
      />
    );

    expect(screen.getByText("Filtered by FX contract: FXC-2026-0001")).toBeInTheDocument();
    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledTimes(1);
    });
    const requestUrl = String((fetchMock.mock.calls as unknown[][])[0]?.[0] ?? "");
    expect(requestUrl).toContain("fx_contract_id=FXC-2026-0001");
    expect(screen.getByText("1 matching transactions in the current view")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /Clear drill-down/i }));
    expect(onClearExternalFilter).toHaveBeenCalled();
  });

  it("requests the strategic ledger for swap event drill-downs", async () => {
    const onClearExternalFilter = vi.fn();
    const fetchMock = vi.fn(async () =>
      new Response(
        JSON.stringify({
          total: 1,
          skip: 0,
          limit: 200,
          transactions: [
            {
              transaction_id: "TX_9",
              transaction_date: "2026-03-18T00:00:00Z",
              settlement_date: "2026-03-21",
              transaction_type: "BUY",
              component_type: "FX_SWAP_NEAR_LEG",
              security_id: "EQ_1",
              instrument_id: "AAPL",
              quantity: 25,
              net_cost_base: 5000,
              currency: "USD",
              settlement_status: "SETTLED",
              swap_event_id: "FXSWAP-2026-0001",
            },
          ],
        }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      )
    );
    vi.stubGlobal("fetch", fetchMock);

    render(
      <PortfolioTransactionsGrid
        portfolioId="MANUAL_PB_USD_001"
        baseCurrency="USD"
        asOfDate="2026-03-28"
        defaultStartDate="2026-03-01"
        defaultEndDate="2026-03-28"
        externalFilter={{
          kind: "swap_event",
          swap_event_id: "FXSWAP-2026-0001",
          label: "Filtered by swap event: FXSWAP-2026-0001",
        }}
        onClearExternalFilter={onClearExternalFilter}
        initialTransactions={[
          {
            transaction_id: "TX_1",
            transaction_date: "2026-03-20T00:00:00Z",
            settlement_date: "2026-03-24",
            transaction_type: "BUY",
            component_type: "TRADE",
            security_id: "EQ_1",
            instrument_id: "AAPL",
            quantity: 50,
            net_cost_base: 9000,
            currency: "USD",
            settlement_status: "SETTLED",
          },
        ]}
      />
    );

    expect(screen.getByText("Filtered by swap event: FXSWAP-2026-0001")).toBeInTheDocument();
    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledTimes(1);
    });
    const requestUrl = String((fetchMock.mock.calls as unknown[][])[0]?.[0] ?? "");
    expect(requestUrl).toContain("swap_event_id=FXSWAP-2026-0001");
    expect(screen.getByText("1 matching transactions in the current view")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /Clear drill-down/i }));
    expect(onClearExternalFilter).toHaveBeenCalled();
  });

  it("requests the strategic ledger for near-leg group drill-downs", async () => {
    const onClearExternalFilter = vi.fn();
    const fetchMock = vi.fn(async () =>
      new Response(
        JSON.stringify({
          total: 1,
          skip: 0,
          limit: 200,
          transactions: [
            {
              transaction_id: "TX_10",
              transaction_date: "2026-03-18T00:00:00Z",
              settlement_date: "2026-03-21",
              transaction_type: "BUY",
              component_type: "FX_SWAP_NEAR_LEG",
              security_id: "EQ_1",
              instrument_id: "AAPL",
              quantity: 25,
              net_cost_base: 5000,
              currency: "USD",
              settlement_status: "SETTLED",
              near_leg_group_id: "FXSWAP-2026-0001-NEAR",
            },
          ],
        }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      )
    );
    vi.stubGlobal("fetch", fetchMock);

    render(
      <PortfolioTransactionsGrid
        portfolioId="MANUAL_PB_USD_001"
        baseCurrency="USD"
        asOfDate="2026-03-28"
        defaultStartDate="2026-03-01"
        defaultEndDate="2026-03-28"
        externalFilter={{
          kind: "near_leg_group",
          near_leg_group_id: "FXSWAP-2026-0001-NEAR",
          label: "Filtered by near-leg group: FXSWAP-2026-0001-NEAR",
        }}
        onClearExternalFilter={onClearExternalFilter}
        initialTransactions={[
          {
            transaction_id: "TX_1",
            transaction_date: "2026-03-20T00:00:00Z",
            settlement_date: "2026-03-24",
            transaction_type: "BUY",
            component_type: "TRADE",
            security_id: "EQ_1",
            instrument_id: "AAPL",
            quantity: 50,
            net_cost_base: 9000,
            currency: "USD",
            settlement_status: "SETTLED",
          },
        ]}
      />
    );

    expect(screen.getByText("Filtered by near-leg group: FXSWAP-2026-0001-NEAR")).toBeInTheDocument();
    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledTimes(1);
    });
    const requestUrl = String((fetchMock.mock.calls as unknown[][])[0]?.[0] ?? "");
    expect(requestUrl).toContain("near_leg_group_id=FXSWAP-2026-0001-NEAR");
    expect(screen.getByText("1 matching transactions in the current view")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /Clear drill-down/i }));
    expect(onClearExternalFilter).toHaveBeenCalled();
  });

  it("requests the strategic ledger for far-leg group drill-downs", async () => {
    const onClearExternalFilter = vi.fn();
    const fetchMock = vi.fn(async () =>
      new Response(
        JSON.stringify({
          total: 1,
          skip: 0,
          limit: 200,
          transactions: [
            {
              transaction_id: "TX_11",
              transaction_date: "2026-03-18T00:00:00Z",
              settlement_date: "2026-03-21",
              transaction_type: "SELL",
              component_type: "FX_SWAP_FAR_LEG",
              security_id: "EQ_1",
              instrument_id: "AAPL",
              quantity: 25,
              net_cost_base: 5000,
              currency: "USD",
              settlement_status: "SETTLED",
              far_leg_group_id: "FXSWAP-2026-0001-FAR",
            },
          ],
        }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      )
    );
    vi.stubGlobal("fetch", fetchMock);

    render(
      <PortfolioTransactionsGrid
        portfolioId="MANUAL_PB_USD_001"
        baseCurrency="USD"
        asOfDate="2026-03-28"
        defaultStartDate="2026-03-01"
        defaultEndDate="2026-03-28"
        externalFilter={{
          kind: "far_leg_group",
          far_leg_group_id: "FXSWAP-2026-0001-FAR",
          label: "Filtered by far-leg group: FXSWAP-2026-0001-FAR",
        }}
        onClearExternalFilter={onClearExternalFilter}
        initialTransactions={[
          {
            transaction_id: "TX_1",
            transaction_date: "2026-03-20T00:00:00Z",
            settlement_date: "2026-03-24",
            transaction_type: "BUY",
            component_type: "TRADE",
            security_id: "EQ_1",
            instrument_id: "AAPL",
            quantity: 50,
            net_cost_base: 9000,
            currency: "USD",
            settlement_status: "SETTLED",
          },
        ]}
      />
    );

    expect(screen.getByText("Filtered by far-leg group: FXSWAP-2026-0001-FAR")).toBeInTheDocument();
    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledTimes(1);
    });
    const requestUrl = String((fetchMock.mock.calls as unknown[][])[0]?.[0] ?? "");
    expect(requestUrl).toContain("far_leg_group_id=FXSWAP-2026-0001-FAR");
    expect(screen.getByText("1 matching transactions in the current view")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /Clear drill-down/i }));
    expect(onClearExternalFilter).toHaveBeenCalled();
  });

  it("shows an empty-state CTA for holdings with no rows", () => {
    const { container } = render(
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
    expect(container.querySelector(".portfolio-module-state")).toBeTruthy();
    expect(container.querySelector(".portfolio-empty-state")).toBeTruthy();
    expect(screen.queryByTestId("mock-grid")).not.toBeInTheDocument();
  });

  it("shows a partial state when some holdings are unpriced", () => {
    const { container } = render(
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
    expect(container.querySelector(".portfolio-module-state")).toBeTruthy();
    expect(container.querySelector(".module-state-panel-partial")).toBeTruthy();
    expect(screen.getByTestId("mock-grid")).toBeInTheDocument();
    expect(screen.getByText("Instrument")).toBeInTheDocument();
    expect(screen.getByText("Weight")).toBeInTheDocument();
  });

  it("shows an actionable error state when transactions cannot be loaded", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response("{}", { status: 500 }))
    );

    const { container } = render(
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
    expect(container.querySelector(".portfolio-module-state")).toBeTruthy();
    expect(container.querySelector(".module-state-panel-error")).toBeTruthy();
    expect(screen.queryByTestId("mock-grid")).not.toBeInTheDocument();
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
    expect(screen.getByText("Loading transactions")).toBeInTheDocument();
    expect(
      screen.getByText("Transaction ledger detail is loading for the selected window.")
    ).toBeInTheDocument();
    expect(document.querySelector(".portfolio-module-state")).toBeTruthy();
    await waitFor(() => expect(fetchMock).not.toHaveBeenCalled());
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("shows an empty drill-down state without mounting the transactions grid", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        new Response(
          JSON.stringify({
            total: 0,
            skip: 0,
            limit: 200,
            transactions: [],
          }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        )
      )
    );

    const { container } = render(
      <PortfolioTransactionsGrid
        portfolioId="MANUAL_PB_USD_001"
        baseCurrency="USD"
        asOfDate="2026-03-28"
        defaultStartDate="2026-03-01"
        defaultEndDate="2026-03-28"
        externalFilter={{
          kind: "security",
          security_id: "EQ_404",
          label: "Filtered by security: Missing holding",
        }}
        initialTransactions={[
          {
            transaction_id: "TX_1",
            transaction_date: "2026-03-20T00:00:00Z",
            settlement_date: "2026-03-24",
            transaction_type: "BUY",
            security_id: "EQ_1",
            instrument_id: "AAPL",
            quantity: 50,
            net_cost_base: 9000,
            currency: "USD",
            settlement_status: "SETTLED",
          },
        ]}
      />
    );

    await waitFor(() => {
      expect(screen.getByText("No matching transactions in view")).toBeInTheDocument();
    });
    expect(container.querySelector(".portfolio-module-state")).toBeTruthy();
    expect(container.querySelector(".portfolio-empty-state")).toBeTruthy();
    expect(screen.queryByTestId("mock-grid")).not.toBeInTheDocument();
  });

  it("shows a shared refresh note while transactions reload over existing rows", async () => {
    vi.stubGlobal("fetch", vi.fn(() => new Promise(() => {})));

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
      />
    );

    fireEvent.change(screen.getByLabelText("Transaction start date"), {
      target: { value: "2026-03-05" },
    });

    expect(screen.getByText("Refreshing transactions…")).toBeInTheDocument();
    expect(document.querySelector(".workbench-inline-refresh-note")).toBeTruthy();
  });

  it("keeps supported holdings and transactions on the shared grid frame path", async () => {
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
                settlement_date: "2026-03-24",
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

    const { container } = render(
      <>
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
            },
          ]}
          baseCurrency="USD"
          asOfDate="2026-03-28"
          columnMode="expanded"
        />
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
            settlement_date: "2026-03-24",
            transaction_type: "BUY",
            security_id: "EQ_1",
            instrument_id: "AAPL",
              quantity: 50,
              net_cost_base: 9000,
              currency: "USD",
              settlement_status: "SETTLED",
            },
          ]}
        />
      </>
    );

    await waitFor(() => {
      expect(screen.getByText("Trade Date")).toBeInTheDocument();
    });

    expect(container.querySelectorAll(".portfolio-data-grid").length).toBeGreaterThanOrEqual(2);
    expect(container.querySelectorAll(".portfolio-data-grid .portfolio-module-state")).toHaveLength(0);
    expect(screen.getAllByTestId("mock-grid")).toHaveLength(2);
  });
});
