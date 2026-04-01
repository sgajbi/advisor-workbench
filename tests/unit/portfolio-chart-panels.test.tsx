import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import {
  PortfolioActivityPanel,
  PortfolioIncomePanel,
  PortfolioProjectedCashflowPanel,
  PortfolioTopHoldingsPanel,
} from "../../src/apps/portfolio/components/portfolio-chart-panels";
import type { PortfolioWorkspace } from "../../src/apps/portfolio/types";

describe("portfolio chart panels", () => {
  it("filters top holdings via chart interaction", () => {
    const onSelectionChange = vi.fn();

    render(
      <PortfolioTopHoldingsPanel
        positions={[
          {
            security_id: "EQ_1",
            instrument_name: "Apple Inc",
            asset_class: "Equities",
            quantity: 120,
            market_value_base: 250000,
            weight_pct: 20,
          },
        ]}
        baseCurrency="USD"
        selectedSecurityId={null}
        onSelectionChange={onSelectionChange}
      />
    );

    fireEvent.click(
      screen.getByRole("listitem", { name: /Apple Inc: 250,000 USD. Select to filter holdings./i })
    );

    expect(onSelectionChange).toHaveBeenCalledWith("EQ_1");
    expect(screen.getByLabelText("Top holdings chart")).toBeInTheDocument();
    expect(screen.queryByLabelText("Top holdings table")).not.toBeInTheDocument();
    expect(document.querySelector(".portfolio-chart-module-toolbar.workbench-summary-toolbar")).toBeTruthy();
    expect(document.querySelector(".portfolio-top-holdings-list-card.workbench-summary-visual-card")).toBeTruthy();
    expect(document.querySelector(".portfolio-horizontal-bar-label.workbench-summary-visual-label")).toBeTruthy();
    expect(document.querySelector(".portfolio-horizontal-bar-value.workbench-summary-visual-value")).toBeTruthy();
    expect(
      screen.getByRole("listitem", {
        name: /Apple Inc: 250,000 USD. Select to filter holdings./i,
      })
    ).toBeInTheDocument();
  });

  it("renders activity, income, and projected cashflow charts with business labels", () => {
    const onActivitySelectionChange = vi.fn();

    render(
      <>
        <PortfolioActivityPanel
          selectedBucket={null}
          onSelectionChange={onActivitySelectionChange}
          summary={{
            reporting_currency: "USD",
            window_start_date: "2026-01-01",
            window_end_date: "2026-01-31",
            buckets: [
              {
                bucket: "INFLOWS",
                requested_window: { reporting_currency_amount: 1000, transaction_count: 1 },
                year_to_date: { reporting_currency_amount: 2500, transaction_count: 2 },
              },
            ],
          }}
        />
        <PortfolioIncomePanel
          summary={{
            reporting_currency: "USD",
            window_start_date: "2026-01-01",
            window_end_date: "2026-01-31",
            totals_requested_window: {
              gross: { reporting_currency_amount: 2500, transaction_count: 1 },
              withholding_tax: { reporting_currency_amount: 200, transaction_count: 1 },
              other_deductions: { reporting_currency_amount: 0, transaction_count: 1 },
              net: { reporting_currency_amount: 2300, transaction_count: 1 },
            },
            totals_year_to_date: {
              gross: { reporting_currency_amount: 2500, transaction_count: 1 },
              withholding_tax: { reporting_currency_amount: 200, transaction_count: 1 },
              other_deductions: { reporting_currency_amount: 0, transaction_count: 1 },
              net: { reporting_currency_amount: 2300, transaction_count: 1 },
            },
            income_types: [
              {
                income_type: "DIVIDEND",
                requested_window: {
                  gross: { reporting_currency_amount: 2500, transaction_count: 1 },
                  withholding_tax: { reporting_currency_amount: 200, transaction_count: 1 },
                  other_deductions: { reporting_currency_amount: 0, transaction_count: 1 },
                  net: { reporting_currency_amount: 2300, transaction_count: 1 },
                },
                year_to_date: {
                  gross: { reporting_currency_amount: 2500, transaction_count: 1 },
                  withholding_tax: { reporting_currency_amount: 200, transaction_count: 1 },
                  other_deductions: { reporting_currency_amount: 0, transaction_count: 1 },
                  net: { reporting_currency_amount: 2300, transaction_count: 1 },
                },
              },
            ],
          }}
        />
        <PortfolioProjectedCashflowPanel
          cashflowOutlook={buildWorkspace().cashflow_outlook!}
          baseCurrency="USD"
        />
      </>
    );

    expect(screen.getByLabelText("Activity chart")).toBeInTheDocument();
    expect(screen.getByLabelText("Income chart")).toBeInTheDocument();
    expect(screen.getByLabelText("Projected cashflow chart in USD")).toBeInTheDocument();
    expect(screen.getByText("Inflows")).toBeInTheDocument();
    expect(screen.getByText("Dividend")).toBeInTheDocument();
    expect(screen.getByText("Window inflow")).toBeInTheDocument();

    fireEvent.click(
      screen.getByRole("listitem", {
        name: /Inflows.*Select to filter transactions\./i,
      })
    );
    expect(onActivitySelectionChange).toHaveBeenCalledWith("INFLOWS");
  });

  it("renders compact activity and income panels for summary mode", () => {
    render(
      <>
        <PortfolioActivityPanel
          compact
          selectedBucket={null}
          summary={{
            reporting_currency: "USD",
            window_start_date: "2026-01-01",
            window_end_date: "2026-01-31",
            buckets: [
              {
                bucket: "INFLOWS",
                requested_window: { reporting_currency_amount: 1000, transaction_count: 1 },
                year_to_date: { reporting_currency_amount: 2500, transaction_count: 2 },
              },
            ],
          }}
        />
        <PortfolioIncomePanel
          compact
          summary={{
            reporting_currency: "USD",
            window_start_date: "2026-01-01",
            window_end_date: "2026-01-31",
            totals_requested_window: {
              gross: { reporting_currency_amount: 2500, transaction_count: 1 },
              withholding_tax: { reporting_currency_amount: 200, transaction_count: 1 },
              other_deductions: { reporting_currency_amount: 0, transaction_count: 1 },
              net: { reporting_currency_amount: 2300, transaction_count: 1 },
            },
            totals_year_to_date: {
              gross: { reporting_currency_amount: 2500, transaction_count: 1 },
              withholding_tax: { reporting_currency_amount: 200, transaction_count: 1 },
              other_deductions: { reporting_currency_amount: 0, transaction_count: 1 },
              net: { reporting_currency_amount: 2300, transaction_count: 1 },
            },
            income_types: [
              {
                income_type: "DIVIDEND",
                requested_window: {
                  gross: { reporting_currency_amount: 2500, transaction_count: 1 },
                  withholding_tax: { reporting_currency_amount: 200, transaction_count: 1 },
                  other_deductions: { reporting_currency_amount: 0, transaction_count: 1 },
                  net: { reporting_currency_amount: 2300, transaction_count: 1 },
                },
                year_to_date: {
                  gross: { reporting_currency_amount: 2500, transaction_count: 1 },
                  withholding_tax: { reporting_currency_amount: 200, transaction_count: 1 },
                  other_deductions: { reporting_currency_amount: 0, transaction_count: 1 },
                  net: { reporting_currency_amount: 2300, transaction_count: 1 },
                },
              },
            ],
          }}
        />
      </>
    );

    expect(document.querySelectorAll(".workbench-summary-visual-card")).toHaveLength(2);
    expect(document.querySelectorAll(".workbench-summary-visual-label").length).toBeGreaterThanOrEqual(2);
    expect(document.querySelectorAll(".workbench-summary-visual-value").length).toBeGreaterThanOrEqual(2);
    expect(document.querySelectorAll(".workbench-summary-visual-meta").length).toBeGreaterThanOrEqual(2);
    expect(screen.getByText("YTD 2,500 USD")).toBeInTheDocument();
    expect(screen.queryByText("Window inflow")).not.toBeInTheDocument();
    expect(screen.getByText("Gross 2,500 USD")).toBeInTheDocument();
    expect(screen.queryByText("Deductions 200 USD")).not.toBeInTheDocument();
  });

  it("uses bucket-aware activity copy for non-inflow rows", () => {
    render(
      <PortfolioActivityPanel
        selectedBucket={null}
        summary={{
          reporting_currency: "USD",
          window_start_date: "2026-01-01",
          window_end_date: "2026-01-31",
          buckets: [
            {
              bucket: "OUTFLOWS",
              requested_window: { reporting_currency_amount: 1000, transaction_count: 1 },
              year_to_date: { reporting_currency_amount: 2500, transaction_count: 2 },
            },
            {
              bucket: "FEES",
              requested_window: { reporting_currency_amount: 250, transaction_count: 1 },
              year_to_date: { reporting_currency_amount: 450, transaction_count: 2 },
            },
            {
              bucket: "TAXES",
              requested_window: { reporting_currency_amount: 81.75, transaction_count: 1 },
              year_to_date: { reporting_currency_amount: 81.75, transaction_count: 1 },
            },
          ],
        }}
      />
    );

    expect(screen.getByText("Window outflow")).toBeInTheDocument();
    expect(screen.getByText("Window fees")).toBeInTheDocument();
    expect(screen.getByText("Window taxes")).toBeInTheDocument();
    expect(screen.queryByText("Window activity")).not.toBeInTheDocument();
  });
});

function buildWorkspace(): PortfolioWorkspace {
  return {
    as_of_date: "2026-02-24",
    portfolio: {
      portfolio_id: "PORT_UI_1001",
      display_name: "Global Balanced",
      client_id: "CIF_1001",
      base_currency: "USD",
      booking_center_code: "SG",
    },
    profile: {
      status: "ACTIVE",
      portfolio_type: "ADVISORY",
      risk_exposure: "MODERATE",
      investment_time_horizon: "LONG_TERM",
      objective: "GROWTH",
      is_leverage_allowed: false,
    },
    summary: {
      market_value_base: 1250000,
      invested_market_value_base: 1145000,
      total_cash_base: 105000,
      cash_weight_pct: 8.4,
      position_count: 12,
      cash_balance_count: 2,
    },
    allocations: [],
    allocation_views: [],
    cash_balances: [],
    top_positions: [],
    positions: [],
    recent_transactions: [],
    income_summary: null,
    activity_summary: null,
    cashflow_outlook: {
      as_of_date: "2026-02-24",
      range_end_date: "2026-03-05",
      total_net_cashflow_base: -25000,
      projection_days: 10,
      include_projected: true,
      upcoming_points: [
        {
          projection_date: "2026-02-25",
          net_cashflow_base: -15000,
          projected_cumulative_cashflow_base: -15000,
        },
        {
          projection_date: "2026-02-26",
          net_cashflow_base: 5000,
          projected_cumulative_cashflow_base: -10000,
        },
      ],
    },
    performance: null,
    rebalance: null,
    readiness: {
      has_positions: false,
      reporting: {
        status: "EMPTY",
        generated_at_utc: null,
        row_count: 0,
      },
    },
    workflow_cues: [],
    warnings: [],
    partial_failures: [],
  };
}
