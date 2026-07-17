import { describe, expect, it } from "vitest";

import {
  buildBookedHoldingsInventory,
  filterRecentTransactionsForHolding,
} from "../../src/apps/portfolio/portfolio-booked-holdings-view-model";

describe("portfolio booked holdings view model", () => {
  it("adds source cash balances without duplicating a security already represented by a position", () => {
    const holdings = buildBookedHoldingsInventory(
      [
        {
          security_id: "EQ_1",
          instrument_name: "Global Equity Fund",
          asset_class: "Equities",
          quantity: 10,
          market_value_base: 900,
          weight_pct: 90,
        },
        {
          security_id: "CASH_USD",
          instrument_name: "USD Cash Position",
          asset_class: "Cash",
          quantity: 50,
          market_value_base: 50,
          weight_pct: 5,
        },
      ],
      [
        {
          security_id: "CASH_USD",
          instrument_name: "USD Operating Cash",
          currency: "USD",
          quantity: 50,
          market_value_base: 50,
          weight_pct: 5,
        },
        {
          security_id: "CASH_SGD",
          instrument_name: "SGD Operating Cash",
          currency: "SGD",
          quantity: 65,
          market_value_base: 50,
          weight_pct: 5,
        },
      ],
    );

    expect(holdings.map((holding) => holding.security_id)).toEqual([
      "EQ_1",
      "CASH_USD",
      "CASH_SGD",
    ]);
    expect(holdings.at(-1)).toMatchObject({
      source_record_type: "cash_balance",
      asset_class: "Cash",
      currency: "SGD",
      market_value_base: 50,
    });
  });

  it("matches recent activity by source security or instrument identifier", () => {
    const transactions = [
      {
        transaction_id: "TX_SECURITY",
        transaction_date: "2026-04-08",
        transaction_type: "BUY",
        security_id: "EQ_1",
        instrument_id: "GLOBAL_EQUITY",
        quantity: 10,
      },
      {
        transaction_id: "TX_INSTRUMENT",
        transaction_date: "2026-04-09",
        transaction_type: "DIVIDEND",
        security_id: "CASH_USD",
        instrument_id: "EQ_1",
        quantity: 0,
      },
      {
        transaction_id: "TX_OTHER",
        transaction_date: "2026-04-10",
        transaction_type: "BUY",
        security_id: "FI_1",
        instrument_id: "GOV_BOND",
        quantity: 2,
      },
    ];

    expect(
      filterRecentTransactionsForHolding(transactions, " eq_1 ").map(
        (transaction) => transaction.transaction_id,
      ),
    ).toEqual(["TX_SECURITY", "TX_INSTRUMENT"]);
  });
});
