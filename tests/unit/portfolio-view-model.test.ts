import { describe, expect, it } from "vitest";

import type { PortfolioWorkspace } from "../../src/apps/portfolio/types";
import {
  buildPortfolioActiveFilterChips,
  buildPortfolioExceptionSummaries,
  buildPortfolioFilterOptions,
  buildPortfolioInsights,
  buildPortfolioReadinessIndicators,
  buildPortfolioWorkflowActions,
  filterPositionsByDrilldown,
  filterTransactionsByDrilldown,
  getPositionsNeedingPricing,
  getRelatedTransactionsForSecurity,
  buildInitialPortfolioControls,
  buildPortfolioWorkspaceContext,
  derivePortfolioWorkspace,
  getBookReadinessStatus,
  getBookReadinessSupport,
  getBookReadinessTone,
  getNetFlowTone,
  getReadinessTone,
  getRequestedWindowActivityAmount,
  getRequestedWindowActivityCount,
  getYearToDateActivityAmount,
  getYearToDateActivityCount,
  resolveEffectivePeriod,
  resolveTimeWindowStartDate,
} from "../../src/apps/portfolio/view-model";

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
      open_date: "2024-01-01",
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
        transaction_id: "TX_OLD",
        transaction_date: "2025-10-01T08:30:00Z",
        transaction_type: "BUY",
        security_id: "EQ_OLD",
        instrument_id: "OLD",
        quantity: 10,
      },
      {
        transaction_id: "TX_RECENT",
        transaction_date: "2026-02-20T08:30:00Z",
        transaction_type: "BUY",
        security_id: "EQ_NEW",
        instrument_id: "NEW",
        quantity: 5,
      },
    ],
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
          projection_date: "2026-02-23",
          net_cashflow_base: -15000,
          projected_cumulative_cashflow_base: -15000,
        },
        {
          projection_date: "2026-02-25",
          net_cashflow_base: -5000,
          projected_cumulative_cashflow_base: -20000,
        },
      ],
    },
    performance: null,
    rebalance: null,
    readiness: {
      has_positions: false,
      reporting: {
        status: "READY",
        generated_at_utc: "2026-02-24T08:32:00Z",
        row_count: 14,
      },
    },
    operations: null,
    workflow_cues: [],
    warnings: [],
    partial_failures: [],
  };
}

function buildOperationalWorkspace(): PortfolioWorkspace {
  const workspace = buildWorkspace();
  workspace.positions = [
    {
      security_id: "EQ_1",
      instrument_name: "Apple Inc",
      asset_class: "Equities",
      quantity: 10,
      market_value_base: 1800,
      weight_pct: 0.14,
    },
  ];
  workspace.top_positions = [
    {
      security_id: "EQ_1",
      instrument_name: "Apple Inc",
      asset_class: "Equities",
      quantity: 10,
      market_value_base: 1800,
      weight_pct: 0.14,
    },
  ];
  workspace.allocation_views = [
    {
      dimension: "asset_class",
      buckets: [
        {
          bucket: "Equities",
          position_count: 1,
          market_value_base: 1800,
          weight_pct: 0.14,
        },
      ],
    },
  ];
  workspace.activity_summary = {
    reporting_currency: "USD",
    window_start_date: "2026-01-24",
    window_end_date: "2026-02-24",
    buckets: [
      {
        bucket: "INFLOWS",
        requested_window: {
          reporting_currency_amount: 1000,
          portfolio_currency_amount: 1000,
          transaction_count: 1,
        },
        year_to_date: {
          reporting_currency_amount: 3000,
          portfolio_currency_amount: 3000,
          transaction_count: 3,
        },
      },
      {
        bucket: "FEES",
        requested_window: {
          reporting_currency_amount: -250,
          portfolio_currency_amount: -250,
          transaction_count: 1,
        },
        year_to_date: {
          reporting_currency_amount: -500,
          portfolio_currency_amount: -500,
          transaction_count: 2,
        },
      },
    ],
  };
  workspace.cash_balances = [
    {
      security_id: "CASH_USD",
      instrument_name: "USD Operating Cash",
      quantity: 10000,
      market_value_base: 10000,
      weight_pct: 0.8,
    },
  ];
  workspace.readiness.has_positions = true;
  workspace.operations = {
    publish_allowed: true,
    controls_blocking: false,
    latest_booked_transaction_date: "2026-02-20",
  };
  workspace.workflow_cues = [
    { key: "risk", label: "Risk", href: "/risk" },
    { key: "performance", label: "Performance", href: "/performance" },
  ];
  return workspace;
}

describe("portfolio view model", () => {
  it("resolves time windows against the selected as-of date", () => {
    expect(resolveTimeWindowStartDate("2026-02-24", "7D", "2024-01-01")).toBe("2026-02-17");
    expect(resolveTimeWindowStartDate("2026-02-24", "30D", "2024-01-01")).toBe("2026-01-25");
    expect(resolveTimeWindowStartDate("2026-02-24", "MTD", "2024-01-01")).toBe("2026-02-01");
    expect(resolveTimeWindowStartDate("2026-05-24", "QTD", "2024-01-01")).toBe("2026-04-01");
    expect(resolveTimeWindowStartDate("2026-02-24", "YTD", "2024-01-01")).toBe("2026-01-01");
    expect(resolveTimeWindowStartDate("2026-02-24", "SI", "2024-01-01")).toBe("2024-01-01");
  });

  it("derives an effective custom period in detailed mode", () => {
    expect(
      resolveEffectivePeriod("2026-02-24", "30D", "2024-01-01", "2026-02-01", "2026-02-20")
    ).toEqual({
      startDate: "2026-02-01",
      endDate: "2026-02-20",
      isCustomRange: true,
      label: "Custom",
    });
  });

  it("filters transactions and forecast points to the selected context", () => {
    const workspace = buildWorkspace();
    const controls = {
      ...buildInitialPortfolioControls(workspace),
      timeWindow: "30D" as const,
      asOfDate: "2026-02-24",
    };

    const derived = derivePortfolioWorkspace(workspace, controls);

    expect(derived?.recent_transactions).toHaveLength(1);
    expect(derived?.recent_transactions[0].transaction_id).toBe("TX_RECENT");
    expect(derived?.cashflow_outlook?.upcoming_points).toHaveLength(1);
    expect(derived?.cashflow_outlook?.upcoming_points[0].projection_date).toBe("2026-02-25");
  });

  it("builds filter options and applies business filters to positions and transactions", () => {
    const workspace = buildOperationalWorkspace();
    workspace.positions = [
      {
        security_id: "EQ_1",
        instrument_name: "Apple Inc",
        asset_class: "Equities",
        sector: "Technology",
        country_of_risk: "United States",
        quantity: 10,
        market_value_base: 1800,
        weight_pct: 0.14,
      },
      {
        security_id: "FI_1",
        instrument_name: "Gov Bond",
        asset_class: "Fixed Income",
        sector: "Government",
        country_of_risk: "United States",
        quantity: 4,
        market_value_base: 0,
        weight_pct: 0,
      },
    ];
    workspace.top_positions = [
      {
        security_id: "EQ_1",
        instrument_name: "Apple Inc",
        asset_class: "Equities",
        quantity: 10,
        market_value_base: 1800,
        weight_pct: 0.14,
      },
      {
        security_id: "FI_1",
        instrument_name: "Gov Bond",
        asset_class: "Fixed Income",
        quantity: 4,
        market_value_base: 0,
        weight_pct: 0,
      },
    ];
    workspace.recent_transactions = [
      {
        transaction_id: "TX_BUY",
        transaction_date: "2026-02-20T08:30:00Z",
        transaction_type: "BUY",
        security_id: "EQ_1",
        instrument_id: "AAPL",
        quantity: 10,
        net_cost_base: 1800,
      },
      {
        transaction_id: "TX_DIV",
        transaction_date: "2026-02-21T08:30:00Z",
        transaction_type: "DIVIDEND",
        security_id: "EQ_1",
        instrument_id: "AAPL",
        quantity: 0,
        gross_amount: 0,
      },
    ];

    expect(buildPortfolioFilterOptions(workspace)).toEqual({
      assetClasses: ["Equities", "Fixed Income"],
      sectors: ["Government", "Technology"],
      regions: ["United States"],
      positionStatuses: ["ALL", "Active", "Unpriced", "Needs Attention"],
      transactionTypes: ["BUY", "DIVIDEND"],
    });

    const derived = derivePortfolioWorkspace(workspace, {
      ...buildInitialPortfolioControls(workspace),
      assetClass: "Equities",
      positionStatus: "Active",
      transactionType: "BUY",
      showOnlyNonZeroRows: true,
    });

    expect(derived?.positions).toHaveLength(1);
    expect(derived?.positions[0].instrument_name).toBe("Apple Inc");
    expect(derived?.recent_transactions).toHaveLength(1);
    expect(derived?.recent_transactions[0].transaction_id).toBe("TX_BUY");
  });

  it("supports shared holdings and transaction drill-down filters", () => {
    const workspace = buildOperationalWorkspace();
    workspace.positions = [
      {
        security_id: "EQ_1",
        instrument_name: "Apple Inc",
        asset_class: "Equities",
        sector: "Technology",
        country_of_risk: "United States",
        quantity: 10,
        market_price: 180,
        market_value_base: 1800,
        weight_pct: 0.14,
      },
      {
        security_id: "FI_1",
        instrument_name: "Gov Bond",
        asset_class: "Fixed Income",
        sector: "Government",
        country_of_risk: "United States",
        quantity: 4,
        market_price: null,
        market_value_base: null,
        weight_pct: 0,
      },
    ];
    workspace.recent_transactions = [
      {
        transaction_id: "TX_FUND",
        transaction_date: "2026-02-19T08:30:00Z",
        transaction_type: "SUBSCRIPTION",
        component_type: "CASH",
        security_id: "CASH_USD",
        instrument_id: "USD",
        quantity: 1,
        net_cost_base: 100000,
      },
      {
        transaction_id: "TX_BUY",
        transaction_date: "2026-02-20T08:30:00Z",
        transaction_type: "BUY",
        component_type: "TRADE",
        security_id: "EQ_1",
        instrument_id: "AAPL",
        quantity: 10,
        net_cost_base: -1800,
      },
    ];

    expect(
      filterPositionsByDrilldown(workspace.positions, {
        kind: "allocation",
        selection: { dimension: "sector", bucket: "Technology" },
        label: "Filtered by Sector: Technology",
      })
    ).toHaveLength(1);
    expect(
      filterPositionsByDrilldown(workspace.positions, {
        kind: "status",
        status: "Unpriced",
        label: "Filtered by pricing exception: Unpriced holdings",
      })[0].instrument_name
    ).toBe("Gov Bond");
    expect(
      filterTransactionsByDrilldown(workspace.recent_transactions, {
        kind: "activity",
        bucket: "INFLOWS",
        label: "Filtered by activity: Inflows",
      })
    ).toHaveLength(1);
    expect(
      filterTransactionsByDrilldown(workspace.recent_transactions, {
        kind: "security",
        security_id: "EQ_1",
        label: "Filtered by security: Apple Inc",
      })[0].transaction_id
    ).toBe("TX_BUY");
    expect(getRelatedTransactionsForSecurity(workspace, "EQ_1")).toHaveLength(1);
    expect(getPositionsNeedingPricing(workspace)[0].security_id).toBe("FI_1");
  });

  it("builds a clamped context for unsupported historical snapshots", () => {
    const workspace = buildWorkspace();
    const context = buildPortfolioWorkspaceContext(workspace, {
      ...buildInitialPortfolioControls(workspace),
      asOfDate: "2027-01-01",
    });

    expect(context.selectedAsOfDate).toBe("2026-02-24");
    expect(context.hasHistoricalGap).toBe(false);
    expect(context.currencyOptions).toEqual(["USD"]);
    expect(context.periodLabel).toBe("30D");
    expect(context.effectivePeriodStartDate).toBe("2026-01-25");
    expect(context.effectivePeriodEndDate).toBe("2026-02-24");
    expect(context.supportsHistoricalSnapshots).toBe(false);
    expect(context.supportsReportingCurrencyRestatement).toBe(false);
  });

  it("derives portfolio readiness, activity, and workflow models", () => {
    const workspace = buildOperationalWorkspace();

    expect(getRequestedWindowActivityAmount(workspace)).toBe(750);
    expect(getYearToDateActivityAmount(workspace)).toBe(2500);
    expect(getRequestedWindowActivityCount(workspace)).toBe(2);
    expect(getYearToDateActivityCount(workspace)).toBe(5);
    expect(getNetFlowTone(workspace)).toBe("success");
    expect(getBookReadinessStatus(workspace)).toBe("Ready");
    expect(getBookReadinessSupport(workspace)).toBe("Reportable and publishable");
    expect(getBookReadinessTone(workspace)).toBe("success");

    expect(buildPortfolioReadinessIndicators(workspace, "summary")).toEqual([
      { key: "holdings", label: "Holdings", status: "Ready", href: "#portfolio-insights" },
      { key: "pricing", label: "Pricing", status: "Ready", href: "#portfolio-attention" },
      { key: "transactions", label: "Transactions", status: "Ready", href: "#portfolio-insights" },
      { key: "reporting", label: "Reporting", status: "Ready", href: "#portfolio-health" },
    ]);

    expect(buildPortfolioWorkflowActions(workspace)).toEqual([
      {
        sequence: 1,
        title: "Review performance",
        impact:
          "Review portfolio return, benchmark context, and contribution once the book is valued.",
        target: "Target: Performance workflow for this portfolio",
        href: "/performance",
        cta_label: "Performance",
        recommended: true,
      },
      {
        sequence: 2,
        title: "Review suitability",
        impact:
          "Validate suitability, exposure, and mandate fit before the next client action.",
        target: "Target: Risk workflow for this portfolio",
        href: "/risk",
        cta_label: "Risk",
        recommended: false,
      },
    ]);

    expect(buildPortfolioExceptionSummaries(workspace)).toEqual([]);
    expect(buildPortfolioInsights(workspace)).toEqual([]);
  });

  it("derives the empty-portfolio onboarding sequence", () => {
    const workspace = buildWorkspace();
    workspace.recent_transactions = [];
    workspace.summary.position_count = 0;
    workspace.readiness.reporting.status = "EMPTY";
    workspace.readiness.reporting.row_count = 0;

    expect(buildPortfolioWorkflowActions(workspace).map((action) => action.title)).toEqual([
      "Fund portfolio",
      "Book first trade",
      "Publish pricing",
      "Review holdings",
      "Open performance",
    ]);
    expect(buildPortfolioReadinessIndicators(workspace, "summary").map((indicator) => indicator.status)).toEqual([
      "Missing",
      "Missing",
      "Missing",
      "Empty",
    ]);
    expect(buildPortfolioExceptionSummaries(workspace).map((exception) => exception.title)).toEqual([
      "Missing holdings",
      "No priced positions",
      "Empty transaction history",
      "Reporting output unavailable",
    ]);
    expect(buildPortfolioInsights(workspace).map((insight) => insight.title)).toEqual([
      "No holdings booked",
      "No cash funding recorded",
      "Pricing not yet published",
      "Reporting cannot be generated yet",
    ]);
    expect(getReadinessTone("Missing")).toBe("danger");
    expect(getReadinessTone("Empty")).toBe("warn");
  });

  it("builds active filter chips for removable business filters", () => {
    const workspace = buildOperationalWorkspace();

    expect(
      buildPortfolioActiveFilterChips({
        ...buildInitialPortfolioControls(workspace),
        includeCash: false,
        assetClass: "Equities",
        transactionType: "BUY",
        customStartDate: "2026-02-01",
        customEndDate: "2026-02-20",
        timeWindow: "YTD",
        showOnlyExceptions: true,
      })
    ).toEqual([
      { key: "includeCash", label: "Include Cash", value: "No" },
      { key: "assetClass", label: "Asset Class", value: "Equities" },
      { key: "transactionType", label: "Transaction Type", value: "BUY" },
      { key: "showOnlyExceptions", label: "Focus", value: "Exceptions only" },
      { key: "timeWindow", label: "Period", value: "2026-02-01 to 2026-02-20" },
    ]);
  });
});
