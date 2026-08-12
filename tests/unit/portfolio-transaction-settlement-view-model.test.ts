import { describe, expect, it } from "vitest";

import {
  buildPortfolioTransactionSettlementState,
  buildPortfolioTransactionSettlementSummary,
} from "../../src/apps/portfolio/portfolio-transaction-settlement-view-model";

describe("portfolio transaction settlement view model", () => {
  it.each([
    {
      input: { component_type: "TRADE", settlement_status: " settled " },
      expected: { kind: "settled", label: "Settled", tone: "clear", applicable: true },
    },
    {
      input: { component_type: "TRADE", settlement_status: "PENDING" },
      expected: { kind: "review_required", label: "Review required", tone: "warn", applicable: true },
    },
    {
      input: { component_type: "TRADE", settlement_status: "SOURCE_STATUS_ADDED_LATER" },
      expected: { kind: "review_required", label: "Review required", tone: "warn", applicable: true },
    },
    {
      input: { component_type: " fx_cash_settlement_buy ", settlement_status: null },
      expected: { kind: "not_reported", label: "Not reported", tone: "warn", applicable: true },
    },
    {
      input: { component_type: "FX_CASH_SETTLEMENT_SELL", settlement_status: " " },
      expected: { kind: "not_reported", label: "Not reported", tone: "warn", applicable: true },
    },
    {
      input: { component_type: "FX_CONTRACT_OPEN", settlement_status: null },
      expected: { kind: "not_applicable", label: "Not applicable", tone: "neutral", applicable: false },
    },
    {
      input: { component_type: null, settlement_status: null },
      expected: { kind: "not_applicable", label: "Not applicable", tone: "neutral", applicable: false },
    },
  ])("maps source settlement truth to $expected.label", ({ input, expected }) => {
    expect(buildPortfolioTransactionSettlementState(input)).toEqual(expected);
  });

  it("summarizes only applicable settlement lifecycle rows as control evidence", () => {
    expect(
      buildPortfolioTransactionSettlementSummary([
        { component_type: "FX_CASH_SETTLEMENT_BUY", settlement_status: "SETTLED" },
        { component_type: "FX_CASH_SETTLEMENT_SELL", settlement_status: "PENDING" },
        { component_type: "FX_CASH_SETTLEMENT_BUY", settlement_status: null },
        { component_type: "TRADE", settlement_status: null },
      ]),
    ).toEqual({
      transactionCount: 4,
      applicableCount: 3,
      settledCount: 1,
      reviewRequiredCount: 1,
      notReportedCount: 1,
      notApplicableCount: 1,
      state: "review_required",
      status: "Review required",
      detail:
        "1 settlement status requires review; 1 settlement status not reported; 1 settlement status settled; 1 ledger entry not applicable",
      tone: "warn",
    });
  });

  it("keeps an entirely inapplicable ledger distinct from an empty one", () => {
    expect(
      buildPortfolioTransactionSettlementSummary([
        { component_type: "TRADE", settlement_status: null },
        { component_type: "FX_CONTRACT_OPEN", settlement_status: null },
      ]),
    ).toMatchObject({
      applicableCount: 0,
      notApplicableCount: 2,
      state: "not_applicable",
      status: "Not applicable",
      detail: "2 ledger entries outside the settlement lifecycle",
      tone: "default",
    });

    expect(buildPortfolioTransactionSettlementSummary([])).toMatchObject({
      state: "empty",
      status: "Empty",
      tone: "default",
    });
  });
});
