import React from "react";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import PortfolioPairedAnalyticsSection from "../../src/apps/portfolio/components/portfolio-paired-analytics-section";
import type { PortfolioWorkspaceCapabilities } from "../../src/apps/portfolio/capabilities";
import type { PortfolioWorkspace } from "../../src/apps/portfolio/types";
import type { PortfolioWorkspaceContext } from "../../src/apps/portfolio/view-model";

vi.mock("next/dynamic", () => ({
  default: (loader: () => Promise<unknown>) => {
    const React = require("react");
    return function MockDynamicComponent(props: Record<string, unknown>) {
      const [Component, setComponent] = React.useState(
        null as React.ComponentType<Record<string, unknown>> | null
      );
      React.useEffect(() => {
        loader().then((mod: unknown) => {
          const resolved =
            typeof mod === "function"
              ? (mod as React.ComponentType<Record<string, unknown>>)
              : (mod as { default?: React.ComponentType<Record<string, unknown>> }).default;
          setComponent(() => resolved ?? null);
        });
      }, []);
      return Component ? React.createElement(Component, props) : null;
    };
  },
}));

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
    recent_transactions: [
      {
        transaction_id: "TX_1",
        transaction_date: "2026-02-20T00:00:00Z",
        transaction_type: "BUY",
        security_id: "EQ_1",
        instrument_id: "EQ_1",
        quantity: 10,
      },
    ],
    income_summary: {
      reporting_currency: "USD",
      window_start_date: "2026-01-25",
      window_end_date: "2026-02-24",
      totals_requested_window: {
        gross: { reporting_currency_amount: 2500, transaction_count: 2 },
        withholding_tax: { reporting_currency_amount: 200, transaction_count: 1 },
        other_deductions: { reporting_currency_amount: 50, transaction_count: 1 },
        net: { reporting_currency_amount: 2250, transaction_count: 2 },
      },
      totals_year_to_date: {
        gross: { reporting_currency_amount: 2600, transaction_count: 2 },
        withholding_tax: { reporting_currency_amount: 200, transaction_count: 1 },
        other_deductions: { reporting_currency_amount: 50, transaction_count: 1 },
        net: { reporting_currency_amount: 2350, transaction_count: 2 },
      },
      income_types: [
        {
          income_type: "DIVIDEND",
          requested_window: {
            gross: { reporting_currency_amount: 2500, transaction_count: 2 },
            withholding_tax: { reporting_currency_amount: 200, transaction_count: 1 },
            other_deductions: { reporting_currency_amount: 50, transaction_count: 1 },
            net: { reporting_currency_amount: 2250, transaction_count: 2 },
          },
          year_to_date: {
            gross: { reporting_currency_amount: 2600, transaction_count: 2 },
            withholding_tax: { reporting_currency_amount: 200, transaction_count: 1 },
            other_deductions: { reporting_currency_amount: 50, transaction_count: 1 },
            net: { reporting_currency_amount: 2350, transaction_count: 2 },
          },
        },
      ],
    },
    activity_summary: {
      reporting_currency: "USD",
      window_start_date: "2026-01-25",
      window_end_date: "2026-02-24",
      buckets: [
        {
          bucket: "INFLOWS",
          requested_window: { reporting_currency_amount: 1000, transaction_count: 1 },
          year_to_date: { reporting_currency_amount: 3000, transaction_count: 2 },
        },
        {
          bucket: "FEES",
          requested_window: { reporting_currency_amount: -250, transaction_count: 1 },
          year_to_date: { reporting_currency_amount: -450, transaction_count: 2 },
        },
      ],
    },
    cashflow_outlook: null,
    performance: null,
    rebalance: null,
    readiness: {
      has_positions: true,
      reporting: {
        status: "READY",
        generated_at_utc: "2026-02-24T00:00:00Z",
        row_count: 12,
      },
    },
    workflow_cues: [],
    warnings: [],
    partial_failures: [],
  };
}

function buildCapabilities(
  overrides: Partial<PortfolioWorkspaceCapabilities> = {}
): PortfolioWorkspaceCapabilities {
  return {
    summaryKpis: { state: "supported" },
    readinessIndicators: { state: "supported" },
    allocation: { state: "supported" },
    topHoldings: { state: "supported" },
    income: { state: "supported" },
    activity: { state: "supported" },
    projectedCashflow: { state: "hidden" },
    holdingsDrilldown: { state: "hidden" },
    transactionsDrilldown: { state: "hidden" },
    performanceSnapshot: { state: "unavailable", reason: "Performance snapshot unavailable." },
    ...overrides,
  };
}

const context: PortfolioWorkspaceContext = {
  selectedAsOfDate: "2026-02-24",
  selectedReportingCurrency: "USD",
  timeWindow: "30D",
  periodLabel: "30D",
  viewMode: "summary",
  columnMode: "essential",
  hideEmptyModules: false,
  focusExceptions: false,
  effectivePeriodStartDate: "2026-01-25",
  effectivePeriodEndDate: "2026-02-24",
  usesCustomDateRange: false,
  hasHistoricalGap: false,
  currencyOptions: ["USD"],
  supportsHistoricalSnapshots: false,
  supportsReportingCurrencyRestatement: false,
};

describe("PortfolioPairedAnalyticsSection", () => {
  it("renders income and activity as a coordinated paired module in summary mode", async () => {
    const { container } = render(
      <PortfolioPairedAnalyticsSection
        workspace={buildWorkspace()}
        context={context}
        capabilities={buildCapabilities()}
        detailsLoading={false}
        isDetailedView={false}
        incomeDisplayCurrency="USD"
        activityDisplayCurrency="USD"
        transactionDrilldown={null}
        onSelectActivityBucket={vi.fn()}
        getSectionExpanded={() => true}
        toggleSection={vi.fn()}
      />
    );

    expect(container.querySelector(".portfolio-paired-analytics-grid")).toBeTruthy();
    expect(container.querySelectorAll(".portfolio-analytics-summary-row")).toHaveLength(2);
    expect(container.querySelectorAll("[data-analytics-module]")).toHaveLength(2);
    expect(screen.getByLabelText("Income overview")).toBeInTheDocument();
    expect(screen.getByLabelText("Activity overview")).toBeInTheDocument();
    expect(screen.queryByLabelText("Income summary")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Activity summary")).not.toBeInTheDocument();
  });

  it("renders detailed support tables when the paired module is opened in detailed mode", async () => {
    render(
      <PortfolioPairedAnalyticsSection
        workspace={buildWorkspace()}
        context={{ ...context, viewMode: "detailed" }}
        capabilities={buildCapabilities()}
        detailsLoading={false}
        isDetailedView
        incomeDisplayCurrency="USD"
        activityDisplayCurrency="USD"
        transactionDrilldown={null}
        onSelectActivityBucket={vi.fn()}
        getSectionExpanded={() => true}
        toggleSection={vi.fn()}
        title="Recent Flows"
        subtitle="Income and client activity for 30D."
      />
    );

    expect(screen.getByRole("heading", { name: "Recent Flows" })).toBeInTheDocument();
    expect(screen.getByLabelText("Income summary")).toBeInTheDocument();
    expect(screen.getByLabelText("Activity summary")).toBeInTheDocument();
  });

  it("renders capability-driven partial and unavailable states intentionally", () => {
    const workspace = buildWorkspace();

    render(
      <PortfolioPairedAnalyticsSection
        workspace={{ ...workspace, income_summary: null, activity_summary: null }}
        context={context}
        capabilities={buildCapabilities({
          income: {
            state: "partial",
            reason: "Income summary is not available for the current reporting window.",
          },
          activity: {
            state: "unavailable",
            reason: "No activity summary is available in the current reporting window.",
          },
        })}
        detailsLoading={false}
        isDetailedView={false}
        incomeDisplayCurrency="USD"
        activityDisplayCurrency="USD"
        transactionDrilldown={null}
        onSelectActivityBucket={vi.fn()}
        getSectionExpanded={() => true}
        toggleSection={vi.fn()}
      />
    );

    expect(screen.getByText("Income is not classified yet")).toBeInTheDocument();
    expect(
      screen.getByText("Income summary is not available for the current reporting window.")
    ).toBeInTheDocument();
    expect(screen.getByText("No client activity")).toBeInTheDocument();
    expect(
      screen.getByText("No activity summary is available in the current reporting window.")
    ).toBeInTheDocument();
  });
});
