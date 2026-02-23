import { describe, expect, it } from "vitest";

import {
  buildCreatePortfolioPayload,
  buildInstrumentsPayload,
  buildMarketDataPayload,
  buildPositionSeedPayload,
  buildTransactionsPayload,
} from "../../src/features/intake/payload-builder";

describe("intake payload builder", () => {
  it("builds create portfolio payload with only portfolio section", () => {
    const payload = buildCreatePortfolioPayload({
      portfolioId: "PORT001",
      baseCurrency: "USD",
      openDate: "2026-01-02",
      riskExposure: "Medium",
      investmentTimeHorizon: "Long",
      portfolioType: "Discretionary",
      bookingCenter: "Singapore",
      cifId: "CIF001",
      advisorId: "advisor_1",
      status: "Active",
    });
    expect(payload.portfolios).toHaveLength(1);
    expect(payload.transactions).toHaveLength(0);
    expect(payload.instruments).toHaveLength(0);
  });

  it("builds position seed payload with transaction and market price", () => {
    const payload = buildPositionSeedPayload({
      portfolioId: "PORT001",
      baseCurrency: "USD",
      securityId: "SEC_AAPL",
      instrumentName: "Apple",
      isin: "US0378331005",
      productType: "Equity",
      quantity: 10,
      price: 200,
      effectiveDate: "2026-01-02",
      transactionType: "BUY",
    });
    expect(payload.transactions).toHaveLength(1);
    expect(payload.marketPrices).toHaveLength(1);
    expect(payload.instruments).toHaveLength(1);
    expect(payload.transactions[0].gross_transaction_amount).toBe(2000);
  });

  it("builds transactions-only payload", () => {
    const payload = buildTransactionsPayload({
      portfolioId: "PORT001",
      baseCurrency: "USD",
      securityId: "SEC_AAPL",
      quantity: 5,
      price: 100,
      transactionDate: "2026-01-03",
      transactionType: "BUY",
    });
    expect(payload.transactions).toHaveLength(1);
    expect(payload.instruments).toHaveLength(0);
  });

  it("builds instruments-only payload", () => {
    const payload = buildInstrumentsPayload({
      securityId: "SEC_AAPL",
      name: "Apple",
      isin: "US0378331005",
      instrumentCurrency: "USD",
      productType: "Equity",
      assetClass: "Equity",
    });
    expect(payload.instruments).toHaveLength(1);
    expect(payload.transactions).toHaveLength(0);
  });

  it("builds market-data-only payload", () => {
    const payload = buildMarketDataPayload({
      securityId: "SEC_AAPL",
      priceDate: "2026-01-03",
      price: 205,
      currency: "USD",
    });
    expect(payload.marketPrices).toHaveLength(1);
    expect(payload.portfolios).toHaveLength(0);
  });
});
