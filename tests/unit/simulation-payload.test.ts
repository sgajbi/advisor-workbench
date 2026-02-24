import { describe, expect, it } from "vitest";

import { buildSimulatePayload } from "../../src/features/proposals/simulation-payload";

describe("buildSimulatePayload", () => {
  it("maps advisory intent rows into DPM-compatible proposal payload", () => {
    const payload = buildSimulatePayload(
      {
        portfolioId: "PORT_1001",
        baseCurrency: "usd",
        cashAmount: 10000,
      },
      [
        {
          currency: "usd",
          amount: 1500,
          direction: "IN",
          description: "Client deposit",
        },
        {
          currency: "USD",
          amount: 250,
          direction: "OUT",
          description: "Fee reserve",
        },
      ],
      [
        {
          side: "BUY",
          instrumentId: "EQ_US_GROWTH",
          quantity: 12.5,
        },
      ]
    );

    const body = payload.body as {
      proposed_cash_flows: Array<Record<string, unknown>>;
      proposed_trades: Array<Record<string, unknown>>;
      portfolio_snapshot: {
        base_currency: string;
      };
    };

    expect(body.portfolio_snapshot.base_currency).toBe("USD");
    expect(body.proposed_cash_flows).toEqual([
      {
        intent_type: "CASH_FLOW",
        currency: "USD",
        amount: "1500.00",
        description: "Client deposit",
      },
      {
        intent_type: "CASH_FLOW",
        currency: "USD",
        amount: "-250.00",
        description: "Fee reserve",
      },
    ]);
    expect(body.proposed_trades).toEqual([
      {
        intent_type: "SECURITY_TRADE",
        side: "BUY",
        instrument_id: "EQ_US_GROWTH",
        quantity: "12.5000",
      },
    ]);
  });
});
