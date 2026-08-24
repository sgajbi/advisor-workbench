import React from "react";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import PortfolioRecordEvidenceRail from "../../src/apps/portfolio/components/portfolio-record-evidence-rail";
import { buildPortfolioWorkspace } from "../fixtures/portfolio-workspace-component-fixtures";

describe("PortfolioRecordEvidenceRail", () => {
  it("renders portfolio positions evidence and adjacent workflow links", () => {
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

    expect(screen.getByText("Data Readiness")).toBeInTheDocument();
    expect(screen.queryByText("PB_SG_GLOBAL_BAL_001")).not.toBeInTheDocument();
    expect(screen.getAllByText("Portfolio records").length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText("Position inventory")).toBeInTheDocument();
    expect(screen.getByText("1 position missing price or valuation")).toBeInTheDocument();
    expect(screen.getByText("2 positions available for review")).toBeInTheDocument();
    expect(
      screen.getByText(
        "1 position requires review; 1 position status not reported; 1 source key stale",
      ),
    ).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Positions" })).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Transactions" })).toHaveAttribute(
      "href",
      "/transactions?portfolioId=PB_SG_GLOBAL_BAL_001"
    );
    expect(screen.getByRole("link", { name: "Income & Activity" })).toHaveAttribute(
      "href",
      "/income?portfolioId=PB_SG_GLOBAL_BAL_001"
    );
    expect(screen.getByRole("link", { name: "Mandate Operations" })).toHaveAttribute(
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
    expect(screen.getByText("2 events available in the review window")).toBeInTheDocument();
    expect(
      screen.getByText("Ledger settlement state").closest(".portfolio-record-source-item"),
    ).toHaveTextContent(
      "1 settlement status requires review; 1 settlement status settled",
    );
    expect(screen.getByText("1 component type represented in the current window")).toBeInTheDocument();
    expect(screen.getByText("Review required")).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Transactions" })).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Positions" })).toHaveAttribute(
      "href",
      "/positions?portfolioId=PB_SG_GLOBAL_BAL_001"
    );
  });

  it("renders income and activity source posture without local analytics claims", () => {
    render(
      <PortfolioRecordEvidenceRail
        screen="income"
        workspace={buildPortfolioWorkspace({
          income_summary: {
            reporting_currency: "USD",
            window_start_date: "2026-04-12",
            window_end_date: "2026-05-12",
            totals_requested_window: buildIncomePeriod(42901.4, 3),
            totals_year_to_date: buildIncomePeriod(128450, 8),
            income_types: [
              {
                income_type: "DIVIDENDS",
                requested_window: buildIncomePeriod(24500, 2),
                year_to_date: buildIncomePeriod(82100, 5),
              },
            ],
          },
          activity_summary: {
            reporting_currency: "USD",
            window_start_date: "2026-04-12",
            window_end_date: "2026-05-12",
            buckets: [
              {
                bucket: "EXTERNAL_FUNDING",
                requested_window: {
                  reporting_currency_amount: 150000,
                  transaction_count: 1,
                },
                year_to_date: {
                  reporting_currency_amount: 150000,
                  transaction_count: 1,
                },
              },
            ],
          },
        })}
      />
    );

    expect(screen.getByText("Income source")).toBeInTheDocument();
    expect(screen.getByText(/1 income type and 3 income events through/i)).toBeInTheDocument();
    expect(screen.getByText("Activity buckets")).toBeInTheDocument();
    expect(screen.getByText(/1 bucket and 1 activity event through/i)).toBeInTheDocument();
    expect(screen.getAllByText("Portfolio records").length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText("Activity classification")).toBeInTheDocument();
    expect(screen.queryByText("Gateway portfolio workspace")).not.toBeInTheDocument();
  });

  it("distinguishes a ready reportable book from a generated reporting snapshot", () => {
    render(
      <PortfolioRecordEvidenceRail
        screen="income"
        workspace={buildPortfolioWorkspace({
          readiness: {
            has_positions: true,
            reporting: {
              status: "READY",
              generated_at_utc: null,
              row_count: 11,
            },
          },
        })}
      />
    );

    expect(screen.getByText("Reportable book ready")).toBeInTheDocument();
    expect(
      screen.getByText("11 reportable rows available; a reporting snapshot has not been generated")
    ).toBeInTheDocument();
    expect(screen.getByText("Not generated")).toBeInTheDocument();
    expect(screen.queryByText("READY")).not.toBeInTheDocument();
  });
});

function buildIncomePeriod(amount: number, transactionCount: number) {
  return {
    gross: {
      reporting_currency_amount: amount,
      transaction_count: transactionCount,
    },
    withholding_tax: {
      reporting_currency_amount: 0,
      transaction_count: 0,
    },
    other_deductions: {
      reporting_currency_amount: 0,
      transaction_count: 0,
    },
    net: {
      reporting_currency_amount: amount,
      transaction_count: transactionCount,
    },
  };
}
