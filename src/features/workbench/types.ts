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

export type PerformanceComparativeSummary = {
  metric_basis: string;
  portfolio_return_pct: number | null;
  benchmark_return_pct: number | null;
  active_return_pct: number | null;
  annualized_return_pct: number | null;
  benchmark_id: string | null;
  benchmark_return_source: string | null;
  begin_market_value?: number | null;
  end_market_value?: number | null;
  net_cash_flow?: number | null;
};

export type PerformanceChartPoint = {
  label: string;
  frequency: string;
  period_start: string | null;
  period_end: string | null;
  portfolio_return_pct: number | null;
  benchmark_return_pct: number | null;
  active_return_pct: number | null;
  cumulative_portfolio_return_pct: number | null;
  cumulative_benchmark_return_pct: number | null;
  cumulative_active_return_pct: number | null;
};

export type MoneyWeightedReturnSummary = {
  money_weighted_return_pct: number | null;
  annualized_return_pct: number | null;
  method: string | null;
  start_date: string | null;
  end_date: string | null;
  notes: string[];
};

export type ContributionRowView = {
  key_label: string;
  contribution_pct: number;
  weight_avg_pct: number | null;
  total_return_pct?: number | null;
  local_contribution_pct: number | null;
  fx_contribution_pct: number | null;
  is_other: boolean;
};

export type ContributionPositionView = {
  position_id: string;
  contribution_pct: number;
  weight_avg_pct: number | null;
  total_return_pct: number | null;
  local_contribution_pct: number | null;
  fx_contribution_pct: number | null;
};

export type ContributionLevelView = {
  level: number;
  name: string;
  rows: ContributionRowView[];
  total_contribution_pct: number | null;
  total_weight_avg_pct?: number | null;
  total_portfolio_return_pct?: number | null;
};

export type ContributionSummaryView = {
  metric_basis: string;
  weighting_scheme: string | null;
  portfolio_contribution_pct: number | null;
  total_portfolio_return_pct: number | null;
  coverage_mv_pct: number | null;
  portfolio_local_contribution_pct: number | null;
  portfolio_fx_contribution_pct: number | null;
  position_rows: ContributionPositionView[];
  levels: ContributionLevelView[];
};

export type AttributionRowView = {
  key_label: string;
  portfolio_weight_avg_pct?: number | null;
  benchmark_weight_avg_pct?: number | null;
  portfolio_return_pct?: number | null;
  benchmark_return_pct?: number | null;
  allocation_pct: number;
  selection_pct: number;
  interaction_pct: number;
  total_effect_pct: number;
};

export type AttributionLevelView = {
  dimension: string;
  allocation_total_pct?: number | null;
  selection_total_pct?: number | null;
  interaction_total_pct?: number | null;
  total_effect_pct: number;
  rows: AttributionRowView[];
};

export type PerformanceBenchmarkOptionView = {
  benchmark_code: string;
  benchmark_name: string;
  benchmark_currency?: string | null;
  benchmark_type?: string | null;
  benchmark_family?: string | null;
  benchmark_provider?: string | null;
  is_assigned: boolean;
};

export type PerformanceModuleCapability = {
  state: "supported" | "partial" | "unavailable" | "hidden";
  reason?: string | null;
  coverage_level?: string | null;
  fallback_available?: boolean | null;
  earliest_available_date?: string | null;
  latest_available_date?: string | null;
  supported_dimensions?: string[] | null;
  supported_frequencies?: string[] | null;
};

export type WorkbenchPerformanceCapabilities = {
  summary_kpis: PerformanceModuleCapability;
  return_path: PerformanceModuleCapability;
  benchmark_comparison: PerformanceModuleCapability;
  multi_horizon_returns: PerformanceModuleCapability;
  contribution_ranking: PerformanceModuleCapability;
  attribution_detail: PerformanceModuleCapability;
  contribution_detail: PerformanceModuleCapability;
  evidence: PerformanceModuleCapability;
};

export type PerformanceHorizonComparisonRow = {
  period: string;
  period_start?: string | null;
  period_end?: string | null;
  begin_market_value?: number | null;
  end_market_value?: number | null;
  net_cash_flow?: number | null;
  fees?: number | null;
  net_return_pct?: number | null;
  gross_return_pct?: number | null;
  portfolio_return_pct: number | null;
  benchmark_return_pct: number | null;
  active_return_pct: number | null;
  cumulative_net_return_pct?: number | null;
  cumulative_gross_return_pct?: number | null;
  cumulative_benchmark_return_pct?: number | null;
  cumulative_active_return_pct?: number | null;
  annualized_net_return_pct?: number | null;
  annualized_gross_return_pct?: number | null;
  annualized_return_pct: number | null;
};

export type WorkbenchPerformanceHorizonComparison = {
  correlation_id: string;
  contract_version: string;
  portfolio_id: string;
  as_of_date: string;
  reporting_currency?: string | null;
  detail_basis: string;
  chart_frequency: string;
  requested_chart_frequency_supported?: boolean;
  benchmark_code: string | null;
  benchmark_options: PerformanceBenchmarkOptionView[];
  rows: PerformanceHorizonComparisonRow[];
  warnings: string[];
  partial_failures: WorkbenchOverview["partial_failures"];
};

export type PerformanceAttributionTrendRow = {
  period_label: string;
  period_start: string;
  period_end: string;
  frequency: string;
  allocation_pct: number | null;
  selection_pct: number | null;
  interaction_pct: number | null;
  total_effect_pct: number | null;
  cumulative_total_effect_pct: number | null;
  active_return_pct: number | null;
  residual_pct: number | null;
};

export type WorkbenchPerformanceAttributionTrend = {
  correlation_id: string;
  contract_version: string;
  portfolio_id: string;
  as_of_date: string;
  period: string;
  report_start_date: string;
  report_end_date: string;
  chart_frequency: string;
  detail_basis: string;
  attribution_dimension: string;
  requested_chart_frequency_supported?: boolean;
  requested_attribution_dimension_supported?: boolean;
  benchmark_code: string | null;
  rows: PerformanceAttributionTrendRow[];
  warnings: string[];
  partial_failures: WorkbenchOverview["partial_failures"];
};

export type AttributionSummaryView = {
  metric_basis: string;
  model: string | null;
  linking: string | null;
  benchmark_id: string | null;
  benchmark_return_source: string | null;
  active_return_pct: number | null;
  sum_of_effects_pct: number | null;
  residual_pct: number | null;
  levels: AttributionLevelView[];
};

export type WorkbenchPerformanceWorkspace = {
  correlation_id: string;
  contract_version: string;
  portfolio_id: string;
  as_of_date: string;
  period: string;
  report_start_date: string;
  report_end_date: string;
  chart_frequency: string;
  contribution_dimension: string;
  attribution_dimension: string;
  detail_basis: string;
  requested_chart_frequency_supported?: boolean;
  requested_contribution_dimension_supported?: boolean;
  requested_attribution_dimension_supported?: boolean;
  segment?: string;
  benchmark_code: string | null;
  benchmark_options?: PerformanceBenchmarkOptionView[];
  capabilities?: WorkbenchPerformanceCapabilities;
  portfolio: WorkbenchOverview["portfolio"];
  overview: WorkbenchOverview["overview"];
  net_performance: PerformanceComparativeSummary;
  gross_performance: PerformanceComparativeSummary;
  money_weighted_return: MoneyWeightedReturnSummary | null;
  net_chart: PerformanceChartPoint[];
  gross_chart: PerformanceChartPoint[];
  contribution: ContributionSummaryView | null;
  attribution: AttributionSummaryView | null;
  warnings: string[];
  partial_failures: WorkbenchOverview["partial_failures"];
};

export type WorkbenchPerformanceWorkspaceSummary = Pick<
  WorkbenchPerformanceWorkspace,
  | "correlation_id"
  | "contract_version"
  | "portfolio_id"
  | "as_of_date"
  | "period"
  | "report_start_date"
  | "report_end_date"
  | "chart_frequency"
  | "detail_basis"
  | "requested_chart_frequency_supported"
  | "requested_contribution_dimension_supported"
  | "requested_attribution_dimension_supported"
  | "benchmark_code"
  | "benchmark_options"
  | "capabilities"
  | "portfolio"
  | "overview"
  | "net_performance"
  | "gross_performance"
  | "money_weighted_return"
  | "warnings"
  | "partial_failures"
>;

export type WorkbenchPerformanceWorkspaceDetails = Pick<
  WorkbenchPerformanceWorkspace,
  | "correlation_id"
  | "contract_version"
  | "portfolio_id"
  | "as_of_date"
  | "period"
  | "report_start_date"
  | "report_end_date"
  | "chart_frequency"
  | "contribution_dimension"
  | "attribution_dimension"
  | "detail_basis"
  | "requested_chart_frequency_supported"
  | "requested_contribution_dimension_supported"
  | "requested_attribution_dimension_supported"
  | "segment"
  | "benchmark_code"
  | "capabilities"
  | "net_chart"
  | "gross_chart"
  | "contribution"
  | "attribution"
  | "warnings"
  | "partial_failures"
>;

export type WorkbenchReportingSnapshot = {
  correlationId: string;
  contractVersion: string;
  sourceService: string;
  portfolioId: string;
  asOfDate: string;
  generatedAt: string;
  rows: Array<Record<string, unknown>>;
};
