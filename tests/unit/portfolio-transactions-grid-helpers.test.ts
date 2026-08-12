import { describe, expect, it } from "vitest";

import {
  buildTransactionExportRows,
  buildTransactionFilterOptions,
  buildTransactionLedgerQuery,
  buildTransactionRows,
  formatTransactionLedgerCoverage,
  shouldReuseInitialTransactions,
} from "../../src/apps/portfolio/components/portfolio-transactions-grid-helpers";

describe("portfolio transactions grid helpers", () => {
  it("builds stable component filter options from initial and fetched ledger rows", () => {
    const options = buildTransactionFilterOptions(
      [
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
        {
          transaction_id: "TX_2",
          transaction_date: "2026-03-19T00:00:00Z",
          settlement_date: "2026-03-21",
          transaction_type: "BUY",
          component_type: "FX_CONTRACT_OPEN",
          security_id: "EQ_1",
          instrument_id: "AAPL",
          quantity: 10,
          net_cost_base: 1500,
          currency: "USD",
          settlement_status: "SETTLED",
        },
      ],
      (transaction) => transaction.component_type
    );

    expect(options).toEqual(["ALL", "TRADE", "FX_CONTRACT_OPEN"]);
  });

  it("stops reusing initial transactions when a component filter is active", () => {
    expect(
      shouldReuseInitialTransactions({
        externalFilter: null,
        transactionType: "ALL",
        componentType: "FX_CONTRACT_OPEN",
        startDate: "2026-03-01",
        endDate: "2026-03-28",
        defaultStartDate: "2026-03-01",
        defaultEndDate: "2026-03-28",
        initialTransactionCount: 1,
        skip: 0,
      })
    ).toBe(false);
  });

  it("stops reusing initial transactions when any external transaction drill-down is active", () => {
    expect(
      shouldReuseInitialTransactions({
        externalFilter: {
          kind: "linked_group",
          linked_transaction_group_id: "LTG-FX-2026-0001",
          label: "Filtered by transaction group: LTG-FX-2026-0001",
        },
        transactionType: "ALL",
        componentType: "ALL",
        startDate: "2026-03-01",
        endDate: "2026-03-28",
        defaultStartDate: "2026-03-01",
        defaultEndDate: "2026-03-28",
        initialTransactionCount: 1,
        skip: 0,
      })
    ).toBe(false);
  });

  it("builds Gateway ledger query parameters from bounded drill-down filters", () => {
    expect(
      buildTransactionLedgerQuery({
        asOfDate: "2026-03-28",
        startDate: "2026-03-01",
        endDate: "2026-03-28",
        transactionType: "BUY",
        componentType: "FX_CONTRACT_OPEN",
        externalFilter: {
          kind: "fx_contract",
          fx_contract_id: "FXC-2026-0001",
          label: "Filtered by FX contract: FXC-2026-0001",
        },
        skip: 200,
      }),
    ).toEqual({
      asOfDate: "2026-03-28",
      startDate: "2026-03-01",
      endDate: "2026-03-28",
      transactionType: "BUY",
      componentType: "FX_CONTRACT_OPEN",
      fxContractId: "FXC-2026-0001",
      limit: 200,
      skip: 200,
    });
  });

  it("preserves transaction and portfolio-currency amounts without mixing currencies", () => {
    const rows = buildTransactionRows(
      [
        {
          transaction_id: "TX_1",
          transaction_date: "2026-03-20T00:00:00Z",
          settlement_date: "2026-03-24",
          transaction_type: "BUY",
          component_type: "TRADE",
          source_system: "core_ledger",
          security_id: "EQ_1",
          instrument_id: "AAPL",
          quantity: 50,
          price: 180,
          gross_amount: 8500,
          net_cost_base: 9000,
          realized_gain_loss_base: 120,
          currency: "EUR",
          settlement_status: "SETTLED",
        },
        {
          transaction_id: "TX_2",
          transaction_date: "2026-03-21T00:00:00Z",
          transaction_type: "DIVIDEND",
          security_id: "EQ_1",
          instrument_id: "AAPL",
          quantity: 0,
          gross_amount: 125,
          settlement_status: "PENDING",
        },
      ],
      "USD",
    );

    expect(rows).toMatchObject([
      {
        transactionId: "TX_1",
        type: "Buy",
        componentType: "Trade",
        sourceSystem: "Core Ledger",
        grossAmount: 8500,
        transactionCurrency: "EUR",
        netCostBase: 9000,
        realizedGainLossBase: 120,
        priceCurrency: "EUR",
        settlementState: {
          kind: "settled",
          label: "Settled",
          tone: "clear",
          applicable: true,
        },
      },
      {
        transactionId: "TX_2",
        type: "Dividend",
        grossAmount: 125,
        transactionCurrency: null,
        netCostBase: null,
        priceCurrency: "USD",
        settlementState: {
          kind: "review_required",
          label: "Review required",
          tone: "warn",
          applicable: true,
        },
      },
    ]);
    expect(buildTransactionExportRows(rows, "USD")[0]).toEqual({
      "Trade Date": "20 Mar 2026",
      "Settle Date": "24 Mar 2026",
      Type: "Buy",
      Instrument: "AAPL",
      Quantity: 50,
      Price: 180,
      "Transaction Currency": "EUR",
      "Gross Amount": 8500,
      "Net Cost (USD)": 9000,
      "Realized P&L (USD)": 120,
      "Settlement Status": "Settled",
      Component: "Trade",
      Source: "Core Ledger",
    });
  });

  it("describes complete and paged ledger coverage truthfully", () => {
    expect(
      formatTransactionLedgerCoverage({ total: 2, skip: 0, visibleCount: 2 }),
    ).toBe("2 ledger entries");
    expect(
      formatTransactionLedgerCoverage({ total: 450, skip: 200, visibleCount: 200 }),
    ).toBe("201–400 of 450 ledger entries");
    expect(
      formatTransactionLedgerCoverage({ total: 450, skip: 400, visibleCount: 50 }),
    ).toBe("401–450 of 450 ledger entries");
  });

  it("keeps missing settlement state explicit without manufacturing an exception", () => {
    const rows = buildTransactionRows(
      [
        {
          transaction_id: "TX_NOT_REPORTED",
          transaction_date: "2026-03-20T00:00:00Z",
          transaction_type: "BUY",
          component_type: "FX_CASH_SETTLEMENT_BUY",
          security_id: "EQ_1",
          instrument_id: "AAPL",
          quantity: 1,
        },
        {
          transaction_id: "TX_NOT_APPLICABLE",
          transaction_date: "2026-03-20T00:00:00Z",
          transaction_type: "BUY",
          component_type: "TRADE",
          security_id: "EQ_1",
          instrument_id: "AAPL",
          quantity: 1,
        },
      ],
      "USD",
    );

    expect(rows.map((row) => row.settlementState.label)).toEqual([
      "Not reported",
      "Not applicable",
    ]);
    expect(buildTransactionExportRows(rows, "USD").map((row) => row["Settlement Status"])).toEqual([
      "Not reported",
      "Not applicable",
    ]);
  });
});
