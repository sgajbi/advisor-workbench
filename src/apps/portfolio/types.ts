export type PortfolioCatalogItem = {
  portfolio_id: string;
  display_name: string;
  base_currency: string;
  client_id: string | null;
  booking_center_code: string | null;
  portfolio_type?: string | null;
  status?: string | null;
};

export type PortfolioCatalogResponse = {
  items: PortfolioCatalogItem[];
};

export type PortfolioAllocationBucket = {
  asset_class: string;
  position_count: number;
  market_value_base: number | null;
  weight_pct: number | null;
};

export type PortfolioAllocationView = {
  dimension: string;
  buckets: Array<{
    bucket: string;
    position_count: number;
    market_value_base: number | null;
    weight_pct: number | null;
  }>;
};

export type PortfolioAllocationSelection = {
  dimension: string;
  bucket: string;
};

export type PortfolioTransactionDrilldownFilter =
  | {
      kind: "activity";
      bucket: string;
      label: string;
    }
  | {
      kind: "security";
      security_id: string;
      label: string;
    };

export type PortfolioHoldingsDrilldownFilter =
  | {
      kind: "allocation";
      selection: PortfolioAllocationSelection;
      label: string;
    }
  | {
      kind: "security";
      security_id: string;
      label: string;
    }
  | {
      kind: "status";
      status: "Unpriced";
      label: string;
    };

export type PortfolioTopPosition = {
  security_id: string;
  instrument_name: string;
  asset_class: string | null;
  quantity: number;
  market_value_base: number | null;
  weight_pct: number | null;
};

export type PortfolioWorkflowCue = {
  key: string;
  label: string;
  href: string;
};

export type PortfolioReadinessStatus = "Missing" | "Partial" | "Ready" | "Empty";

export type PortfolioReadinessIndicator = {
  key: "holdings" | "pricing" | "transactions" | "reporting";
  label: string;
  status: PortfolioReadinessStatus;
  href: string;
};

export type PortfolioExceptionSummary = {
  key: string;
  title: string;
  detail: string;
  tone: "neutral" | "success" | "warn" | "danger";
  href: string;
};

export type PortfolioInsight = {
  key: string;
  title: string;
  detail: string;
  severity: "info" | "warning" | "critical";
  href: string;
};

export type PortfolioWorkflowAction = {
  sequence: number;
  title: string;
  impact: string;
  target: string;
  href: string;
  cta_label: string;
  recommended: boolean;
};

export type PortfolioPositionView = {
  security_id: string;
  instrument_name: string;
  asset_class: string | null;
  isin?: string | null;
  currency?: string | null;
  sector?: string | null;
  country_of_risk?: string | null;
  held_since_date?: string | null;
  quantity: number;
  market_price?: number | null;
  cost_basis_base?: number | null;
  cost_basis_local?: number | null;
  market_value_base: number | null;
  market_value_local?: number | null;
  unrealized_gain_loss_base?: number | null;
  unrealized_gain_loss_local?: number | null;
  weight_pct: number | null;
  reprocessing_status?: string | null;
};

export type PortfolioCashBalance = {
  security_id: string;
  instrument_name: string;
  currency?: string | null;
  quantity: number;
  market_value_base?: number | null;
  weight_pct?: number | null;
};

export type PortfolioTransactionView = {
  transaction_id: string;
  transaction_date: string;
  transaction_type: string;
  component_type?: string | null;
  security_id: string;
  instrument_id: string;
  quantity: number;
  price?: number | null;
  gross_amount?: number | null;
  currency?: string | null;
  net_cost_base?: number | null;
  realized_gain_loss_base?: number | null;
  settlement_status?: string | null;
  source_system?: string | null;
  cash_entry_mode?: string | null;
  economic_event_id?: string | null;
  linked_transaction_group_id?: string | null;
};

export type PortfolioIncomePeriodSummary = {
  gross: {
    portfolio_currency_amount?: number | null;
    reporting_currency_amount: number;
    transaction_count: number;
  };
  withholding_tax: {
    portfolio_currency_amount?: number | null;
    reporting_currency_amount: number;
    transaction_count: number;
  };
  other_deductions: {
    portfolio_currency_amount?: number | null;
    reporting_currency_amount: number;
    transaction_count: number;
  };
  net: {
    portfolio_currency_amount?: number | null;
    reporting_currency_amount: number;
    transaction_count: number;
  };
};

export type PortfolioIncomeSummaryView = {
  reporting_currency: string;
  window_start_date: string;
  window_end_date: string;
  totals_requested_window: PortfolioIncomePeriodSummary;
  totals_year_to_date: PortfolioIncomePeriodSummary;
  income_types: Array<{
    income_type: string;
    requested_window: PortfolioIncomePeriodSummary;
    year_to_date: PortfolioIncomePeriodSummary;
  }>;
};

export type PortfolioActivitySummaryView = {
  reporting_currency: string;
  window_start_date: string;
  window_end_date: string;
  buckets: Array<{
    bucket: string;
    requested_window: {
      portfolio_currency_amount?: number | null;
      reporting_currency_amount: number;
      transaction_count: number;
    };
    year_to_date: {
      portfolio_currency_amount?: number | null;
      reporting_currency_amount: number;
      transaction_count: number;
    };
  }>;
};

export type PortfolioWorkspace = {
  as_of_date: string;
  portfolio: {
    portfolio_id: string;
    display_name: string;
    client_id: string | null;
    base_currency: string;
    booking_center_code: string | null;
  };
  profile: {
    status: string | null;
    portfolio_type: string | null;
    risk_exposure: string | null;
    investment_time_horizon: string | null;
    objective: string | null;
    is_leverage_allowed: boolean | null;
    advisor_id?: string | null;
    open_date?: string | null;
    close_date?: string | null;
  };
  summary: {
    market_value_base: number;
    invested_market_value_base?: number;
    total_cash_base: number;
    cash_weight_pct: number;
    position_count: number;
    cash_balance_count?: number;
  };
  allocations: PortfolioAllocationBucket[];
  allocation_views?: PortfolioAllocationView[];
  cash_balances?: PortfolioCashBalance[];
  top_positions: PortfolioTopPosition[];
  positions: PortfolioPositionView[];
  recent_transactions: PortfolioTransactionView[];
  income_summary?: PortfolioIncomeSummaryView | null;
  activity_summary?: PortfolioActivitySummaryView | null;
  cashflow_outlook: {
    as_of_date: string;
    range_end_date: string;
    total_net_cashflow_base: number;
    projection_days: number;
    include_projected: boolean;
    notes?: string | null;
    upcoming_points: Array<{
      projection_date: string;
      net_cashflow_base: number;
      projected_cumulative_cashflow_base: number;
    }>;
  } | null;
  performance: {
    period: string;
    return_pct: number | null;
    benchmark_return_pct?: number | null;
    excess_return_pct?: number | null;
    sparkline_points?: Array<{
      label: string;
      return_pct: number | null;
    }> | null;
  } | null;
  rebalance: {
    status: string;
    last_run_at_utc: string | null;
    last_rebalance_run_id: string | null;
  } | null;
  readiness: {
    has_positions: boolean;
    reporting: {
      status: string;
      generated_at_utc: string | null;
      row_count: number;
    };
  };
  readiness_indicators?: PortfolioReadinessIndicator[];
  exception_summaries?: PortfolioExceptionSummary[];
  insights?: PortfolioInsight[];
  operations?: {
    business_date?: string | null;
    latest_booked_transaction_date?: string | null;
    latest_booked_position_snapshot_date?: string | null;
    publish_allowed?: boolean | null;
    controls_blocking?: boolean | null;
    active_reprocessing_keys?: number | null;
    stale_reprocessing_keys?: number | null;
    failed_valuation_jobs_within_window?: number | null;
    failed_aggregation_jobs_within_window?: number | null;
  } | null;
  workflow_cues: PortfolioWorkflowCue[];
  workflow_actions?: PortfolioWorkflowAction[];
  warnings: string[];
  partial_failures: Array<{
    source_service: string;
    error_code: string;
    detail: string;
  }>;
};
