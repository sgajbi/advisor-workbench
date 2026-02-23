import { describe, expect, it } from "vitest";

import { parseIntakeCsvToBundle } from "../../src/features/intake/csv-parser";

describe("intake csv parser", () => {
  it("parses valid csv into pas bundle payload", () => {
    const csv = [
      "portfolio_id,base_currency,open_date,risk_exposure,investment_time_horizon,portfolio_type,booking_center,cif_id,advisor_id,status,security_id,instrument_name,isin,product_type,transaction_type,quantity,price,transaction_date",
      "PORT001,USD,2026-01-02,Medium,Long,Discretionary,Singapore,CIF001,advisor_1,Active,SEC_AAPL,Apple Inc.,US0378331005,Equity,BUY,10,200,2026-01-02T00:00:00Z",
      "PORT001,USD,2026-01-02,Medium,Long,Discretionary,Singapore,CIF001,advisor_1,Active,SEC_MSFT,Microsoft Corp.,US5949181045,Equity,BUY,5,300,2026-01-02T00:00:00Z",
    ].join("\n");

    const payload = parseIntakeCsvToBundle(csv);
    expect(payload.portfolios).toHaveLength(1);
    expect(payload.instruments).toHaveLength(2);
    expect(payload.transactions).toHaveLength(2);
    expect(payload.marketPrices).toHaveLength(2);
    expect(payload.transactions[0].gross_transaction_amount).toBe(2000);
  });

  it("fails when required headers are missing", () => {
    const csv = [
      "portfolio_id,base_currency,open_date",
      "PORT001,USD,2026-01-02",
    ].join("\n");

    expect(() => parseIntakeCsvToBundle(csv)).toThrow(/missing required columns/i);
  });
});
