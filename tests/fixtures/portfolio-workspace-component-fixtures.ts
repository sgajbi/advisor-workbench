import type { PortfolioWorkspace } from "../../src/apps/portfolio/types";
import type { PortfolioWorkspaceContext } from "../../src/apps/portfolio/view-model";

export function buildPortfolioWorkspace(
  overrides: Partial<PortfolioWorkspace> = {}
): PortfolioWorkspace {
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
      total_net_cashflow_base: 4000,
      projection_days: 10,
      include_projected: true,
      upcoming_points: [],
    },
    performance: {
      period: "YTD",
      unavailable: null,
      benchmark_code: "BMK_PB_GLOBAL_BALANCED_60_40",
      benchmark_label: null,
      return_pct: 1.2,
      benchmark_return_pct: 1,
      excess_return_pct: 0.2,
      money_weighted_return_pct: 1.1,
      warnings: [],
    },
    performance_period_returns: [
      { period: "MTD", return_pct: 0.4, benchmark_return_pct: 0.3, excess_return_pct: 0.1 },
      { period: "QTD", return_pct: 0.9, benchmark_return_pct: 0.7, excess_return_pct: 0.2 },
      { period: "YTD", return_pct: 1.2, benchmark_return_pct: 1, excess_return_pct: 0.2 },
    ],
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
    ...overrides,
  };
}

export function buildPortfolioWorkspaceContext(
  overrides: Partial<PortfolioWorkspaceContext> = {}
): PortfolioWorkspaceContext {
  return {
    selectedAsOfDate: "2026-05-12",
    selectedReportingCurrency: "USD",
    timeWindow: "30D",
    periodLabel: "30D",
    viewMode: "summary",
    columnMode: "essential",
    hideEmptyModules: false,
    focusExceptions: false,
    effectivePeriodStartDate: "2026-04-12",
    effectivePeriodEndDate: "2026-05-12",
    usesCustomDateRange: false,
    hasHistoricalGap: false,
    currencyOptions: ["USD"],
    historicalSnapshotState: "supported",
    historicalSnapshotReason: "Historical snapshots are source-backed.",
    supportsHistoricalSnapshots: true,
    reportingCurrencyRestatementState: "supported",
    reportingCurrencyRestatementReason: "Reporting currency restatement is source-backed.",
    supportsReportingCurrencyRestatement: true,
    ...overrides,
  };
}
