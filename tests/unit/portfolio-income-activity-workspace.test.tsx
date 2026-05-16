import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import PortfolioIncomeActivityWorkspace from "../../src/apps/portfolio/components/portfolio-income-activity-workspace";
import type { PortfolioWorkspace } from "../../src/apps/portfolio/types";

describe("PortfolioIncomeActivityWorkspace", () => {
  it("renders booked income and activity without local forecasts", () => {
    render(<PortfolioIncomeActivityWorkspace workspace={buildWorkspace()} />);

    expect(screen.getByRole("heading", { name: "Income Summary" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Activity & Cash Movements" })).toBeInTheDocument();
    expect(screen.getByText(/Classified booked income only/i)).toBeInTheDocument();

    const incomeTable = screen.getByRole("table", { name: "Income summary" });
    expect(within(incomeTable).getByText("Dividends")).toBeInTheDocument();
    expect(within(incomeTable).getByText("Fixed Income Coupons")).toBeInTheDocument();
    expect(within(incomeTable).getAllByText("Ready").length).toBeGreaterThanOrEqual(2);

    const activityTable = screen.getByRole("table", { name: "Activity and cash movements" });
    expect(within(activityTable).getByText("External Funding")).toBeInTheDocument();
    expect(within(activityTable).getByText("Trading Settlements")).toBeInTheDocument();
    expect(within(activityTable).getByText("Total Net Cashflow")).toBeInTheDocument();
    expect(screen.getByText("Cash Weight")).toBeInTheDocument();
    expect(screen.getByText("4.20%")).toBeInTheDocument();
  });

  it("shows truthful empty states when source summaries are absent", () => {
    render(
      <PortfolioIncomeActivityWorkspace
        workspace={{
          ...buildWorkspace(),
          income_summary: null,
          activity_summary: null,
        }}
      />
    );

    expect(screen.getByText("Income is not classified yet")).toBeInTheDocument();
    expect(screen.getByText("Activity totals are incomplete")).toBeInTheDocument();
    expect(
      screen.getByText("No classified income was returned for the selected reporting window.")
    ).toBeInTheDocument();
    expect(
      screen.getByText("No activity buckets were returned for the selected reporting window.")
    ).toBeInTheDocument();
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
    },
    summary: {
      market_value_base: 1000000,
      invested_market_value_base: 958000,
      total_cash_base: 42000,
      cash_weight_pct: 4.2,
      position_count: 12,
      cash_balance_count: 1,
    },
    allocations: [],
    allocation_views: [],
    cash_balances: [],
    top_positions: [],
    positions: [],
    recent_transactions: [],
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
        {
          income_type: "FIXED_INCOME_COUPONS",
          requested_window: buildIncomePeriod(15201.4, 1),
          year_to_date: buildIncomePeriod(38400, 2),
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
        {
          bucket: "TRADING_SETTLEMENTS",
          requested_window: {
            reporting_currency_amount: 3950,
            transaction_count: 2,
          },
          year_to_date: {
            reporting_currency_amount: 3950,
            transaction_count: 2,
          },
        },
      ],
    },
    cashflow_outlook: null,
    performance: null,
    rebalance: null,
    control_capabilities: null,
    readiness: {
      has_positions: true,
      reporting: {
        status: "READY",
        generated_at_utc: "2026-05-12T00:00:00Z",
        row_count: 12,
      },
    },
    workflow_cues: [],
    workflow_actions: [],
    warnings: [],
    partial_failures: [],
  };
}

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
