import { describe, expect, it } from "vitest";

import {
  buildTransactionExportRows,
  buildTransactionFilterOptions,
  buildTransactionLedgerQuery,
  buildTransactionRows,
  shouldReuseInitialTransactions,
  sumTransactionAmount,
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
      }),
    ).toEqual({
      asOfDate: "2026-03-28",
      startDate: "2026-03-01",
      endDate: "2026-03-28",
      transactionType: "BUY",
      componentType: "FX_CONTRACT_OPEN",
      fxContractId: "FXC-2026-0001",
      limit: 200,
    });
  });

  it("builds transaction rows, totals, and export rows without rendering the grid", () => {
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
          net_cost_base: 9000,
          currency: "USD",
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
        amount: 9000,
        currency: "USD",
        status: "Settled",
      },
      {
        transactionId: "TX_2",
        type: "Dividend",
        amount: 125,
        currency: "USD",
        status: "Pending",
      },
    ]);
    expect(sumTransactionAmount(rows)).toBe(9125);
    expect(buildTransactionExportRows(rows, "USD")[0]).toEqual({
      "Trade Date": "20 Mar 2026",
      "Settle Date": "24 Mar 2026",
      Type: "Buy",
      Instrument: "AAPL",
      Quantity: 50,
      Price: 180,
      "Amount (USD)": 9000,
      Currency: "USD",
      Status: "Settled",
      Component: "Trade",
      Source: "Core Ledger",
    });
  });
});
