import { describe, expect, it } from "vitest";

import {
  buildTransactionFilterOptions,
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
});
