import { describe, expect, it } from "vitest";

import { buildAllocationHoldingsBreakdown } from "../../src/apps/portfolio/portfolio-allocation-drilldown-view-model";
import type { PortfolioCashBalance, PortfolioPositionView } from "../../src/apps/portfolio/types";

const positions: PortfolioPositionView[] = [
  {
    security_id: "EQ_US_1",
    instrument_name: "US Technology Equity",
    asset_class: "Equities",
    currency: "USD",
    sector: "Technology",
    country_of_risk: "United States",
    quantity: 10,
    market_value_base: 600,
    weight_pct: 60,
  },
  {
    security_id: "FI_SG_1",
    instrument_name: "Singapore Government Bond",
    asset_class: "Fixed Income",
    currency: "SGD",
    sector: "Government",
    country_of_risk: "Singapore",
    quantity: 4,
    market_value_base: 400,
    weight_pct: 40,
  },
];

const cashBalances: PortfolioCashBalance[] = [
  {
    security_id: "CASH_USD_1",
    instrument_name: "USD Operating Cash",
    currency: "USD",
    quantity: 125,
    market_value_base: 125,
    weight_pct: 12.5,
  },
];

describe("allocation holdings breakdown", () => {
  it.each([
    ["asset_class", " equities ", "EQ_US_1"],
    ["currency", "sgd", "FI_SG_1"],
    ["sector", "technology", "EQ_US_1"],
    ["region", "singapore", "FI_SG_1"],
  ])(
    "filters direct %s exposure to its contributing holdings",
    (dimension, bucket, expectedSecurityId) => {
      const result = buildAllocationHoldingsBreakdown({
        positions,
        selection: { dimension, bucket },
        exposureMode: "direct",
      });

      expect(result.state).toBe("filtered");
      expect(result.positions.map((position) => position.security_id)).toEqual([
        expectedSecurityId,
      ]);
      expect(result.title).toBe("Contributing holdings");
      expect(result.description).toBe(
        "1 of 2 booked holdings contribute to this direct exposure.",
      );
    },
  );

  it("keeps the unfiltered direct book visible until an exposure is selected", () => {
    expect(
      buildAllocationHoldingsBreakdown({
        positions,
        selection: null,
        exposureMode: "direct",
      }),
    ).toMatchObject({
      positions,
      filterLabel: null,
      title: "Booked holdings",
      state: "all",
    });
  });

  it("includes source cash balances in direct cash contributors", () => {
    const result = buildAllocationHoldingsBreakdown({
      positions,
      cashBalances,
      selection: { dimension: "asset_class", bucket: "Cash" },
      exposureMode: "direct",
    });

    expect(result.positions).toEqual([
      expect.objectContaining({
        source_record_type: "cash_balance",
        security_id: "CASH_USD_1",
        asset_class: "Cash",
      }),
    ]);
    expect(result.description).toBe(
      "1 of 3 booked holdings contribute to this direct exposure.",
    );
  });

  it("does not duplicate cash already present in booked positions", () => {
    const bookedCash = {
      source_record_type: "position" as const,
      security_id: "CASH_USD_1",
      instrument_name: "USD Operating Cash",
      asset_class: "Cash",
      currency: "USD",
      quantity: 125,
      market_value_base: 125,
      weight_pct: 12.5,
    };
    const result = buildAllocationHoldingsBreakdown({
      positions: [...positions, bookedCash],
      cashBalances,
      selection: { dimension: "asset_class", bucket: "Cash" },
      exposureMode: "direct",
    });

    expect(result.positions).toEqual([bookedCash]);
  });

  it("does not reconstruct expanded look-through contributors from booked positions", () => {
    expect(
      buildAllocationHoldingsBreakdown({
        positions,
        selection: { dimension: "region", bucket: "Asia" },
        exposureMode: "expanded",
      }),
    ).toEqual({
      positions,
      filterLabel: null,
      title: "Booked holdings",
      description:
        "Booked holdings are shown for reference. Expanded exposure contributors require source-backed look-through detail.",
      state: "expanded",
    });
  });

  it("falls back truthfully when a future allocation dimension has no holdings classification", () => {
    const result = buildAllocationHoldingsBreakdown({
      positions,
      selection: { dimension: "issuer_group", bucket: "Lotus Group" },
      exposureMode: "direct",
    });

    expect(result.state).toBe("unsupported");
    expect(result.positions).toBe(positions);
    expect(result.filterLabel).toBeNull();
    expect(result.description).toContain(
      "Issuer Group does not have a supported holdings classification",
    );
  });
});
