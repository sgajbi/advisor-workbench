import { describe, expect, it } from "vitest";

import {
  buildPortfolioRecordHeaderKpis,
  buildPortfolioRecordHeaderMeta,
  buildPortfolioRecordScreenSubtitle,
  getPortfolioRecordScreenCopy,
  resolvePortfolioRecordScreenWindow,
} from "../../src/apps/portfolio/portfolio-record-screen-view-model";
import type { PortfolioWorkspace } from "../../src/apps/portfolio/types";

describe("portfolio record screen view model", () => {
  it("keeps screen copy centralized for the standalone record pages", () => {
    expect(getPortfolioRecordScreenCopy("positions")).toMatchObject({
      title: "Positions",
      kicker: "Position inventory",
    });
    expect(getPortfolioRecordScreenCopy("transactions").subtitle).toContain("source lineage");
    expect(getPortfolioRecordScreenCopy("cashflow").subtitle).toContain("Forward liquidity");
  });

  it("builds record headers from source-backed workspace fields", () => {
    const workspace = buildWorkspace();

    expect(buildPortfolioRecordScreenSubtitle("positions", workspace)).toBe(
      "PB_SG_GLOBAL_BAL_001 · Holdings, valuation, cost basis, portfolio weights, and unrealized P&L."
    );
    expect(buildPortfolioRecordHeaderMeta(workspace)).toBe(
      "Discretionary mandate · USD · As of 12 May 2026 · CIF_SG_000184"
    );
    expect(buildPortfolioRecordHeaderKpis(workspace)).toEqual([
      { label: "Total Market Value", value: "1,000,000 USD" },
      { label: "Positions", value: "11" },
      { label: "Window", value: "30D" },
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
      { label: "Net Flow", value: "45,200 USD" },
      { label: "Horizon", value: "30D" },
      { label: "Ending Cumulative", value: "8,457,200 USD" },
    ]);
  });

  it("resolves the canonical thirty-day record window from the portfolio as-of date", () => {
    expect(resolvePortfolioRecordScreenWindow("2026-05-12")).toEqual({
      startDate: "2026-04-12",
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
    allocation_views: [],
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
