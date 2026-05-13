import React from "react";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import PortfolioRecordEvidenceRail from "../../src/apps/portfolio/components/portfolio-record-evidence-rail";
import { buildPortfolioWorkspace } from "../fixtures/portfolio-workspace-component-fixtures";

describe("PortfolioRecordEvidenceRail", () => {
  it("renders gateway-backed positions evidence and adjacent workflow links", () => {
    render(
      <PortfolioRecordEvidenceRail
        screen="positions"
        workspace={buildPortfolioWorkspace({
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
        })}
      />
    );

    expect(screen.getByText("Evidence and Lineage")).toBeInTheDocument();
    expect(screen.getByText("PB_SG_GLOBAL_BAL_001")).toBeInTheDocument();
    expect(screen.getByText("1 holding missing price or valuation")).toBeInTheDocument();
    expect(screen.getByText("2 positions loaded for PB_SG_GLOBAL_BAL_001")).toBeInTheDocument();
    expect(screen.getByText("1 flag on positions, 1 stale key")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Transactions" })).toHaveAttribute(
      "href",
      "/transactions?portfolioId=PB_SG_GLOBAL_BAL_001"
    );
    expect(screen.getByRole("link", { name: "DPM Operations" })).toHaveAttribute(
      "href",
      "/workbench/PB_SG_GLOBAL_BAL_001"
    );
  });
});
