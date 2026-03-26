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

export type PortfolioWorkflowCue = {
  key: string;
  label: string;
  href: string;
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
  summary: {
    market_value_base: number;
    total_cash_base: number;
    cash_weight_pct: number;
    position_count: number;
  };
  allocations: PortfolioAllocationBucket[];
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
