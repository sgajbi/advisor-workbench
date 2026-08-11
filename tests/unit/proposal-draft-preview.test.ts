import { describe, expect, it } from "vitest";

import type { PortfolioPositionView } from "../../src/apps/portfolio/types";
import {
  buildExecutableTradeRows,
  buildProposalDraftPreview,
  createCashFlowIntent,
  createTradeIntentFromPosition,
  inferBaseCurrencyReferencePrice,
  type ProposalDraftTradeIntent,
} from "../../src/features/proposals/proposal-draft-preview";

const applePosition: PortfolioPositionView = {
  security_id: "AAPL",
  instrument_name: "Apple Inc.",
  asset_class: "Equities",
  quantity: 100,
  market_price: 190,
  market_value_base: 19000,
  weight_pct: 65,
};

const bondPosition: PortfolioPositionView = {
  security_id: "AGG",
  instrument_name: "iShares Core US Aggregate Bond",
  asset_class: "Fixed Income",
  quantity: 200,
  market_price: 95,
  market_value_base: 19000,
  weight_pct: 30,
};

describe("proposal draft preview", () => {
  it("infers a reference price from the portfolio book", () => {
    expect(inferBaseCurrencyReferencePrice(applePosition)).toBe(190);
    expect(
      inferBaseCurrencyReferencePrice({
        ...applePosition,
        currency: "EUR",
        market_price: 175,
        market_value_base: 20_000,
      })
    ).toBe(200);
    expect(inferBaseCurrencyReferencePrice({ ...applePosition, market_value_base: null })).toBe(0);
  });

  it("updates cash, position values, and allocation after held-position trades", () => {
    const buyMoreApple = createTradeIntentFromPosition(1, applePosition, "BUY", "USD");
    buyMoreApple.quantity = 10;
    const sellBonds = createTradeIntentFromPosition(2, bondPosition, "SELL", "USD");
    sellBonds.quantity = 20;

    const cashFlow = createCashFlowIntent(1, "USD");
    cashFlow.amount = 1000;
    cashFlow.direction = "IN";

    const preview = buildProposalDraftPreview(
      [applePosition, bondPosition],
      2000,
      [cashFlow],
      [buyMoreApple, sellBonds]
    );

    expect(preview.currentPortfolioValue).toBe(40000);
    expect(preview.tradeNotional).toBe(0);
    expect(preview.proposedCash).toBe(3000);
    expect(preview.proposedPortfolioValue).toBe(41000);
    expect(preview.rows.find((row) => row.instrumentId === "AAPL")?.proposedQuantity).toBe(110);
    expect(preview.rows.find((row) => row.instrumentId === "AGG")?.proposedQuantity).toBe(180);
    expect(preview.allocationRows.find((row) => row.assetClass === "Equities")?.proposedWeight).toBeCloseTo(
      51,
      0
    );
  });

  it("adds admitted scenario cash to proposed value without rewriting current portfolio truth", () => {
    const preview = buildProposalDraftPreview([applePosition], 5_000, [], [], 10_000);

    expect(preview.currentPortfolioValue).toBe(24_000);
    expect(preview.cashDelta).toBe(10_000);
    expect(preview.proposedCash).toBe(15_000);
    expect(preview.proposedPortfolioValue).toBe(34_000);
    expect(preview.allocationRows.find((row) => row.assetClass === "Cash")).toMatchObject({
      currentValue: 5_000,
      proposedValue: 15_000,
    });
  });

  it("preserves exact cents while aggregating large cash movements and a priced draft order", () => {
    const outflowOne = createCashFlowIntent(1, "USD");
    outflowOne.amount = 0.09;
    outflowOne.direction = "OUT";
    const outflowTwo = createCashFlowIntent(2, "USD");
    outflowTwo.amount = 0.08;
    outflowTwo.direction = "OUT";
    const pricedBuy: ProposalDraftTradeIntent = {
      id: "trade-cent-proof",
      source: "NEW_INSTRUMENT",
      side: "BUY",
      instrumentId: "CENT-PROOF",
      quantity: 1,
      referencePrice: 0.02,
    };

    const preview = buildProposalDraftPreview(
      [],
      60_000_000_000_000,
      [outflowOne, outflowTwo],
      [pricedBuy]
    );

    expect(preview.monetaryPrecisionReliable).toBe(true);
    expect(preview.cashDelta).toBe(-0.17);
    expect(preview.tradeNotional).toBe(0.02);
    expect(preview.proposedCash.toFixed(2)).toBe("59999999999999.81");
    expect(preview.proposedPortfolioValue.toFixed(2)).toBe("59999999999999.83");
  });

  it("withholds a preview for a cash movement beyond submitted cent precision", () => {
    const overPrecision = createCashFlowIntent(1, "USD");
    overPrecision.amount = 2.675;

    const preview = buildProposalDraftPreview([], 1_000, [overPrecision], []);

    expect(preview.monetaryPrecisionReliable).toBe(false);
  });

  it("rounds derived indicative notionals without blocking a valid quantity action", () => {
    const fractionalPricePosition: PortfolioPositionView = {
      ...applePosition,
      quantity: 3,
      market_value_base: 19_000,
    };
    const buyOne = createTradeIntentFromPosition(
      1,
      fractionalPricePosition,
      "BUY",
      "USD"
    );
    buyOne.quantity = 1;

    const preview = buildProposalDraftPreview(
      [fractionalPricePosition],
      10_000,
      [],
      [buyOne]
    );

    expect(preview.monetaryPrecisionReliable).toBe(true);
    expect(preview.tradeNotional).toBe(6_333.33);
    expect(preview.rows[0]?.proposedValue).toBe(25_333.33);
  });

  it("reconciles rounded position value and trade cash at one accounting boundary", () => {
    const position: PortfolioPositionView = {
      ...applePosition,
      quantity: 6,
      market_value_base: 100.01,
    };
    const buyThree = createTradeIntentFromPosition(1, position, "BUY", "USD");
    buyThree.quantity = 3;

    const preview = buildProposalDraftPreview([position], 100, [], [buyThree]);

    expect(preview.tradeNotional).toBe(50);
    expect(preview.rows[0]?.proposedValue).toBe(150.01);
    expect(preview.proposedCash).toBe(50);
    expect(preview.proposedPortfolioValue).toBe(preview.currentPortfolioValue);
  });

  it("adds an off-book instrument and reports unpriced draft lines", () => {
    const offBookTrade: ProposalDraftTradeIntent = {
      id: "trade_1",
      source: "NEW_INSTRUMENT",
      side: "BUY",
      instrumentId: "VTI",
      instrumentName: "Vanguard Total Stock Market ETF",
      assetClass: "Equities",
      quantity: 5,
      referencePrice: 250,
    };
    const unpricedTrade: ProposalDraftTradeIntent = {
      ...offBookTrade,
      id: "trade_2",
      instrumentId: "NEW-ALT",
      assetClass: "Alternatives",
      referencePrice: 0,
    };

    const preview = buildProposalDraftPreview(
      [applePosition],
      5000,
      [],
      [offBookTrade, unpricedTrade]
    );

    expect(preview.unpricedTradeCount).toBe(1);
    expect(preview.rows.find((row) => row.instrumentId === "VTI")?.proposedValue).toBe(1250);
    expect(preview.proposedCash).toBe(3750);
  });

  it("does not credit cash for sell quantity above the available holding", () => {
    const oversellApple = createTradeIntentFromPosition(1, applePosition, "SELL", "USD");
    oversellApple.quantity = 150;

    const preview = buildProposalDraftPreview([applePosition], 5000, [], [oversellApple]);

    expect(preview.rows.find((row) => row.instrumentId === "AAPL")?.proposedQuantity).toBe(0);
    expect(preview.rows.find((row) => row.instrumentId === "AAPL")?.proposedValue).toBe(0);
    expect(preview.tradeNotional).toBe(-19000);
    expect(preview.proposedCash).toBe(24000);
    expect(preview.proposedPortfolioValue).toBe(24000);
  });

  it("caps submitted sell rows to the available source-backed holding quantity", () => {
    const oversellApple = createTradeIntentFromPosition(1, applePosition, "SELL", "USD");
    oversellApple.quantity = 150;

    const executableRows = buildExecutableTradeRows([applePosition], [oversellApple]);

    expect(executableRows).toHaveLength(1);
    expect(executableRows[0]).toMatchObject({
      instrumentId: "AAPL",
      side: "SELL",
      requestedQuantity: 150,
      executableQuantity: 100,
      cappedToAvailableQuantity: true,
    });
  });
});
