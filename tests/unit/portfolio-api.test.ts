import { afterEach, describe, expect, it, vi } from "vitest";

import {
  getPortfolioWorkspaceDetails,
  getPortfolioWorkspaceShell,
  mergePortfolioWorkspace,
} from "../../src/apps/portfolio/api";

describe("portfolio api", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("builds a shell workspace without waiting for detail modules", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: string | URL) => {
        const url = input.toString();

        if (url.includes("/workspace")) {
          return jsonResponse({
            as_of_date: "2026-03-28",
            portfolio: {
              portfolio_id: "MANUAL_PB_USD_001",
              display_name: "MANUAL_PB_USD_001",
              client_id: "MANUAL_CIF_001",
              base_currency: "USD",
              booking_center_code: "Singapore",
            },
            profile: {
              status: "ACTIVE",
              portfolio_type: "Advisory",
              risk_exposure: "Moderate Growth",
              investment_time_horizon: "Long Term",
              objective: "Long-term capital appreciation.",
              is_leverage_allowed: false,
            },
            summary: {
              assets_under_management_base: 1001550.05,
              invested_market_value_base: 917032.95,
              cash_market_value_base: 84517.1,
              cash_weight_pct: 8.43863,
              position_count: 9,
              cash_balance_count: 2,
            },
            cashflow_outlook: null,
            reporting: {
              status: "READY",
              generated_at_utc: "2026-03-28T08:00:00Z",
              row_count: 4,
            },
            workflow_cues: [{ key: "performance", label: "Performance", href: "/performance" }],
            warnings: [],
            partial_failures: [],
          });
        }

        throw new Error(`Unexpected fetch: ${url}`);
      })
    );

    const shell = await getPortfolioWorkspaceShell("MANUAL_PB_USD_001");

    expect(shell?.portfolio.portfolio_id).toBe("MANUAL_PB_USD_001");
    expect(shell?.allocations).toEqual([]);
    expect(shell?.positions).toEqual([]);
    expect(shell?.recent_transactions).toEqual([]);
    expect(shell?.readiness_indicators).toBeUndefined();
    expect(shell?.workflow_actions).toBeUndefined();
  });

  it("loads detail modules and merges them into the shell workspace", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: string | URL) => {
        const url = input.toString();

        if (url.includes("/liquidity")) {
          return jsonResponse({
            cash_balances: [
              {
                security_id: "CASH_USD",
                instrument_name: "USD Operating Cash",
                currency: "USD",
                quantity: 66122,
                market_value_base: 66122,
                weight_pct: 6.6,
              },
            ],
            cashflow_outlook: {
              as_of_date: "2026-03-28",
              range_end_date: "2026-04-07",
              total_net_cashflow_base: 0,
              projection_days: 10,
              include_projected: true,
              upcoming_points: [],
            },
          });
        }

        if (url.includes("/allocations")) {
          return jsonResponse({
            views: [
              {
                dimension: "asset_class",
                buckets: [
                  {
                    bucket: "Equities",
                    position_count: 3,
                    market_value_base: 349705,
                    weight_pct: 34.92,
                  },
                ],
              },
            ],
          });
        }

        if (url.includes("/positions")) {
          return jsonResponse({
            top_positions: [
              {
                security_id: "EQ_US_AAPL_MANUAL_001",
                instrument_name: "Apple Inc.",
                asset_class: "Equities",
                quantity: 700,
                market_value_base: 147000,
                weight_pct: 14.67,
              },
            ],
            positions: [
              {
                security_id: "EQ_US_AAPL_MANUAL_001",
                instrument_name: "Apple Inc.",
                asset_class: "Equities",
                quantity: 700,
                market_value_base: 147000,
                market_value_local: 147000,
                weight_pct: 14.67,
              },
            ],
          });
        }

        if (url.includes("/transactions")) {
          return jsonResponse({
            transactions: [
              {
                transaction_id: "TX_1",
                transaction_date: "2026-03-28T00:00:00Z",
                transaction_type: "BUY",
                security_id: "EQ_US_AAPL_MANUAL_001",
                instrument_id: "EQ_US_AAPL_MANUAL_001",
                quantity: 700,
              },
            ],
          });
        }

        if (url.includes("/readiness")) {
          return jsonResponse({
            indicators: [
              { key: "holdings", label: "Holdings", status: "Ready", href: "#portfolio-insights" },
            ],
          });
        }

        if (url.includes("/workflow")) {
          return jsonResponse({
            actions: [
              {
                sequence: 1,
                title: "Review performance",
                impact: "Review portfolio return.",
                target: "Target: Performance workflow",
                href: "/performance",
                cta_label: "Performance",
                recommended: true,
              },
            ],
          });
        }

        if (url.includes("/income-summary")) {
          return jsonResponse({
            reporting_currency: "USD",
            window_start_date: "2026-03-01",
            window_end_date: "2026-03-28",
            totals_requested_window: {
              gross: { reporting_currency_amount: 350, transaction_count: 1 },
              withholding_tax: { reporting_currency_amount: 0, transaction_count: 1 },
              other_deductions: { reporting_currency_amount: 0, transaction_count: 1 },
              net: { reporting_currency_amount: 350, transaction_count: 1 },
            },
            totals_year_to_date: {
              gross: { reporting_currency_amount: 350, transaction_count: 1 },
              withholding_tax: { reporting_currency_amount: 0, transaction_count: 1 },
              other_deductions: { reporting_currency_amount: 0, transaction_count: 1 },
              net: { reporting_currency_amount: 350, transaction_count: 1 },
            },
            income_types: [],
          });
        }

        if (url.includes("/activity-summary")) {
          return jsonResponse({
            reporting_currency: "USD",
            window_start_date: "2026-03-01",
            window_end_date: "2026-03-28",
            buckets: [],
          });
        }

        throw new Error(`Unexpected fetch: ${url}`);
      })
    );

    const shell = {
      as_of_date: "2026-03-28",
      portfolio: {
        portfolio_id: "MANUAL_PB_USD_001",
        display_name: "MANUAL_PB_USD_001",
        client_id: "MANUAL_CIF_001",
        base_currency: "USD",
        booking_center_code: "Singapore",
      },
      profile: {
        status: "ACTIVE",
        portfolio_type: "Advisory",
        risk_exposure: "Moderate Growth",
        investment_time_horizon: "Long Term",
        objective: "Long-term capital appreciation.",
        is_leverage_allowed: false,
      },
      summary: {
        market_value_base: 1001550.05,
        invested_market_value_base: 917032.95,
        total_cash_base: 84517.1,
        cash_weight_pct: 8.43863,
        position_count: 9,
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
      cashflow_outlook: null,
      performance: null,
      rebalance: null,
      readiness: {
        has_positions: true,
        reporting: { status: "READY", generated_at_utc: null, row_count: 4 },
      },
      workflow_cues: [],
      warnings: [],
      partial_failures: [],
    };

    const details = await getPortfolioWorkspaceDetails("MANUAL_PB_USD_001");
    const merged = mergePortfolioWorkspace(shell, details!);

    expect(details?.allocation_views?.[0].dimension).toBe("asset_class");
    expect(merged.top_positions[0].market_value_base).toBe(147000);
    expect(merged.positions[0].market_value_local).toBe(147000);
    expect(merged.cash_balances?.[0].market_value_base).toBe(66122);
    expect(merged.income_summary?.totals_requested_window.net.reporting_currency_amount).toBe(350);
    expect(merged.readiness_indicators?.[0].status).toBe("Ready");
    expect(merged.workflow_actions?.[0].title).toBe("Review performance");
  });
});

function jsonResponse(payload: unknown): Response {
  return new Response(JSON.stringify(payload), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}
