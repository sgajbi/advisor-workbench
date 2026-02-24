export type WorkbenchOverview = {
  correlation_id: string;
  contract_version: string;
  as_of_date: string;
  portfolio: {
    portfolio_id: string;
    client_id: string | null;
    base_currency: string;
    booking_center_code: string | null;
  };
  overview: {
    market_value_base: number;
    cash_weight_pct: number;
    position_count: number;
  };
  performance_snapshot: {
    period: string;
    return_pct: number | null;
    benchmark_return_pct: number | null;
  } | null;
  rebalance_snapshot: {
    status: string;
    last_rebalance_run_id: string | null;
    last_run_at_utc: string | null;
  } | null;
  warnings: string[];
  partial_failures: Array<{
    source_service: string;
    error_code: string;
    detail: string;
  }>;
};

export type WorkbenchPositionView = {
  security_id: string;
  instrument_name: string;
  asset_class: string | null;
  quantity: number;
  market_value_base: number | null;
  weight_pct: number | null;
};

export type WorkbenchProjectedPositionView = {
  security_id: string;
  instrument_name: string;
  asset_class: string | null;
  baseline_quantity: number;
  proposed_quantity: number;
  delta_quantity: number;
};

export type WorkbenchProjectedSummary = {
  total_baseline_positions: number;
  total_proposed_positions: number;
  net_delta_quantity: number;
};

export type WorkbenchPolicyFeedback = {
  status: string;
  detail?: string | null;
  raw?: Record<string, unknown> | null;
};

export type WorkbenchPortfolio360 = {
  correlation_id: string;
  contract_version: string;
  as_of_date: string;
  portfolio: WorkbenchOverview["portfolio"];
  overview: WorkbenchOverview["overview"];
  performance_snapshot: WorkbenchOverview["performance_snapshot"] | null;
  rebalance_snapshot: WorkbenchOverview["rebalance_snapshot"] | null;
  current_positions: WorkbenchPositionView[];
  projected_positions: WorkbenchProjectedPositionView[];
  projected_summary: WorkbenchProjectedSummary | null;
  active_session_id: string | null;
  warnings: string[];
  partial_failures: WorkbenchOverview["partial_failures"];
};

export type WorkbenchSandboxState = {
  correlation_id: string;
  contract_version: string;
  portfolio_id: string;
  session_id: string;
  session_version: number;
  projected_positions: WorkbenchProjectedPositionView[];
  projected_summary: WorkbenchProjectedSummary;
  policy_feedback: WorkbenchPolicyFeedback | null;
  warnings: string[];
  partial_failures: WorkbenchOverview["partial_failures"];
};

export type WorkbenchAnalyticsBucket = {
  bucket_key: string;
  bucket_label: string;
  current_quantity: number;
  proposed_quantity: number;
  delta_quantity: number;
  current_weight_pct: number;
  proposed_weight_pct: number;
};

export type WorkbenchAnalyticsTopChange = {
  security_id: string;
  instrument_name: string;
  delta_quantity: number;
  direction: string;
};

export type WorkbenchAnalyticsRiskProxy = {
  hhi_current: number;
  hhi_proposed: number;
  hhi_delta: number;
};

export type WorkbenchAnalytics = {
  correlation_id: string;
  contract_version: string;
  portfolio_id: string;
  session_id: string | null;
  period: string;
  group_by: string;
  benchmark_code: string;
  portfolio_return_pct: number | null;
  benchmark_return_pct: number | null;
  active_return_pct: number | null;
  allocation_buckets: WorkbenchAnalyticsBucket[];
  top_changes: WorkbenchAnalyticsTopChange[];
  risk_proxy: WorkbenchAnalyticsRiskProxy;
  warnings: string[];
  partial_failures: WorkbenchOverview["partial_failures"];
};

export type WorkbenchReportingSnapshot = {
  correlationId: string;
  contractVersion: string;
  sourceService: string;
  portfolioId: string;
  asOfDate: string;
  generatedAt: string;
  rows: Array<Record<string, unknown>>;
};
