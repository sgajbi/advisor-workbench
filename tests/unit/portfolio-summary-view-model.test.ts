import { describe, expect, it } from "vitest";

import {
  buildPortfolioSourceLimitations,
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

  it("qualifies a ready book when source-owned performance evidence is partial", () => {
    const workspace = buildWorkspace({
      operations: {
        publish_allowed: true,
        controls_blocking: false,
      },
      performance: {
        period: "YTD",
        return_pct: 4.2,
        warnings: ["Benchmark history contains one delayed market close."],
        partial_failures: [
          {
            source_service: "lotus-performance",
            error_code: "MARKET_DATA_DELAY",
            detail: "One benchmark data point was delayed and backfilled.",
          },
        ],
      },
    });

    expect(buildPortfolioSummaryReadiness(workspace)).toEqual({
      statusLabel: "Partial",
      support: "Book evidence is available; supporting review evidence needs attention.",
      tone: "warn",
    });
    expect(buildPortfolioSummaryAttentionItems(workspace)).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          title: "Performance evidence needs attention",
          detail: "One benchmark data point was delayed and backfilled.",
        }),
        expect.objectContaining({
          title: "Performance evidence is qualified",
          detail: "Benchmark history contains one delayed market close.",
        }),
      ])
    );
  });

  it("preserves the core-book explanation when supporting evidence is also limited", () => {
    const workspace = buildWorkspace({
      readiness: {
        has_positions: false,
        reporting: {
          status: "NOT_READY",
          generated_at_utc: null,
          row_count: 0,
        },
      },
      operations: {
        publish_allowed: false,
        controls_blocking: false,
      },
      performance: {
        period: "MTD",
        return_pct: null,
        warnings: ["Performance evidence is delayed."],
        partial_failures: [],
      },
    });

    expect(buildPortfolioSummaryReadiness(workspace)).toEqual({
      statusLabel: "Not Ready",
      support: "Publication currently blocked",
      tone: "danger",
    });
  });

  it("qualifies a ready book with source-owned standard-period limitations", () => {
    const workspace = buildWorkspace({
      operations: {
        publish_allowed: true,
        controls_blocking: false,
      },
      performance: {
        period: "30D",
        return_pct: 2.4,
        warnings: [],
        partial_failures: [],
      },
      performance_period_returns: [
        {
          period: "MTD",
          return_pct: null,
          unavailable: {
            title: "Performance history incomplete",
            detail: "MTD valuation history is incomplete.",
            requirements: ["Daily valuations"],
          },
        },
        {
          period: "QTD",
          return_pct: 1.2,
          warnings: ["One benchmark close is delayed."],
        },
        {
          period: "YTD",
          return_pct: 4.5,
          partial_failures: [
            {
              source_service: "lotus-performance",
              error_code: "BENCHMARK_PARTIAL",
              detail: "Benchmark-relative return is partial.",
            },
          ],
        },
      ],
    });

    expect(buildPortfolioSummaryReadiness(workspace)).toEqual({
      statusLabel: "Partial",
      support: "Book evidence is available; supporting review evidence needs attention.",
      tone: "warn",
    });
    expect(buildPortfolioSourceLimitations(workspace)).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          title: "MTD performance unavailable",
          detail: "MTD valuation history is incomplete.",
        }),
        expect.objectContaining({
          title: "QTD performance evidence is qualified",
          detail: "One benchmark close is delayed.",
        }),
        expect.objectContaining({
          title: "YTD performance evidence needs attention",
          detail: "Benchmark-relative return is partial.",
        }),
      ])
    );
  });

  it("does not duplicate source posture for a selected standard period", () => {
    const workspace = buildWorkspace({
      performance: {
        period: "MTD",
        return_pct: null,
        unavailable: {
          title: "MTD performance unavailable",
          detail: "MTD valuation history is incomplete.",
          requirements: ["Daily valuations"],
        },
        warnings: [],
        partial_failures: [],
      },
      performance_period_returns: [
        {
          period: "MTD",
          return_pct: null,
          unavailable: {
            title: "MTD performance unavailable",
            detail: "MTD valuation history is incomplete.",
            requirements: ["Daily valuations"],
          },
        },
      ],
    });

    expect(
      buildPortfolioSourceLimitations(workspace).filter(
        (limitation) => limitation.detail === "MTD valuation history is incomplete."
      )
    ).toHaveLength(1);
  });

  it("preserves period identity when source limitations share the same detail", () => {
    const workspace = buildWorkspace({
      performance_period_returns: [
        {
          period: "QTD",
          return_pct: 1.2,
          warnings: ["One benchmark close is delayed."],
        },
        {
          period: "YTD",
          return_pct: 4.5,
          warnings: ["One benchmark close is delayed."],
        },
      ],
    });

    expect(
      buildPortfolioSourceLimitations(workspace)
        .filter((limitation) => limitation.detail === "One benchmark close is delayed.")
        .map((limitation) => limitation.title)
    ).toEqual([
      "QTD performance evidence is qualified",
      "YTD performance evidence is qualified",
    ]);
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
