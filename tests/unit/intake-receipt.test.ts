import { describe, expect, it } from "vitest";

import { buildIntakeReceipt } from "../../src/features/intake/receipt";
import type { PortfolioBundlePayload } from "../../src/features/intake/types";

describe("intake receipt", () => {
  it("renders only source-confirmed counts and bounded provenance", () => {
    expect(
      buildIntakeReceipt(
        "CREATE_PORTFOLIO",
        payload({ portfolios: [{}] }),
        {
          correlation_id: "corr_intake_001",
          contract_version: "v1",
          data: {
            published_counts: {
              portfolios: 1,
              instruments: 0,
              transactions: 0,
              market_prices: 0,
            },
          },
        },
      ),
    ).toEqual({
      title: "Publication confirmed",
      description:
        "The source service accepted the reviewed request. Downstream valuation, reporting, or activation readiness is not implied.",
      correlationId: "corr_intake_001",
      contractVersion: "v1",
      counts: [
        { label: "Portfolios", value: 1 },
        { label: "Instruments", value: 0 },
        { label: "Transactions", value: 0 },
        { label: "Price observations", value: 0 },
      ],
    });
  });

  it("rejects a nominal success without task-relevant publication evidence", () => {
    expect(() =>
      buildIntakeReceipt(
        "ADD_TRANSACTIONS",
        payload({ transactions: [{}] }),
        {
          correlation_id: "corr_intake_002",
          contract_version: "v1",
          data: { published_counts: { portfolios: 0 } },
        },
      ),
    ).toThrow("payload-matching published record counts for this request");
  });

  it("rejects zero-count confirmations for nonempty manual requests", () => {
    expect(() =>
      buildIntakeReceipt(
        "ADD_TRANSACTIONS",
        payload({ transactions: [{}] }),
        {
          correlation_id: "corr_intake_003",
          contract_version: "v1",
          data: { published_counts: { transactions: 0 } },
        },
      ),
    ).toThrow("payload-matching published record counts for this request");
  });

  it("requires at least one recognized count for a file bundle", () => {
    expect(() =>
      buildIntakeReceipt(
        "IMPORT_FILE",
        payload({ transactions: [{}] }),
        {
          correlation_id: "corr_intake_004",
          contract_version: "v1",
          data: { published_counts: { ignored_records: 3 } },
        },
      ),
    ).toThrow("payload-matching published record counts for this request");
  });

  it("requires payload-matching evidence for every nonempty imported record family", () => {
    const importedPayload = payload({
      businessDates: [{}],
      portfolios: [{}],
      instruments: [{}],
      transactions: [{}],
      marketPrices: [{}],
    });

    expect(() =>
      buildIntakeReceipt("IMPORT_FILE", importedPayload, {
        correlation_id: "corr_intake_005",
        contract_version: "v1",
        data: {
          published_counts: {
            business_dates: 1,
            portfolios: 1,
            instruments: 1,
            transactions: 1,
          },
        },
      }),
    ).toThrow("payload-matching published record counts for this request");

    expect(
      buildIntakeReceipt("IMPORT_FILE", importedPayload, {
        correlation_id: "corr_intake_006",
        contract_version: "v1",
        data: {
          published_counts: {
            business_dates: 1,
            portfolios: 1,
            instruments: 1,
            transactions: 1,
            market_prices: 1,
            fx_rates: 0,
          },
        },
      }).title,
    ).toBe("Publication confirmed");
  });

  it("requires source confirmation for published business dates", () => {
    const payloadWithBusinessDate = payload({
      businessDates: [{}],
      transactions: [{}],
    });

    expect(() =>
      buildIntakeReceipt("ADD_TRANSACTIONS", payloadWithBusinessDate, {
        correlation_id: "corr_intake_007",
        contract_version: "v1",
        data: {
          published_counts: {
            transactions: 1,
          },
        },
      }),
    ).toThrow("payload-matching published record counts for this request");

    expect(
      buildIntakeReceipt("ADD_TRANSACTIONS", payloadWithBusinessDate, {
        correlation_id: "corr_intake_008",
        contract_version: "v1",
        data: {
          published_counts: {
            business_dates: 1,
            transactions: 1,
          },
        },
      }).title,
    ).toBe("Publication confirmed");
  });
});

function payload(counts: {
  portfolios?: unknown[];
  instruments?: unknown[];
  transactions?: unknown[];
  marketPrices?: unknown[];
  fxRates?: unknown[];
  businessDates?: unknown[];
}): PortfolioBundlePayload {
  return {
    sourceSystem: "TEST",
    mode: "UPSERT",
    businessDates: Array.from({ length: counts.businessDates?.length ?? 0 }, () => ({ businessDate: "2026-08-08" })),
    portfolios: Array.from({ length: counts.portfolios?.length ?? 0 }, (_, index) => ({
      portfolioId: `PORT_${index + 1}`,
      baseCurrency: "USD",
      openDate: "2026-08-08",
      riskExposure: "Balanced",
      investmentTimeHorizon: "Long term",
      portfolioType: "Discretionary",
      bookingCenter: "Singapore",
      cifId: `CIF_${index + 1}`,
      status: "Pending activation",
    })),
    instruments: Array.from({ length: counts.instruments?.length ?? 0 }, (_, index) => ({
      securityId: `SEC_${index + 1}`,
      name: "Global Equity Fund",
      isin: "US0000000001",
      instrumentCurrency: "USD",
      productType: "Fund",
    })),
    transactions: Array.from({ length: counts.transactions?.length ?? 0 }, (_, index) => ({
      transaction_id: `TRN_${index + 1}`,
      portfolio_id: "PORT_1",
      instrument_id: `SEC_${index + 1}`,
      security_id: `SEC_${index + 1}`,
      transaction_date: "2026-08-08T00:00:00Z",
      transaction_type: "BUY",
      quantity: 10,
      price: 100,
      gross_transaction_amount: 1_000,
      trade_currency: "USD",
      currency: "USD",
    })),
    marketPrices: Array.from({ length: counts.marketPrices?.length ?? 0 }, (_, index) => ({
      securityId: `SEC_${index + 1}`,
      priceDate: "2026-08-08",
      price: 100,
      currency: "USD",
    })),
    fxRates: Array.from({ length: counts.fxRates?.length ?? 0 }, () => ({})),
  };
}
