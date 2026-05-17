import { describe, expect, it } from "vitest";

import { buildPortfolioRecordEvidenceRailViewModel } from "../../src/apps/portfolio/portfolio-record-evidence-view-model";
import { buildPortfolioWorkspace } from "../fixtures/portfolio-workspace-component-fixtures";

describe("portfolio record evidence view model", () => {
  it("builds position evidence without requiring component rendering", () => {
    const viewModel = buildPortfolioRecordEvidenceRailViewModel({
      screen: "positions",
      workspace: buildPortfolioWorkspace({
        positions: [
          {
            security_id: "EQ_1",
            instrument_name: "Apple Inc.",
            asset_class: "EQUITY",
            quantity: 10,
            market_price: 210,
            market_value_base: 2100,
            weight_pct: 2.1,
            currency: "USD",
          },
          {
            security_id: "BOND_1",
            instrument_name: "Siemens Bond",
            asset_class: "FIXED_INCOME",
            quantity: 10,
            market_price: null,
            market_value_base: null,
            weight_pct: null,
            currency: "EUR",
            reprocessing_status: "STALE_PRICE",
          },
        ],
        operations: {
          stale_reprocessing_keys: 1,
        },
      }),
    });

    expect(viewModel.status).toEqual({ label: "Ready", tone: "success" });
    expect(viewModel.facts).not.toContainEqual({
      label: "Portfolio",
      value: "PB_SG_GLOBAL_BAL_001",
    });
    expect(viewModel.facts).toContainEqual({ label: "Currency", value: "USD" });
    expect(viewModel.facts).toContainEqual({ label: "Review Area", value: "Positions" });
    expect(viewModel.sourcePostureItems).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          label: "Pricing Source",
          detail: "1 holding missing price or valuation",
          status: "Partial",
          tone: "warn",
        }),
        expect.objectContaining({
          label: "Positions Ledger",
          detail: "2 positions available for review",
        }),
        expect.objectContaining({
          label: "Reprocessing",
          detail: "1 flag on positions, 1 stale key",
          status: "Review",
        }),
      ])
    );
    expect(viewModel.adjacentWorkflows.map((workflow) => workflow.label)).toEqual([
      "Portfolio Review",
      "Allocation",
      "Transactions",
      "Income & Activity",
      "Cashflow",
      "Mandate Operations",
    ]);
  });

  it("builds income and activity evidence with front-office copy", () => {
    const viewModel = buildPortfolioRecordEvidenceRailViewModel({
      screen: "income",
      workspace: buildPortfolioWorkspace({
        income_summary: null,
        activity_summary: null,
        partial_failures: [
          {
            source_service: "portfolio",
            error_code: "income_unavailable",
            detail: "income unavailable",
          },
        ],
      }),
    });

    expect(viewModel.status).toEqual({ label: "Partial", tone: "warn" });
    expect(viewModel.sourcePostureItems).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          label: "Income Source",
          detail: "No classified income returned for the selected reporting window",
          status: "Unavailable",
        }),
        expect.objectContaining({
          label: "Activity Buckets",
          detail: "No activity buckets returned for the selected reporting window",
          status: "Unavailable",
        }),
      ])
    );
  });
});
