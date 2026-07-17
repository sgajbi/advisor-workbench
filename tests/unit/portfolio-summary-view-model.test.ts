import { describe, expect, it } from "vitest";

import {
  buildPortfolioSummaryAttentionItems,
  buildPortfolioSummaryReadiness,
  resolvePortfolioCashflowPointHeight,
  resolvePortfolioSummaryAllocationRows,
  resolvePortfolioSummaryTopHoldingRows,
} from "../../src/apps/portfolio/portfolio-summary-view-model";
import type { PortfolioWorkspace } from "../../src/apps/portfolio/types";

describe("portfolio summary view model", () => {
  it("prefers source allocation buckets and preserves portfolio weights", () => {
    const workspace = buildWorkspace({
      allocations: [
        { asset_class: "EQUITY", position_count: 3, market_value_base: 280000, weight_pct: 28 },
        { asset_class: "FIXED_INCOME", position_count: 2, market_value_base: 200000, weight_pct: 20 },
      ],
      allocation_views: [
        {
          dimension: "asset_class",
          buckets: [{ bucket: "CASH", position_count: 1, market_value_base: 80000, weight_pct: 8 }],
        },
      ],
    });

    expect(resolvePortfolioSummaryAllocationRows(workspace)).toEqual([
      { label: "Equity", weight: 28, value: 280000 },
      { label: "Fixed Income", weight: 20, value: 200000 },
    ]);
  });

  it("falls back to detailed positions for top holdings and joins unrealized P&L", () => {
    const workspace = buildWorkspace({
      top_positions: [],
      positions: [
        buildPosition("LOW", 4, 1000, 10),
        buildPosition("HIGH", 18, 9000, 250),
        buildPosition("MID", 9, 4000, -50),
      ],
    });

    expect(resolvePortfolioSummaryTopHoldingRows(workspace).map((row) => row.securityId)).toEqual([
      "HIGH",
      "MID",
      "LOW",
    ]);
    expect(resolvePortfolioSummaryTopHoldingRows(workspace)[0]).toMatchObject({
      assetClass: "Equity",
      unrealizedPnl: 250,
    });
  });

  it("builds bounded attention items without inventing advisor actions", () => {
    const workspace = buildWorkspace({
      partial_failures: [
        { source_service: "lotus-core", error_code: "PRICE_GAP", detail: "Missing price" },
      ],
      summary: {
        market_value_base: 100000,
        total_cash_base: 12000,
        cash_weight_pct: 12,
        position_count: 3,
      },
      insights: [
        {
          key: "drift",
          title: "Mandate Drift",
          detail: "US equity exposure near upper threshold.",
          severity: "warning",
          href: "/portfolio",
        },
      ],
    });

    expect(buildPortfolioSummaryAttentionItems(workspace)).toEqual([
      expect.objectContaining({
        title: "Reporting coverage needs attention",
        tone: "warn",
      }),
      expect.objectContaining({
        title: "Mandate Drift",
        tone: "warn",
      }),
    ]);
    expect(buildPortfolioSummaryAttentionItems(workspace)).not.toEqual(
      expect.arrayContaining([expect.objectContaining({ title: "Cash Review Needed" })])
    );
  });

  it("does not repeat a partial failure after a shaped exception is available", () => {
    const workspace = buildWorkspace({
      exception_summaries: [
        {
          key: "pricing",
          title: "Pricing coverage incomplete",
          detail: "Some holdings lack current valuation coverage.",
          tone: "warn",
          href: "#portfolio-attention",
        },
      ],
      partial_failures: [
        { source_service: "lotus-core", error_code: "PRICE_GAP", detail: "Missing price" },
      ],
      insights: [
        {
          key: "drift",
          title: "Mandate Drift",
          detail: "US equity exposure near upper threshold.",
          severity: "warning",
          href: "/portfolio",
        },
      ],
    });

    expect(buildPortfolioSummaryAttentionItems(workspace).map((item) => item.title)).toEqual([
      "Pricing coverage incomplete",
      "Mandate Drift",
    ]);
  });

  it("preserves the source-backed portfolio readiness posture", () => {
    const workspace = buildWorkspace({
      readiness_indicators: [
        { key: "holdings", label: "Holdings", status: "Ready", href: "/positions" },
        { key: "pricing", label: "Pricing", status: "Missing", href: "#portfolio-attention" },
        { key: "transactions", label: "Transactions", status: "Ready", href: "/transactions" },
        { key: "reporting", label: "Reporting", status: "Ready", href: "/portfolio" },
      ],
    });

    expect(buildPortfolioSummaryReadiness(workspace)).toEqual({
      statusLabel: "Partial",
      support: "Generated 12 May 2026 • 11 report rows",
      tone: "warn",
    });
  });

  it("scales cashflow point heights against the largest projected movement", () => {
    const cashflow = buildWorkspace().cashflow_outlook!;

    expect(resolvePortfolioCashflowPointHeight(-1000, cashflow)).toBeCloseTo(42, 4);
    expect(resolvePortfolioCashflowPointHeight(3000, cashflow)).toBe(90);
  });
});

function buildWorkspace(overrides: Partial<PortfolioWorkspace> = {}): PortfolioWorkspace {
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
      market_value_base: 100000,
      total_cash_base: 6000,
      cash_weight_pct: 6,
      position_count: 3,
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
      as_of_date: "2026-05-12",
      range_end_date: "2026-05-22",
      total_net_cashflow_base: 2000,
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
          net_cashflow_base: 3000,
          projected_cumulative_cashflow_base: 2000,
        },
      ],
    },
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
    ...overrides,
  };
}

function buildPosition(
  securityId: string,
  weight: number,
  marketValue: number,
  unrealizedPnl: number
): PortfolioWorkspace["positions"][number] {
  return {
    security_id: securityId,
    instrument_name: `${securityId} Instrument`,
    asset_class: "EQUITY",
    quantity: 10,
    market_value_base: marketValue,
    weight_pct: weight,
    unrealized_gain_loss_base: unrealizedPnl,
  };
}
