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

  it("renders transaction ledger provenance from booked activity", () => {
    render(
      <PortfolioRecordEvidenceRail
        screen="transactions"
        workspace={buildPortfolioWorkspace({
          recent_transactions: [
            {
              transaction_id: "TX_1",
              transaction_date: "2026-04-30T00:00:00Z",
              settlement_date: "2026-05-16",
              transaction_type: "WITHDRAWAL",
              component_type: "CASH_MOVEMENT",
              security_id: "CASH_USD",
              instrument_id: "USD-CASH",
              quantity: 12000,
              net_cost_base: -12000,
              currency: "USD",
              settlement_status: "PENDING",
              source_system: "CORE_BANKING",
            },
            {
              transaction_id: "TX_2",
              transaction_date: "2026-04-17T00:00:00Z",
              settlement_date: "2026-04-20",
              transaction_type: "WITHDRAWAL",
              component_type: "CASH_MOVEMENT",
              security_id: "CASH_USD",
              instrument_id: "USD-CASH",
              quantity: 18000,
              net_cost_base: -18000,
              currency: "USD",
              settlement_status: "SETTLED",
              source_system: "CORE_BANKING",
            },
          ],
        })}
      />
    );

    expect(screen.getByText("Core Banking")).toBeInTheDocument();
    expect(screen.getByText("2 events loaded for PB_SG_GLOBAL_BAL_001")).toBeInTheDocument();
    expect(screen.getByText("1 settled event of 2 events")).toBeInTheDocument();
    expect(screen.getByText("1 component type represented in the current window")).toBeInTheDocument();
    expect(screen.getByText("Review")).toBeInTheDocument();
  });
});
