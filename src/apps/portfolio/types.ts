export type PortfolioCatalogItem = {
  portfolio_id: string;
  display_name: string;
  base_currency: string;
  client_id: string | null;
  booking_center_code: string | null;
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
  cost_basis_base?: number | null;
  market_value_base: number | null;
  weight_pct: number | null;
  reprocessing_status?: string | null;
};

export type PortfolioTransactionView = {
  transaction_id: string;
  transaction_date: string;
  transaction_type: string;
  security_id: string;
  instrument_id: string;
  quantity: number;
  price?: number | null;
  gross_amount?: number | null;
  currency?: string | null;
  net_cost_base?: number | null;
  realized_gain_loss_base?: number | null;
  settlement_status?: string | null;
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
    total_cash_base: number;
    cash_weight_pct: number;
    position_count: number;
  };
  allocations: PortfolioAllocationBucket[];
  top_positions: PortfolioTopPosition[];
  positions: PortfolioPositionView[];
  recent_transactions: PortfolioTransactionView[];
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
  workflow_cues: PortfolioWorkflowCue[];
  warnings: string[];
  partial_failures: Array<{
    source_service: string;
    error_code: string;
    detail: string;
  }>;
};
