import { describe, expect, it } from "vitest";

import { buildIntakeReceipt } from "../../src/features/intake/receipt";

describe("intake receipt", () => {
  it("renders only source-confirmed counts and bounded provenance", () => {
    expect(
      buildIntakeReceipt("CREATE_PORTFOLIO", {
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
      }),
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
      buildIntakeReceipt("ADD_TRANSACTIONS", {
        correlation_id: "corr_intake_002",
        contract_version: "v1",
        data: { published_counts: { portfolios: 0 } },
      }),
    ).toThrow("published record counts for this request");
  });

  it("requires at least one recognized count for a file bundle", () => {
    expect(() =>
      buildIntakeReceipt("IMPORT_FILE", {
        correlation_id: "corr_intake_003",
        contract_version: "v1",
        data: { published_counts: { ignored_records: 3 } },
      }),
    ).toThrow("published record counts for this request");
  });
});
