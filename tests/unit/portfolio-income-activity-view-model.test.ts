import { describe, expect, it } from "vitest";

import {
  buildActivityMovementSummary,
  buildPortfolioIncomeActivityReview,
  formatPortfolioActivityLabel,
  formatPortfolioIncomeTypeLabel,
  getPortfolioActivityDirection,
  getSignedPortfolioActivityAmount,
} from "../../src/apps/portfolio/portfolio-income-activity-view-model";
import type { PortfolioWorkspace } from "../../src/apps/portfolio/types";

describe("portfolio income and activity view model", () => {
  it("maps Gateway positive magnitudes to truthful cash direction and net movement", () => {
    const activity = buildWorkspace().activity_summary;
    const summary = buildActivityMovementSummary(activity);

    expect(summary).toEqual({
      grossInflows: 100_000,
      grossOutflows: 26_500,
      netMovement: 73_500,
      unclassifiedMovement: 2_000,
      bookingCount: 6,
      classifiedBookingCount: 5,
      unclassifiedBookingCount: 1,
    });
    expect(getPortfolioActivityDirection("INFLOWS")).toBe("inflow");
    expect(getPortfolioActivityDirection("FEES")).toBe("outflow");
    expect(getPortfolioActivityDirection("CORPORATE_ACTIONS")).toBe("unclassified");
    expect(getSignedPortfolioActivityAmount("OUTFLOWS", 25_000)).toBe(-25_000);
    expect(getSignedPortfolioActivityAmount("FEES", -1_000)).toBe(-1_000);
    expect(getSignedPortfolioActivityAmount("CORPORATE_ACTIONS", 2_000)).toBeNull();
  });

  it("builds a source-backed gross-to-net income review and excludes unknown activity from net", () => {
    const review = buildPortfolioIncomeActivityReview(buildWorkspace());

    expect(review.income?.requestedWindow).toEqual({
      gross: 12_000,
      withholdingTax: 1_200,
      otherDeductions: 300,
      net: 10_500,
      bookingCount: 3,
    });
    expect(review.income?.rows.map((row) => row.label)).toEqual([
      "Dividend income",
      "Interest income",
    ]);
    expect(review.activity?.requestedWindow.netMovement).toBe(73_500);
    expect(review.activity?.requestedWindow.unclassifiedMovement).toBe(2_000);
    expect(review.activity?.rows).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          key: "OUTFLOWS",
          label: "Withdrawals and transfers out",
          direction: "outflow",
          requestedWindowAmount: -25_000,
        }),
        expect.objectContaining({
          key: "CORPORATE_ACTIONS",
          label: "Other activity · Corporate Actions",
          direction: "unclassified",
          requestedWindowAmount: 2_000,
        }),
      ]),
    );
  });

  it("uses business labels for canonical income and activity codes", () => {
    expect(formatPortfolioIncomeTypeLabel("DIVIDEND")).toBe("Dividend income");
    expect(formatPortfolioIncomeTypeLabel("INTEREST")).toBe("Interest income");
    expect(formatPortfolioActivityLabel("INFLOWS")).toBe("Subscriptions and transfers in");
    expect(formatPortfolioActivityLabel("TAXES")).toBe("Taxes");
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
      market_value_base: 1_000_000,
      invested_market_value_base: 958_000,
      total_cash_base: 42_000,
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
      totals_requested_window: buildIncomePeriod(12_000, 1_200, 300, 10_500, 3),
      totals_year_to_date: buildIncomePeriod(30_000, 3_000, 500, 26_500, 8),
      income_types: [
        {
          income_type: "DIVIDEND",
          requested_window: buildIncomePeriod(8_000, 1_000, 0, 7_000, 2),
          year_to_date: buildIncomePeriod(20_000, 2_500, 0, 17_500, 5),
        },
        {
          income_type: "INTEREST",
          requested_window: buildIncomePeriod(4_000, 200, 300, 3_500, 1),
          year_to_date: buildIncomePeriod(10_000, 500, 500, 9_000, 3),
        },
      ],
    },
    activity_summary: {
      reporting_currency: "USD",
      window_start_date: "2026-04-12",
      window_end_date: "2026-05-12",
      buckets: [
        buildActivityBucket("INFLOWS", 100_000, 150_000, 1),
        buildActivityBucket("OUTFLOWS", 25_000, 40_000, 1),
        buildActivityBucket("FEES", 1_000, 2_500, 1),
        buildActivityBucket("TAXES", 500, 1_500, 2),
        buildActivityBucket("CORPORATE_ACTIONS", 2_000, 3_000, 1),
      ],
    },
    cashflow_outlook: null,
    performance: null,
    rebalance: null,
    control_capabilities: null,
    readiness: {
      has_positions: true,
      reporting: { status: "READY", generated_at_utc: "2026-05-12T00:00:00Z", row_count: 12 },
    },
    workflow_cues: [],
    workflow_actions: [],
    warnings: [],
    partial_failures: [],
  };
}

function buildIncomePeriod(
  gross: number,
  withholdingTax: number,
  otherDeductions: number,
  net: number,
  transactionCount: number,
) {
  return {
    gross: { reporting_currency_amount: gross, transaction_count: transactionCount },
    withholding_tax: {
      reporting_currency_amount: withholdingTax,
      transaction_count: transactionCount,
    },
    other_deductions: {
      reporting_currency_amount: otherDeductions,
      transaction_count: transactionCount,
    },
    net: { reporting_currency_amount: net, transaction_count: transactionCount },
  };
}

function buildActivityBucket(bucket: string, requested: number, yearToDate: number, count: number) {
  return {
    bucket,
    requested_window: { reporting_currency_amount: requested, transaction_count: count },
    year_to_date: { reporting_currency_amount: yearToDate, transaction_count: count },
  };
}
