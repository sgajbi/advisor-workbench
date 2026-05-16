import React from "react";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import PortfolioExecutiveSummary from "../../src/apps/portfolio/components/portfolio-executive-summary";
import type { PortfolioWorkspace } from "../../src/apps/portfolio/types";

describe("PortfolioExecutiveSummary", () => {
  it("renders a compact decision brief without duplicated analytics panels", () => {
    render(<PortfolioExecutiveSummary workspace={buildWorkspace()} />);

    expect(screen.getByRole("heading", { name: "Review priority attention" })).toBeInTheDocument();
    expect(screen.getByText("Priority review")).toBeInTheDocument();
    expect(screen.getByText("Review readiness")).toBeInTheDocument();
    expect(screen.getByText("Client-use blockers")).toBeInTheDocument();
    expect(screen.getByText("Next action")).toBeInTheDocument();
    expect(screen.getByText("Cash Review Needed")).toBeInTheDocument();
    expect(screen.getAllByText("75%").length).toBeGreaterThanOrEqual(1);

    expect(screen.queryByText("1,000,000 USD")).not.toBeInTheDocument();
    expect(screen.queryByText("Liquidity horizon")).not.toBeInTheDocument();
    expect(screen.queryByText("Mandate workflow")).not.toBeInTheDocument();
    expect(screen.queryByText("YTD return")).not.toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Asset Allocation" })).not.toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Top Holdings" })).not.toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Cashflow Forecast" })).not.toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Recent Transactions" })).not.toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Advisor Guidance" })).not.toBeInTheDocument();
  });
});

function buildWorkspace(): PortfolioWorkspace {
  return {
    as_of_date: "2026-05-12",
    portfolio: {
      portfolio_id: "PB_SG_GLOBAL_BAL_001",
      display_name: "Global Balanced Mandate",
      client_id: "CIF_SG_000184",
      base_currency: "USD",
      booking_center_code: "SG",
    },
    profile: {
      status: "ACTIVE",
      portfolio_type: "DISCRETIONARY",
      risk_exposure: "BALANCED",
      investment_time_horizon: "LONG_TERM",
      objective: "Growth and income",
      is_leverage_allowed: false,
      advisor_id: "RM_SG_001",
      open_date: "2025-01-06",
    },
    summary: {
      market_value_base: 1000000,
      invested_market_value_base: 920000,
      total_cash_base: 80000,
      cash_weight_pct: 8,
      position_count: 2,
      cash_balance_count: 1,
    },
    allocations: [
      { asset_class: "EQUITY", position_count: 1, market_value_base: 610000, weight_pct: 61 },
      { asset_class: "FIXED_INCOME", position_count: 1, market_value_base: 310000, weight_pct: 31 },
    ],
    allocation_views: [],
    cash_balances: [],
    top_positions: [
      {
        security_id: "AAPL",
        instrument_name: "Apple Inc.",
        asset_class: "EQUITY",
        quantity: 100,
        market_value_base: 18500,
        weight_pct: 1.85,
      },
    ],
    positions: [
      {
        security_id: "AAPL",
        instrument_name: "Apple Inc.",
        asset_class: "EQUITY",
        quantity: 100,
        market_value_base: 18500,
        unrealized_gain_loss_base: 1250,
        weight_pct: 1.85,
      },
    ],
    recent_transactions: [
      {
        transaction_id: "TXN-1",
        transaction_date: "2026-05-10",
        transaction_type: "BUY",
        security_id: "AAPL",
        instrument_id: "AAPL US",
        quantity: 100,
        gross_amount: 18000,
        net_cost_base: 18000,
        currency: "USD",
        settlement_status: "SETTLED",
      },
    ],
    income_summary: null,
    activity_summary: null,
    cashflow_outlook: {
      as_of_date: "2026-05-12",
      range_end_date: "2026-05-22",
      total_net_cashflow_base: 4000,
      projection_days: 10,
      include_projected: true,
      upcoming_points: [
        {
          projection_date: "2026-05-13",
          net_cashflow_base: -1000,
          projected_cumulative_cashflow_base: -1000,
        },
        {
          projection_date: "2026-05-14",
          net_cashflow_base: 5000,
          projected_cumulative_cashflow_base: 4000,
        },
      ],
    },
    performance: null,
    rebalance: {
      status: "READY",
      last_run_at_utc: null,
      last_rebalance_run_id: "rr_001",
    },
    control_capabilities: null,
    readiness: {
      has_positions: true,
      reporting: {
        status: "READY",
        generated_at_utc: "2026-05-12T00:00:00Z",
        row_count: 11,
      },
    },
    workflow_cues: [],
    workflow_actions: [],
    warnings: [],
    partial_failures: [],
  };
}
