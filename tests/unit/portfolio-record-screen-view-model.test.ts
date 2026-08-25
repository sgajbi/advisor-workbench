import { describe, expect, it } from "vitest";

import {
  buildPortfolioRecordHeaderKpis,
  buildPortfolioRecordScreenSubtitle,
  getPortfolioRecordScreenCopy,
  resolvePortfolioRecordScreenWindow,
} from "../../src/apps/portfolio/portfolio-record-screen-view-model";
import type { PortfolioWorkspace } from "../../src/apps/portfolio/types";
import {
  PORTFOLIO_CURRENCY_LABELS,
  PORTFOLIO_SCREEN_LABELS,
} from "../../src/apps/portfolio/portfolio-terminology";

describe("portfolio record screen view model", () => {
  it("keeps screen copy centralized for the standalone record pages", () => {
    expect(getPortfolioRecordScreenCopy("positions")).toMatchObject({
      title: PORTFOLIO_SCREEN_LABELS.positions,
    });
    expect(getPortfolioRecordScreenCopy("allocation")).toMatchObject({
      title: PORTFOLIO_SCREEN_LABELS.allocation,
      subtitle:
        "Review portfolio exposures and trace each direct allocation to its contributing positions.",
    });
    expect(getPortfolioRecordScreenCopy("transactions")).toMatchObject({
      title: PORTFOLIO_SCREEN_LABELS.transactions,
      subtitle: expect.stringContaining("source lineage"),
    });
    expect(getPortfolioRecordScreenCopy("income")).toMatchObject({
      title: PORTFOLIO_SCREEN_LABELS.incomeAndActivity,
      subtitle: expect.stringContaining("booked income"),
    });
    expect(getPortfolioRecordScreenCopy("cashflow")).toMatchObject({
      title: PORTFOLIO_SCREEN_LABELS.projectedCashFlow,
    });
    expect(getPortfolioRecordScreenCopy("cashflow").subtitle).toContain(
      "not projected cash balances"
    );
  });

  it("builds record headers from source-backed workspace fields", () => {
    const workspace = buildWorkspace();

    expect(buildPortfolioRecordScreenSubtitle("positions")).toBe(
      "Review the complete booked inventory, valuation, cost basis, portfolio weights, and recent position activity."
    );
    expect(buildPortfolioRecordHeaderKpis(workspace)).toEqual([
      { label: "Portfolio value", value: "1,000,000 USD" },
      { label: "Positions", value: "11" },
      { label: "Window", value: "30D" },
    ]);
    expect(buildPortfolioRecordHeaderKpis(workspace, "30D", "allocation")).toEqual([
      { label: "Portfolio value", value: "1,000,000 USD" },
      { label: "Exposure views", value: "1" },
      { label: "Positions", value: "11" },
    ]);
    expect(buildPortfolioRecordHeaderKpis(workspace, "30D", "positions")).toEqual([
      { label: "Portfolio value", value: "1,000,000 USD" },
      { label: "Invested", value: "920,000 USD" },
      { label: "Cash", value: "80,000 USD" },
    ]);
    expect(buildPortfolioRecordHeaderKpis(workspace, "30D", "income")).toEqual([
      { label: "Net income", value: "N/A" },
      { label: "Net cash movement", value: "N/A" },
      { label: PORTFOLIO_CURRENCY_LABELS.base, value: "USD" },
    ]);
    expect(
      buildPortfolioRecordHeaderKpis(
        {
          ...workspace,
          operations: { latest_booked_transaction_date: "2026-05-10" },
          transaction_ledger_page: { total: 412, skip: 0, limit: 200 },
        },
        "30D",
        "transactions",
      ),
    ).toEqual([
      { label: PORTFOLIO_CURRENCY_LABELS.base, value: "USD" },
      { label: "Latest booking", value: "10 May 2026" },
      { label: "30D entries", value: "412" },
    ]);

    expect(
      buildPortfolioRecordHeaderKpis(
        {
          ...workspace,
          income_summary: {
            reporting_currency: "SGD",
            window_start_date: "2026-04-12",
            window_end_date: "2026-05-12",
            totals_requested_window: buildIncomePeriod(42901.4, 3),
            totals_year_to_date: buildIncomePeriod(128450, 8),
            income_types: [],
          },
          activity_summary: {
            reporting_currency: "SGD",
            window_start_date: "2026-04-12",
            window_end_date: "2026-05-12",
            buckets: [
              {
                bucket: "INFLOWS",
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
                bucket: "FEES",
                requested_window: {
                  reporting_currency_amount: 1450,
                  transaction_count: 1,
                },
                year_to_date: {
                  reporting_currency_amount: 1450,
                  transaction_count: 1,
                },
              },
            ],
          },
        },
        "30D",
        "income"
      )
    ).toEqual([
      { label: "Net income", value: "42,901.4 SGD" },
      { label: "Net cash movement", value: "148,550 SGD" },
      { label: PORTFOLIO_CURRENCY_LABELS.reporting, value: "SGD" },
    ]);

    expect(
      buildPortfolioRecordHeaderKpis(
        {
          ...workspace,
          cashflow_outlook: {
            as_of_date: "2026-05-12",
            range_end_date: "2026-06-11",
            total_net_cashflow_base: 45200,
            projection_days: 30,
            include_projected: true,
            upcoming_points: [
              {
                projection_date: "2026-05-20",
                net_cashflow_base: 45200,
                projected_cumulative_cashflow_base: 8457200,
              },
            ],
          },
        },
        "30D",
        "cashflow"
      )
    ).toEqual([
      { label: "Current cash", value: "80,000 USD" },
      { label: "Cash weight", value: "8.00%" },
      { label: PORTFOLIO_CURRENCY_LABELS.base, value: "USD" },
    ]);
  });

  it("resolves the canonical thirty-day record window from the portfolio as-of date", () => {
    expect(resolvePortfolioRecordScreenWindow("2026-05-12")).toEqual({
      startDate: "2026-04-12",
      endDate: "2026-05-12",
    });
  });

  it("resolves the carried year-to-date window without a hidden 30-day fallback", () => {
    expect(resolvePortfolioRecordScreenWindow("2026-05-12", "YTD")).toEqual({
      startDate: "2026-01-01",
      endDate: "2026-05-12",
    });
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
      position_count: 11,
      cash_balance_count: 1,
    },
    allocations: [],
    allocation_views: [
      {
        dimension: "asset_class",
        buckets: [
          { bucket: "Equity", market_value_base: 620000, weight_pct: 62, position_count: 6 },
          { bucket: "Fixed Income", market_value_base: 300000, weight_pct: 30, position_count: 5 },
        ],
      },
    ],
    cash_balances: [],
    top_positions: [],
    positions: [],
    recent_transactions: [],
    income_summary: null,
    activity_summary: null,
    cashflow_outlook: null,
    performance: null,
    rebalance: null,
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
