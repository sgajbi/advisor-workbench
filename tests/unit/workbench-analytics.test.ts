import { describe, expect, it } from "vitest";

import { buildDeltaAnalyticsRows, resolveBenchmarkReturn } from "../../src/features/workbench/analytics";

describe("workbench analytics helpers", () => {
  it("aggregates delta rows by asset class", () => {
    const rows = buildDeltaAnalyticsRows(
      [
        { security_id: "EQ_1", instrument_name: "Eq 1", asset_class: "Equity", quantity: 10 },
        { security_id: "FI_1", instrument_name: "Fi 1", asset_class: "Fixed Income", quantity: 20 },
      ],
      [
        {
          security_id: "EQ_1",
          instrument_name: "Eq 1",
          asset_class: "Equity",
          baseline_quantity: 10,
          proposed_quantity: 15,
          delta_quantity: 5,
        },
        {
          security_id: "FI_1",
          instrument_name: "Fi 1",
          asset_class: "Fixed Income",
          baseline_quantity: 20,
          proposed_quantity: 18,
          delta_quantity: -2,
        },
      ],
      "ASSET_CLASS"
    );

    expect(rows).toHaveLength(2);
    expect(rows[0].key).toBe("EQUITY");
    expect(rows[0].deltaQuantity).toBe(5);
  });

  it("uses benchmark fallback when upstream benchmark missing", () => {
    expect(resolveBenchmarkReturn("MSCI_ACWI", null)).toBe(4.2);
    expect(resolveBenchmarkReturn("CUSTOM", undefined)).toBe(2.8);
    expect(resolveBenchmarkReturn("CUSTOM", 1.1)).toBe(1.1);
  });
});
