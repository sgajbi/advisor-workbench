import { describe, expect, it } from "vitest";

import type { PortfolioPositionView } from "../../src/apps/portfolio/types";
import {
  buildProposalDraftPreview,
  createCashFlowIntent,
  createTradeIntentFromPosition,
  inferReferencePrice,
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
    expect(inferReferencePrice(applePosition)).toBe(190);
    expect(inferReferencePrice({ ...applePosition, market_price: null })).toBe(190);
  });

  it("updates cash, position values, and allocation after held-position trades", () => {
    const buyMoreApple = createTradeIntentFromPosition(1, applePosition, "BUY");
    buyMoreApple.quantity = 10;
    const sellBonds = createTradeIntentFromPosition(2, bondPosition, "SELL");
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
});
