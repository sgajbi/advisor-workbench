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
  benchmark_input_mode?: string | null;
  begin_market_value?: number | null;
  end_market_value?: number | null;
  beginning_cash_flow?: number | null;
  ending_cash_flow?: number | null;
  flow_adjusted_end_market_value?: number | null;
  net_cash_flow?: number | null;
  fees?: number | null;
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
  input_mode?: string | null;
  method: string | null;
  start_date: string | null;
  end_date: string | null;
  begin_market_value?: number | null;
  end_market_value?: number | null;
  beginning_cash_flow?: number | null;
  ending_cash_flow?: number | null;
  flow_adjusted_end_market_value?: number | null;
  net_cash_flow?: number | null;
  fees?: number | null;
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
  beginning_cash_flow?: number | null;
  ending_cash_flow?: number | null;
  flow_adjusted_end_market_value?: number | null;
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
  period: string;
  report_start_date: string;
  report_end_date: string;
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

export type WorkbenchAdvisorBriefStatus = "ready" | "partial" | "unavailable";

export type WorkbenchAdvisorBriefEvidenceRef = {
  metric_label: string;
  metric_value: string;
  source_surface: string;
  target_mode: string;
  route: string;
};

export type WorkbenchAdvisorBriefNarrativeItem = {
  headline: string;
  detail: string;
  tone: "positive" | "neutral" | "warning";
  evidence_refs: WorkbenchAdvisorBriefEvidenceRef[];
};

export type WorkbenchAdvisorBriefActionItem = {
  label: string;
  target_mode: string;
  route: string;
};

export type WorkbenchAdvisorBriefSourceMetric = {
  label: string;
  value: string;
  support_label: string;
  target_mode: string;
  route: string;
  state?: string;
};

export type WorkbenchAdvisorBriefSupportabilityItem = {
  label: string;
  value: string;
  tone?: string;
  reason?: string | null;
};

export type WorkbenchPerformanceAdvisorBrief = {
  correlation_id: string;
  contract_version: string;
  portfolio_id: string;
  portfolio: WorkbenchOverview["portfolio"];
  as_of_date: string;
  period: string;
  report_start_date: string;
  report_end_date: string;
  detail_basis: string;
  chart_frequency: string;
  contribution_dimension: string;
  attribution_dimension: string;
  benchmark_code: string | null;
  status: WorkbenchAdvisorBriefStatus;
  summary: string;
  talking_points: WorkbenchAdvisorBriefNarrativeItem[];
  recommended_actions: WorkbenchAdvisorBriefActionItem[];
  risks_and_exceptions: WorkbenchAdvisorBriefNarrativeItem[];
  source_metrics: WorkbenchAdvisorBriefSourceMetric[];
  supportability: WorkbenchAdvisorBriefSupportabilityItem[];
  ai_audit: {
    task_id?: string;
    output_label?: string;
    prompt_version?: string;
    provider_mode?: string;
    provider_id?: string | null;
    adapter_kind?: string | null;
    model_id?: string | null;
    generated_at?: string;
    stubbed?: boolean;
    source_refs?: string[];
  };
  ai_evidence: {
    source_refs?: string[];
  };
  warnings: string[];
  partial_failures: WorkbenchOverview["partial_failures"];
};

export type WorkbenchRiskModuleState = "ready" | "partial" | "unavailable" | "blocked";
export type WorkbenchRiskSupportabilityState = WorkbenchRiskModuleState;

export type WorkbenchRiskSupportabilityItem = {
  key: string;
  label: string;
  state: WorkbenchRiskSupportabilityState;
  reason?: string | null;
  source_service?: string | null;
};

export type WorkbenchRiskMetric = {
  key: string;
  label: string;
  value: number | null;
  state: WorkbenchRiskModuleState;
  reason?: string | null;
  details?: Record<string, unknown> | null;
};

export type WorkbenchRiskSummaryResponse = {
  correlation_id: string;
  contract_version: "risk-workspace.v1";
  portfolio_id: string;
  period: string;
  as_of_date: string;
  benchmark_code?: string | null;
  source_service: "lotus-risk";
  state: WorkbenchRiskModuleState;
  payload: {
    periods: Array<{
      key: string;
      label: string;
      start_date: string;
      end_date: string;
      metrics: WorkbenchRiskMetric[];
    }>;
  } | null;
  supportability: WorkbenchRiskSupportabilityItem[];
  warnings: string[];
  partial_failures: WorkbenchOverview["partial_failures"];
  metadata: {
    generated_at: string;
    input_mode: "stateful";
    methodology_version?: string | null;
    cache_status?: "hit" | "miss" | "bypass" | null;
  };
};

export type WorkbenchRiskConcentrationResponse = {
  correlation_id: string;
  contract_version: "risk-workspace.v1";
  portfolio_id: string;
  period: string;
  as_of_date: string;
  benchmark_code?: string | null;
  source_service: "lotus-risk";
  state: WorkbenchRiskModuleState;
  payload: {
    portfolio_concentration: {
      hhi_current: number;
      hhi_proposed: number;
      hhi_delta: number;
    };
    single_position_concentration: {
      top_position_weight_current: number;
      top_position_weight_proposed: number;
      top_position_weight_delta: number;
      top_n_cumulative_weight_current: number;
      top_n_cumulative_weight_proposed: number;
      top_n_cumulative_weight_delta: number;
      top_n: number;
      top_position_current: {
        security_id?: string | null;
        security_name?: string | null;
        weight: number;
      };
      top_position_proposed: {
        security_id?: string | null;
        security_name?: string | null;
        weight: number;
      };
    };
    issuer_concentration: {
      hhi_current: number;
      hhi_proposed: number;
      hhi_delta: number;
      top_issuer_weight_current: number;
      top_issuer_weight_proposed: number;
      top_issuer_weight_delta: number;
      coverage_status: string;
      covered_position_count_current: number;
      covered_position_count_proposed: number;
      total_position_count_current: number;
      total_position_count_proposed: number;
      uncovered_position_count_current: number;
      uncovered_position_count_proposed: number;
      coverage_ratio_current: number;
      coverage_ratio_proposed: number;
      note?: string | null;
      top_issuer_current: {
        issuer_id?: string | null;
        issuer_name?: string | null;
        weight: number;
      };
      top_issuer_proposed: {
        issuer_id?: string | null;
        issuer_name?: string | null;
        weight: number;
      };
    };
    valuation_context?: {
      portfolio_currency?: string | null;
      reporting_currency?: string | null;
      position_basis?: string | null;
      weight_basis?: string | null;
    } | null;
    execution_context?: {
      as_of_date?: string | null;
      portfolio_id?: string | null;
      simulation_session_id?: string | null;
      simulation_session_version?: number | null;
      session_expires_at?: string | null;
      issuer_grouping_level: string;
      enrichment_policy: string;
      include_cash_positions?: boolean | null;
      include_zero_quantity_positions?: boolean | null;
    };
  } | null;
  supportability: WorkbenchRiskSupportabilityItem[];
  warnings: string[];
  partial_failures: WorkbenchOverview["partial_failures"];
  metadata: {
    generated_at: string;
    input_mode: "stateful";
    methodology_version?: string | null;
    cache_status?: "hit" | "miss" | "bypass" | null;
  };
};

export type WorkbenchRiskDrawdownSummary = {
  max_drawdown: number | null;
  max_drawdown_peak_date?: string | null;
  max_drawdown_trough_date?: string | null;
  max_drawdown_recovery_date?: string | null;
  is_recovered: boolean;
  days_to_trough?: number | null;
  days_to_recovery?: number | null;
  time_under_water_days: number;
  average_drawdown?: number | null;
  ulcer_index?: number | null;
  drawdown_at_risk_95?: number | null;
  conditional_drawdown_at_risk_95?: number | null;
};

export type WorkbenchRiskDrawdownEpisode = {
  episode_id: string;
  peak_date: string;
  trough_date: string;
  recovery_date?: string | null;
  depth: number;
  days_to_trough: number;
  days_to_recovery?: number | null;
  total_days: number;
  is_recovered: boolean;
};

export type WorkbenchRiskRelativeDrawdownSummary = {
  max_drawdown: number | null;
  max_drawdown_peak_date?: string | null;
  max_drawdown_trough_date?: string | null;
};

export type WorkbenchRiskUnderwaterPoint = {
  date: string;
  drawdown: number;
};

export type WorkbenchRiskDrawdownResponse = {
  correlation_id: string;
  contract_version: "risk-workspace.v1";
  portfolio_id: string;
  period: string;
  as_of_date: string;
  benchmark_code?: string | null;
  source_service: "lotus-risk";
  state: WorkbenchRiskModuleState;
  payload: {
    periods: Array<{
      key: string;
      label: string;
      start_date: string;
      end_date: string;
      summary: WorkbenchRiskDrawdownSummary | null;
      episodes: WorkbenchRiskDrawdownEpisode[];
      relative_to_benchmark?: WorkbenchRiskRelativeDrawdownSummary | null;
      underwater_series?: WorkbenchRiskUnderwaterPoint[] | null;
      error?: string | null;
    }>;
  } | null;
  supportability: WorkbenchRiskSupportabilityItem[];
  warnings: string[];
  partial_failures: WorkbenchOverview["partial_failures"];
  metadata: {
    generated_at: string;
    input_mode: "stateful";
    methodology_version?: string | null;
    cache_status?: "hit" | "miss" | "bypass" | null;
  };
};

export type WorkbenchRiskRollingMetricSummary = {
  latest: number | null;
  average: number | null;
  minimum: number | null;
  maximum: number | null;
  p05: number | null;
  p50: number | null;
  p95: number | null;
};

export type WorkbenchRiskRollingMetricSeriesPoint = {
  date: string;
  metric_values: Record<string, number | null>;
};

export type WorkbenchRiskRollingWindowResult = {
  window_length: number;
  metric_summaries: Record<string, WorkbenchRiskRollingMetricSummary>;
  metric_series?: WorkbenchRiskRollingMetricSeriesPoint[] | null;
};

export type WorkbenchRiskRollingResponse = {
  correlation_id: string;
  contract_version: "risk-workspace.v1";
  portfolio_id: string;
  period: string;
  as_of_date: string;
  benchmark_code?: string | null;
  source_service: "lotus-risk";
  state: WorkbenchRiskModuleState;
  payload: {
    periods: Array<{
      key: string;
      label: string;
      start_date: string;
      end_date: string;
      series_count: number;
      window_results: WorkbenchRiskRollingWindowResult[];
      quality_flags: string[];
      error?: string | null;
    }>;
  } | null;
  supportability: WorkbenchRiskSupportabilityItem[];
  warnings: string[];
  partial_failures: WorkbenchOverview["partial_failures"];
  metadata: {
    generated_at: string;
    input_mode: "stateful";
    methodology_version?: string | null;
    cache_status?: "hit" | "miss" | "bypass" | null;
  };
};

export type WorkbenchRiskAttributionTypeOption = {
  key: string;
  label: string;
  state: WorkbenchRiskSupportabilityState;
  reason?: string | null;
};

export type WorkbenchRiskAttributionGroupingOption = {
  key: string;
  label: string;
  state: WorkbenchRiskSupportabilityState;
  reason?: string | null;
  supported_attribution_types: string[];
};

export type WorkbenchRiskAttributionContributor = {
  group_key: string;
  group_label: string;
  weight_average?: number | null;
  marginal_contribution?: number | null;
  component_contribution?: number | null;
  percent_contribution?: number | null;
};

export type WorkbenchRiskAttributionSet = {
  attribution_type: string;
  metric: string;
  grouping_dimension: string;
  total_value?: number | null;
  reconciled_sum?: number | null;
  residual?: number | null;
  contributors: WorkbenchRiskAttributionContributor[];
  quality_flags: string[];
};

export type WorkbenchRiskAttributionPeriodResult = {
  key: string;
  label: string;
  start_date: string;
  end_date: string;
  attribution_sets: WorkbenchRiskAttributionSet[];
  error?: string | null;
};

export type WorkbenchRiskAttributionControls = {
  attribution_types: WorkbenchRiskAttributionTypeOption[];
  grouping_dimensions: WorkbenchRiskAttributionGroupingOption[];
  selected_attribution_type: string;
  selected_grouping_dimension: string;
};

export type WorkbenchRiskAttributionResponse = {
  correlation_id: string;
  contract_version: "risk-workspace.v1";
  portfolio_id: string;
  period: string;
  as_of_date: string;
  benchmark_code?: string | null;
  source_service: "lotus-risk";
  state: WorkbenchRiskModuleState;
  payload: {
    controls: WorkbenchRiskAttributionControls;
    periods: WorkbenchRiskAttributionPeriodResult[];
  } | null;
  supportability: WorkbenchRiskSupportabilityItem[];
  warnings: string[];
  partial_failures: WorkbenchOverview["partial_failures"];
  metadata: {
    generated_at: string;
    input_mode: "stateful";
    methodology_version?: string | null;
    cache_status?: "hit" | "miss" | "bypass" | null;
  };
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
