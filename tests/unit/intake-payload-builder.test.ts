import { afterEach, describe, expect, it, vi } from "vitest";

import {
  buildCreatePortfolioPayload,
  buildInstrumentsPayloadFromList,
  buildMarketDataPayloadFromList,
  buildPositionSeedPayloadFromList,
  buildTransactionsPayloadFromList,
} from "../../src/features/intake/payload-builder";

describe("intake payload builder", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

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

  it("builds an ordered multi-position seed payload from the reviewed rows", () => {
    vi.spyOn(Date, "now").mockReturnValue(1_700_000_000_000);

    const payload = buildPositionSeedPayloadFromList("PORT001", "USD", [
      {
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
      },
      {
        portfolioId: "PORT001",
        baseCurrency: "USD",
        securityId: "SEC_US91282CJL63",
        instrumentName: "United States Treasury Note",
        isin: "US91282CJL63",
        productType: "Fixed Income",
        quantity: 20,
        price: 98.5,
        effectiveDate: "2026-01-03",
        transactionType: "BUY",
      },
    ]);

    expect(payload.businessDates).toEqual([{ businessDate: "2026-01-02" }]);
    expect(payload.instruments.map((row) => row.securityId)).toEqual([
      "SEC_AAPL",
      "SEC_US91282CJL63",
    ]);
    expect(payload.transactions.map((row) => row.transaction_id)).toEqual([
      "TRN_PORT001_SEC_AAPL_1700000000000_1",
      "TRN_PORT001_SEC_US91282CJL63_1700000000000_2",
    ]);
    expect(payload.transactions.map((row) => row.gross_transaction_amount)).toEqual([2000, 1970]);
    expect(payload.marketPrices.map((row) => row.priceDate)).toEqual([
      "2026-01-02",
      "2026-01-03",
    ]);
  });

  it("builds an ordered transactions-only payload from the reviewed rows", () => {
    vi.spyOn(Date, "now").mockReturnValue(1_700_000_000_001);

    const payload = buildTransactionsPayloadFromList("PORT001", "USD", [
      {
        portfolioId: "PORT001",
        baseCurrency: "USD",
        securityId: "SEC_AAPL",
        quantity: 5,
        price: 100,
        transactionDate: "2026-01-03",
        transactionType: "BUY",
      },
      {
        portfolioId: "PORT001",
        baseCurrency: "USD",
        securityId: "SEC_US91282CJL63",
        quantity: 2,
        price: 99,
        transactionDate: "2026-01-04",
        transactionType: "SELL",
      },
    ]);

    expect(payload.businessDates).toEqual([{ businessDate: "2026-01-03" }]);
    expect(payload.transactions.map((row) => row.security_id)).toEqual([
      "SEC_AAPL",
      "SEC_US91282CJL63",
    ]);
    expect(payload.transactions.map((row) => row.transaction_id)).toEqual([
      "TRN_PORT001_SEC_AAPL_1700000000001_1",
      "TRN_PORT001_SEC_US91282CJL63_1700000000001_2",
    ]);
    expect(payload.transactions.map((row) => row.gross_transaction_amount)).toEqual([500, 198]);
    expect(payload.instruments).toHaveLength(0);
  });

  it("builds an ordered instruments-only payload from the reviewed rows", () => {
    const payload = buildInstrumentsPayloadFromList([
      {
        securityId: "SEC_AAPL",
        name: "Apple",
        isin: "US0378331005",
        instrumentCurrency: "USD",
        productType: "Equity",
        assetClass: "Equity",
      },
      {
        securityId: "SEC_US91282CJL63",
        name: "United States Treasury Note",
        isin: "US91282CJL63",
        instrumentCurrency: "USD",
        productType: "Fixed Income",
        assetClass: "Fixed Income",
      },
    ]);

    expect(payload.instruments.map((row) => row.securityId)).toEqual([
      "SEC_AAPL",
      "SEC_US91282CJL63",
    ]);
    expect(payload.transactions).toHaveLength(0);
  });

  it("builds an ordered market-data-only payload from the reviewed rows", () => {
    const payload = buildMarketDataPayloadFromList([
      {
        securityId: "SEC_AAPL",
        priceDate: "2026-01-03",
        price: 205,
        currency: "USD",
      },
      {
        securityId: "SEC_US91282CJL63",
        priceDate: "2026-01-04",
        price: 99.25,
        currency: "USD",
      },
    ]);

    expect(payload.businessDates).toEqual([{ businessDate: "2026-01-03" }]);
    expect(payload.marketPrices).toEqual([
      {
        securityId: "SEC_AAPL",
        priceDate: "2026-01-03",
        price: 205,
        currency: "USD",
      },
      {
        securityId: "SEC_US91282CJL63",
        priceDate: "2026-01-04",
        price: 99.25,
        currency: "USD",
      },
    ]);
    expect(payload.portfolios).toHaveLength(0);
  });
});
