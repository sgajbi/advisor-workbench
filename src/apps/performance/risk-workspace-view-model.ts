import type {
  WorkbenchPerformanceWorkspace,
  WorkbenchRiskAttributionResponse,
  WorkbenchRiskConcentrationResponse,
  WorkbenchRiskDrawdownResponse,
  WorkbenchRiskDrawdownSummary,
  WorkbenchRiskMetric,
  WorkbenchRiskModuleState,
  WorkbenchRiskRollingResponse,
  WorkbenchRiskSummaryResponse,
} from "@/features/workbench/types";
import {
  formatDateValue,
  formatNumber,
  formatPercent,
} from "@/design-system/utils/financial-formatters";

export type PerformanceRiskState =
  | "loading"
  | "ready"
  | "partial"
  | "empty"
  | "unavailable"
  | "error";

export type RiskConcentrationPostureState =
  | "acceptable"
  | "moderate"
  | "elevated"
  | "high"
  | "partial";

export type PerformanceRiskConcentrationIndicator = {
  key: string;
  label: string;
  value: string;
  support: string;
  definition: string;
  tone?: "neutral" | "warn" | "danger";
};

export type PerformanceRiskConcentrationExecutiveSummary = {
  heading: string;
  postureLabel: string;
  postureState: RiskConcentrationPostureState;
  businessReadingHeadline: string;
  businessReadingDetail: string;
  actionCue?: string | null;
};

export type PerformanceRiskConcentrationDriverAnalysisRow = {
  key: string;
  eyebrow: string;
  summary: string;
  supportingMetricLabel: string;
  supportingMetricValue: string;
};

export type PerformanceRiskConcentrationScale = {
  key: string;
  label: string;
  value: string;
  interpretationBand: string;
  interpretation: string;
  markerPct: number;
  definition: string;
};

export type PerformanceRiskConcentrationContextRow = {
  key: string;
  label: string;
  value: string;
  definition: string;
  support: string;
};

export type PerformanceRiskExecutiveSummary = {
  heading: string;
  headline: string;
  detail: string;
  actionCue?: string | null;
  postureLabel?: string | null;
};

export type PerformanceRiskContextRow = {
  key: string;
  label: string;
  value: string;
  support: string;
};

export type PerformanceRiskViewModel = {
  state: PerformanceRiskState;
  title: string;
  synopsis: string;
  contextItems: Array<{ label: string; value: string }>;
  snapshotExecutiveSummary: PerformanceRiskExecutiveSummary | null;
  snapshotMetrics: Array<{
    key: string;
    label: string;
    value: string;
    support: string;
    state: PerformanceRiskState;
  }>;
  snapshotContextRows: PerformanceRiskContextRow[];
  concentrationIndicators: PerformanceRiskConcentrationIndicator[];
  concentrationExecutiveSummary: PerformanceRiskConcentrationExecutiveSummary | null;
  concentrationDriverAnalysis: PerformanceRiskConcentrationDriverAnalysisRow[];
  concentrationScales: PerformanceRiskConcentrationScale[];
  concentrationContextRows: PerformanceRiskConcentrationContextRow[];
  drawdownExecutiveSummary: PerformanceRiskExecutiveSummary | null;
  drawdownHeadlineMetrics: Array<{
    key: string;
    label: string;
    value: string;
    support: string;
    state: PerformanceRiskState;
  }>;
  drawdownContextRows: PerformanceRiskContextRow[];
  drawdownEpisodes: Array<{
    key: string;
    episode: string;
    depth: string;
    peakDate: string;
    troughDate: string;
    recoveryDate: string;
    totalDays: string;
    status: string;
  }>;
  drawdownRelativeMetric: {
    label: string;
    value: string;
    support: string;
    state: PerformanceRiskState;
  } | null;
  underwaterSeries: Array<{
    key: string;
    date: string;
    drawdown: string;
  }>;
  underwaterDetailState: "idle" | "loading" | "ready" | "unavailable";
  rollingWindows: Array<{
    key: string;
    label: string;
    headlineMetrics: Array<{
      key: string;
      label: string;
      value: string;
      support: string;
      state: PerformanceRiskState;
    }>;
    summaryRows: Array<{
      key: string;
      metric: string;
      latest: string;
      average: string;
      p05: string;
      p95: string;
      support: string;
    }>;
    seriesRows: Array<{
      key: string;
      date: string;
      values: Record<string, string>;
    }>;
    seriesMetricKeys: string[];
  }>;
  rollingQualityFlags: string[];
  rollingDetailState: "idle" | "loading" | "ready" | "unavailable";
  rollingExecutiveSummary: PerformanceRiskExecutiveSummary | null;
  rollingContextRows: PerformanceRiskContextRow[];
  attributionControls: {
    selectedAttributionType: string;
    selectedGroupingDimension: string;
    attributionTypes: Array<{
      key: string;
      label: string;
      disabled: boolean;
      reason?: string | null;
    }>;
    groupingDimensions: Array<{
      key: string;
      label: string;
      disabled: boolean;
      reason?: string | null;
    }>;
  } | null;
  attributionRows: Array<{
    key: string;
    group: string;
    avgWeight: string;
    marginalContribution: string;
    componentContribution: string;
    contributionShare: string;
  }>;
  attributionTotals: {
    metric: string;
    totalValue: string;
    reconciledSum: string;
    residual: string;
    support: string;
  } | null;
  attributionExecutiveSummary: PerformanceRiskExecutiveSummary | null;
  attributionMethodologyRows: PerformanceRiskContextRow[];
  attributionState: "idle" | "loading" | "ready" | "blocked" | "unavailable";
  attributionWarnings: string[];
  supportability: Array<{
    key: string;
    label: string;
    state: WorkbenchRiskModuleState;
    reason?: string | null;
  }>;
  warnings: string[];
  partialFailures: string[];
};

export type BuildPerformanceRiskViewModelOptions = {
  workspace: WorkbenchPerformanceWorkspace;
  period: string;
  detailBasis: string;
  isDetailsPending?: boolean;
  riskSummary?: WorkbenchRiskSummaryResponse | null;
  riskConcentration?: WorkbenchRiskConcentrationResponse | null;
  riskAttribution?: WorkbenchRiskAttributionResponse | null;
  riskDrawdown?: WorkbenchRiskDrawdownResponse | null;
  riskDrawdownDetail?: WorkbenchRiskDrawdownResponse | null;
  riskRolling?: WorkbenchRiskRollingResponse | null;
  riskRollingDetail?: WorkbenchRiskRollingResponse | null;
  isAttributionLoading?: boolean;
  isDrawdownDetailLoading?: boolean;
  isRollingDetailLoading?: boolean;
};

type RiskRollingPayload = NonNullable<WorkbenchRiskRollingResponse["payload"]>;

export function buildPerformanceRiskViewModel({
  workspace,
  period,
  detailBasis,
  isDetailsPending = false,
  riskSummary,
  riskConcentration,
  riskAttribution,
  riskDrawdown,
  riskDrawdownDetail,
  riskRolling,
  riskRollingDetail,
  isAttributionLoading = false,
  isDrawdownDetailLoading = false,
  isRollingDetailLoading = false,
}: BuildPerformanceRiskViewModelOptions): PerformanceRiskViewModel {
  if (isDetailsPending) {
    return buildStateViewModel(workspace, period, detailBasis, "loading");
  }

  const summary =
    riskSummary ??
    buildUnavailableRiskSummary({
      workspace,
      period,
      detailBasis,
      detail: "Risk summary is not available from the Gateway BFF.",
    });
  const concentration =
    riskConcentration ??
    buildUnavailableRiskConcentration({
      workspace,
      period,
      detail: "Risk concentration is not available from the Gateway BFF.",
    });
  const attribution = riskAttribution ?? null;
  const drawdown =
    riskDrawdown ??
    buildUnavailableRiskDrawdown({
      workspace,
      period,
      detailBasis,
      detail: "Risk drawdown is not available from the Gateway BFF.",
      includeUnderwaterSeries: false,
    });
  const rolling =
    riskRolling ??
    buildUnavailableRiskRolling({
      workspace,
      period,
      detailBasis,
      detail: "Rolling risk is not available from the Gateway BFF.",
      includeTimeSeries: false,
    });
  const drawdownDetail = riskDrawdownDetail ?? null;
  const rollingDetail = riskRollingDetail ?? null;

  const supportability = [
    ...mapSupportabilityGroup("summary", summary.supportability),
    ...mapSupportabilityGroup("concentration", concentration.supportability),
    ...mapSupportabilityGroup("attribution", attribution?.supportability ?? []),
    ...mapSupportabilityGroup("drawdown", drawdown.supportability),
    ...mapSupportabilityGroup("rolling", rolling.supportability),
  ];
  const hasPayload = Boolean(
    summary.payload?.periods.length ||
      concentration.payload ||
      attribution?.payload?.periods.length ||
      drawdown.payload?.periods.length ||
      rolling.payload?.periods.length
  );
  const moduleStates = [summary.state, concentration.state, drawdown.state, rolling.state];
  const state = !hasPayload
    ? "unavailable"
    : moduleStates.every((moduleState) => moduleState === "ready")
      ? "ready"
      : "partial";

  return {
    state,
    title: state === "unavailable" ? "Risk unavailable" : "Stateful Risk",
    synopsis:
      state === "unavailable"
        ? "Stateful risk is not available for the selected portfolio context."
        : "Stateful portfolio risk is available for the selected performance context.",
    contextItems: buildContextItems(workspace, period, detailBasis, summary.as_of_date),
    snapshotExecutiveSummary: mapSnapshotExecutiveSummary(summary),
    snapshotMetrics: mapSnapshotMetrics(summary),
    snapshotContextRows: mapSnapshotContextRows(summary),
    concentrationIndicators: mapConcentrationIndicators(concentration),
    concentrationExecutiveSummary: mapConcentrationExecutiveSummary(concentration),
    concentrationDriverAnalysis: mapConcentrationDriverAnalysis(concentration),
    concentrationScales: mapConcentrationScales(concentration),
    concentrationContextRows: mapConcentrationContextRows(concentration),
    drawdownExecutiveSummary: mapDrawdownExecutiveSummary(drawdown),
    drawdownHeadlineMetrics: mapDrawdownHeadlineMetrics(drawdown),
    drawdownContextRows: mapDrawdownContextRows(drawdown),
    drawdownEpisodes: mapDrawdownEpisodes(drawdown),
    drawdownRelativeMetric: mapRelativeDrawdownMetric(drawdown),
    underwaterSeries: mapUnderwaterSeries(drawdownDetail),
    underwaterDetailState: resolveUnderwaterDetailState({
      drawdown,
      drawdownDetail,
      isDrawdownDetailLoading,
    }),
    rollingWindows: mapRollingWindows(rolling, rollingDetail),
    rollingQualityFlags: rolling.payload?.periods[0]?.quality_flags ?? [],
    rollingDetailState: resolveRollingDetailState({
      rolling,
      rollingDetail,
      isRollingDetailLoading,
    }),
    rollingExecutiveSummary: mapRollingExecutiveSummary(rolling),
    rollingContextRows: mapRollingContextRows(rolling),
    attributionControls: mapAttributionControls(attribution),
    attributionRows: mapAttributionRows(attribution),
    attributionTotals: mapAttributionTotals(attribution),
    attributionExecutiveSummary: mapAttributionExecutiveSummary(attribution),
    attributionMethodologyRows: mapAttributionMethodologyRows(attribution),
    attributionState: resolveAttributionState({ attribution, isAttributionLoading }),
    attributionWarnings: attribution?.warnings ?? [],
    supportability: supportability.map((item) => ({
      key: item.key,
      label: item.label,
      state: item.state,
      reason: item.reason,
    })),
    warnings: [
      ...summary.warnings,
      ...concentration.warnings,
      ...(attribution?.warnings ?? []),
      ...drawdown.warnings,
      ...rolling.warnings,
    ],
    partialFailures: [
      ...summary.partial_failures.map((failure) => failure.detail),
      ...concentration.partial_failures.map((failure) => failure.detail),
      ...(attribution?.partial_failures.map((failure) => failure.detail) ?? []),
      ...drawdown.partial_failures.map((failure) => failure.detail),
      ...rolling.partial_failures.map((failure) => failure.detail),
    ],
  };
}

export function buildFixtureRiskSummary(
  workspace: WorkbenchPerformanceWorkspace,
  period: string,
  detailBasis: string
): WorkbenchRiskSummaryResponse {
  const selectedPerformance =
    detailBasis === "GROSS" ? workspace.gross_performance : workspace.net_performance;
  const activeReturn = selectedPerformance.active_return_pct ?? 0;
  const volatility = Math.max(Math.abs(activeReturn) * 1.8, 7.25);
  const trackingError = Math.max(Math.abs(activeReturn) * 0.8, 2.15);

  return {
    correlation_id: "fixture-risk-summary",
    contract_version: "risk-workspace.v1",
    portfolio_id: workspace.portfolio.portfolio_id,
    period,
    as_of_date: workspace.as_of_date,
    benchmark_code: workspace.benchmark_code,
    source_service: "lotus-risk",
    state: workspace.benchmark_code ? "partial" : "unavailable",
    payload: {
      periods: [
        {
          key: period,
          label: period,
          start_date: workspace.report_start_date,
          end_date: workspace.report_end_date,
          metrics: [
            metric("VOLATILITY", "Volatility", volatility, "ready"),
            metric("SHARPE", "Sharpe", 0.82, "ready"),
            metric("SORTINO", "Sortino", 1.05, "ready"),
            metric("BETA", "Beta", 0.94, workspace.benchmark_code ? "ready" : "unavailable"),
            metric(
              "TRACKING_ERROR",
              "Tracking Error",
              trackingError,
              workspace.benchmark_code ? "ready" : "unavailable"
            ),
            metric(
              "INFORMATION_RATIO",
              "Information Ratio",
              activeReturn / trackingError,
              workspace.benchmark_code ? "ready" : "unavailable"
            ),
            metric("VAR", "Value at Risk", -1.74, "ready", { expected_shortfall: -2.26 }),
          ],
        },
      ],
    },
    supportability: [
      {
        key: "portfolio_returns",
        label: "Portfolio returns",
        state: "ready",
        source_service: "lotus-risk",
      },
      {
        key: "benchmark_returns",
        label: "Benchmark returns",
        state: workspace.benchmark_code ? "ready" : "unavailable",
        reason: workspace.benchmark_code
          ? null
          : "Benchmark-relative risk requires benchmark context.",
        source_service: "lotus-risk",
      },
      {
        key: "risk_free_series",
        label: "Risk-free series",
        state: "partial",
        reason: "Sharpe uses the configured zero risk-free fallback until a curve is published.",
        source_service: "lotus-risk",
      },
    ],
    warnings: ["RISK_UI_FIXTURE_CONTRACT"],
    partial_failures: [],
    metadata: {
      generated_at: workspace.as_of_date,
      input_mode: "stateful",
      methodology_version: "risk-workspace.fixture.v1",
      cache_status: "bypass",
    },
  };
}

export function buildFixtureRiskConcentration(
  workspace: WorkbenchPerformanceWorkspace,
  period: string
): WorkbenchRiskConcentrationResponse {
  return {
    correlation_id: "fixture-risk-concentration",
    contract_version: "risk-workspace.v1",
    portfolio_id: workspace.portfolio.portfolio_id,
    period,
    as_of_date: workspace.as_of_date,
    benchmark_code: workspace.benchmark_code,
    source_service: "lotus-risk",
    state: "partial",
    payload: {
      portfolio_concentration: { hhi_current: 1260, hhi_proposed: 1260, hhi_delta: 0 },
      single_position_concentration: {
        top_position_weight_current: 0.184,
        top_position_weight_proposed: 0.184,
        top_position_weight_delta: 0,
        top_n_cumulative_weight_current: 0.528,
        top_n_cumulative_weight_proposed: 0.528,
        top_n_cumulative_weight_delta: 0,
        top_n: 10,
        top_position_current: {
          security_id: "FUND_PIMCO_INC",
          security_name: "PIMCO GIS Income Fund",
          weight: 0.184,
        },
        top_position_proposed: {
          security_id: "FUND_PIMCO_INC",
          security_name: "PIMCO GIS Income Fund",
          weight: 0.184,
        },
      },
      issuer_concentration: {
        hhi_current: 1448,
        hhi_proposed: 1448,
        hhi_delta: 0,
        top_issuer_weight_current: 0.214,
        top_issuer_weight_proposed: 0.214,
        top_issuer_weight_delta: 0,
        coverage_status: "partial",
        covered_position_count_current: 8,
        covered_position_count_proposed: 8,
        total_position_count_current: 10,
        total_position_count_proposed: 10,
        uncovered_position_count_current: 2,
        uncovered_position_count_proposed: 2,
        coverage_ratio_current: 0.8,
        coverage_ratio_proposed: 0.8,
        note: "Issuer enrichment is partial in the current stateful risk contract.",
        top_issuer_current: {
          issuer_id: "ISSUER_PIMCO",
          issuer_name: "Pacific Investment Management Company LLC",
          weight: 0.214,
        },
        top_issuer_proposed: {
          issuer_id: "ISSUER_PIMCO",
          issuer_name: "Pacific Investment Management Company LLC",
          weight: 0.214,
        },
      },
      valuation_context: {
        portfolio_currency: workspace.portfolio.base_currency,
        reporting_currency: workspace.portfolio.base_currency,
        position_basis: "market_value_base",
        weight_basis: "total_market_value_base",
      },
      execution_context: {
        as_of_date: workspace.as_of_date,
        portfolio_id: workspace.portfolio.portfolio_id,
        issuer_grouping_level: "ultimate_parent",
        enrichment_policy: "merge_caller_then_core",
        include_cash_positions: true,
        include_zero_quantity_positions: false,
      },
    },
    supportability: [
      {
        key: "portfolio_positions",
        label: "Portfolio positions",
        state: "ready",
        source_service: "lotus-risk",
      },
      {
        key: "issuer_enrichment",
        label: "Issuer enrichment",
        state: "partial",
        reason: "Issuer coverage is partial in the current stateful risk contract.",
        source_service: "lotus-risk",
      },
      {
        key: "issuer_grouping",
        label: "Issuer grouping",
        state: "ready",
        reason: "Ultimate parent grouping with merge caller then core enrichment policy.",
        source_service: "lotus-risk",
      },
      {
        key: "valuation_basis",
        label: "Valuation basis",
        state: "ready",
        reason: "Total market value base in USD/USD context.",
        source_service: "lotus-risk",
      },
    ],
    warnings: ["RISK_CONCENTRATION_FIXTURE_CONTRACT"],
    partial_failures: [],
    metadata: {
      generated_at: workspace.as_of_date,
      input_mode: "stateful",
      methodology_version: "concentration.fixture.v1",
      cache_status: "bypass",
    },
  };
}

export function buildFixtureRiskDrawdown(
  workspace: WorkbenchPerformanceWorkspace,
  period: string,
  detailBasis: string,
  options?: {
    includeUnderwaterSeries?: boolean;
    includeBenchmarkRelative?: boolean;
  }
): WorkbenchRiskDrawdownResponse {
  const includeUnderwaterSeries = options?.includeUnderwaterSeries ?? false;
  const includeBenchmarkRelative = options?.includeBenchmarkRelative ?? Boolean(workspace.benchmark_code);
  return {
    correlation_id: "fixture-risk-drawdown",
    contract_version: "risk-workspace.v1",
    portfolio_id: workspace.portfolio.portfolio_id,
    period,
    as_of_date: workspace.as_of_date,
    benchmark_code: workspace.benchmark_code,
    source_service: "lotus-risk",
    state: includeBenchmarkRelative ? "partial" : "partial",
    payload: {
      periods: [
        {
          key: period,
          label: period,
          start_date: workspace.report_start_date,
          end_date: workspace.report_end_date,
          summary: {
            max_drawdown: -0.124533,
            max_drawdown_peak_date: "2026-01-12",
            max_drawdown_trough_date: "2026-02-03",
            max_drawdown_recovery_date: null,
            is_recovered: false,
            days_to_trough: 16,
            days_to_recovery: null,
            time_under_water_days: 34,
            average_drawdown: -0.041208,
            ulcer_index: 0.053901,
            drawdown_at_risk_95: -0.101552,
            conditional_drawdown_at_risk_95: -0.117884,
          },
          episodes: [
            {
              episode_id: "dd_0001",
              peak_date: "2026-01-12",
              trough_date: "2026-02-03",
              recovery_date: null,
              depth: -0.124533,
              days_to_trough: 16,
              days_to_recovery: null,
              total_days: 34,
              is_recovered: false,
            },
            {
              episode_id: "dd_0002",
              peak_date: "2026-02-12",
              trough_date: "2026-02-13",
              recovery_date: "2026-02-19",
              depth: -0.055,
              days_to_trough: 1,
              days_to_recovery: 4,
              total_days: 7,
              is_recovered: true,
            },
          ],
          relative_to_benchmark: includeBenchmarkRelative
            ? {
                max_drawdown: -0.0821,
                max_drawdown_peak_date: "2026-01-11",
                max_drawdown_trough_date: "2026-02-01",
              }
            : null,
          underwater_series: includeUnderwaterSeries
            ? [
                { date: "2026-01-20", drawdown: -0.0521 },
                { date: "2026-01-21", drawdown: -0.061 },
                { date: "2026-01-22", drawdown: -0.0734 },
              ]
            : null,
          error: null,
        },
      ],
    },
    supportability: [
      {
        key: "portfolio_returns",
        label: "Portfolio returns",
        state: "ready",
        source_service: "lotus-risk",
      },
      {
        key: "benchmark_relative_drawdown",
        label: "Benchmark-relative drawdown",
        state: includeBenchmarkRelative ? "ready" : "partial",
        reason: includeBenchmarkRelative
          ? null
          : "Benchmark-relative drawdown requires benchmark context.",
        source_service: "lotus-risk",
      },
      {
        key: "underwater_series",
        label: "Underwater series",
        state: includeUnderwaterSeries ? "ready" : "partial",
        reason: includeUnderwaterSeries
          ? null
          : "Underwater series is available on demand and is not included in first paint.",
        source_service: "lotus-risk",
      },
    ],
    warnings: includeUnderwaterSeries ? [] : ["RISK_DRAWDOWN_UNDERWATER_DEFERRED"],
    partial_failures: [],
    metadata: {
      generated_at: workspace.as_of_date,
      input_mode: "stateful",
      methodology_version: "drawdown.fixture.v1",
      cache_status: "bypass",
    },
  };
}

export function buildFixtureRiskRolling(
  workspace: WorkbenchPerformanceWorkspace,
  period: string,
  detailBasis: string,
  options?: {
    includeTimeSeries?: boolean;
  }
): WorkbenchRiskRollingResponse {
  const includeTimeSeries = options?.includeTimeSeries ?? false;
  const includeBenchmarkMetrics = Boolean(workspace.benchmark_code);
  return {
    correlation_id: "fixture-risk-rolling",
    contract_version: "risk-workspace.v1",
    portfolio_id: workspace.portfolio.portfolio_id,
    period,
    as_of_date: workspace.as_of_date,
    benchmark_code: workspace.benchmark_code,
    source_service: "lotus-risk",
    state: includeBenchmarkMetrics ? "partial" : "partial",
    payload: {
      periods: [
        {
          key: period,
          label: period,
          start_date: workspace.report_start_date,
          end_date: workspace.report_end_date,
          series_count: 66,
          window_results: [21, 63, 126, 252].map((windowLength, index) => ({
            window_length: windowLength,
            metric_summaries: buildFixtureRollingMetricSummaries({
              windowLength,
              includeBenchmarkMetrics,
            }),
            metric_series: includeTimeSeries
              ? buildFixtureRollingSeries({
                  windowLength,
                  includeBenchmarkMetrics,
                  offset: index,
                })
              : null,
          })),
          quality_flags: includeBenchmarkMetrics
            ? ["metric:ROLLING_BETA:benchmark_variance_zero"]
            : [],
          error: null,
        },
      ],
    },
    supportability: [
      {
        key: "portfolio_returns",
        label: "Portfolio returns",
        state: "ready",
        source_service: "lotus-risk",
      },
      {
        key: "benchmark_returns",
        label: "Benchmark returns",
        state: includeBenchmarkMetrics ? "ready" : "partial",
        reason: includeBenchmarkMetrics
          ? null
          : "Benchmark-relative rolling metrics require benchmark context.",
        source_service: "lotus-risk",
      },
      {
        key: "risk_free_series",
        label: "Risk-free series",
        state: "partial",
        reason:
          "Rolling Sharpe uses the configured risk-free source and may degrade when the upstream curve is unavailable.",
        source_service: "lotus-risk",
      },
      {
        key: "rolling_time_series",
        label: "Rolling time series",
        state: includeTimeSeries ? "ready" : "partial",
        reason: includeTimeSeries
          ? null
          : "Rolling time series is available on demand and is excluded from first paint.",
        source_service: "lotus-risk",
      },
    ],
    warnings: includeTimeSeries ? [] : ["RISK_ROLLING_TIME_SERIES_DEFERRED"],
    partial_failures: [],
    metadata: {
      generated_at: workspace.as_of_date,
      input_mode: "stateful",
      methodology_version: `rolling.fixture.${detailBasis.toLowerCase()}.v1`,
      cache_status: "bypass",
    },
  };
}

export function buildFixtureRiskAttribution(
  workspace: WorkbenchPerformanceWorkspace,
  period: string,
  detailBasis: string,
  options?: {
    attributionType?: "TOTAL_RISK" | "ACTIVE_RISK";
    groupingDimension?: "POSITION" | "SECTOR" | "ASSET_CLASS" | "ISSUER";
  }
): WorkbenchRiskAttributionResponse {
  const attributionType = options?.attributionType ?? "TOTAL_RISK";
  const groupingDimension = options?.groupingDimension ?? "SECTOR";
  const activeRiskReady = Boolean(workspace.benchmark_code);
  const issuerBlocked = attributionType === "ACTIVE_RISK" && groupingDimension === "ISSUER";
  const blockedWithoutBenchmark = attributionType === "ACTIVE_RISK" && !workspace.benchmark_code;
  const state = issuerBlocked || blockedWithoutBenchmark ? "blocked" : "ready";
  const contributors =
    groupingDimension === "ASSET_CLASS"
      ? [
          {
            group_key: "EQUITY",
            group_label: "Equity",
            weight_average: 0.62,
            marginal_contribution: 0.018,
            component_contribution: 0.016,
            percent_contribution: 0.47,
          },
          {
            group_key: "FIXED_INCOME",
            group_label: "Fixed Income",
            weight_average: 0.24,
            marginal_contribution: 0.011,
            component_contribution: 0.009,
            percent_contribution: 0.26,
          },
        ]
      : [
          {
            group_key: "SECTOR_TECH",
            group_label: "Technology",
            weight_average: 0.41,
            marginal_contribution: 0.019,
            component_contribution: 0.017,
            percent_contribution: 0.41,
          },
          {
            group_key: "SECTOR_HEALTH",
            group_label: "Healthcare",
            weight_average: 0.18,
            marginal_contribution: 0.008,
            component_contribution: 0.006,
            percent_contribution: 0.15,
          },
        ];
  const supportability: NonNullable<WorkbenchRiskAttributionResponse["supportability"]> = [
    {
      key: "portfolio_returns",
      label: "Portfolio returns",
      state: "ready",
      source_service: "lotus-risk",
    },
    {
      key: "exposure_history",
      label: "Exposure history",
      state: "ready",
      source_service: "lotus-core",
    },
    ...(attributionType === "ACTIVE_RISK"
      ? [
          {
            key: "benchmark_returns",
            label: "Benchmark returns",
            state: workspace.benchmark_code ? ("ready" as const) : ("blocked" as const),
            reason: workspace.benchmark_code ? null : "Active risk requires benchmark context.",
            source_service: "lotus-performance",
          },
          {
            key: "benchmark_exposure_context",
            label: "Benchmark exposure context",
            state:
              groupingDimension === "ISSUER"
                ? ("blocked" as const)
                : workspace.benchmark_code
                  ? ("ready" as const)
                  : ("blocked" as const),
            reason:
              groupingDimension === "ISSUER"
                ? "Issuer benchmark exposure semantics are not available."
                : workspace.benchmark_code
                  ? null
                  : "Active risk requires benchmark context.",
            source_service: "lotus-performance",
          },
        ]
      : [
          {
            key: "benchmark_exposure_context",
            label: "Benchmark exposure context",
            state: groupingDimension === "ISSUER" ? ("partial" as const) : ("ready" as const),
            reason:
              groupingDimension === "ISSUER"
                ? "Issuer benchmark exposure semantics remain unavailable for active-risk decomposition."
                : null,
            source_service: "lotus-performance",
          },
        ]),
  ];

  return {
    correlation_id: "fixture-risk-attribution",
    contract_version: "risk-workspace.v1",
    portfolio_id: workspace.portfolio.portfolio_id,
    period,
    as_of_date: workspace.as_of_date,
    benchmark_code: workspace.benchmark_code,
    source_service: "lotus-risk",
    state,
    payload: {
      controls: {
        attribution_types: [
          { key: "TOTAL_RISK", label: "Total Risk", state: "ready", reason: null },
          {
            key: "ACTIVE_RISK",
            label: "Active Risk",
            state: activeRiskReady ? "ready" : "blocked",
            reason: activeRiskReady ? null : "Active risk requires benchmark context.",
          },
        ],
        grouping_dimensions: [
          {
            key: "POSITION",
            label: "Position",
            state: "ready",
            reason: null,
            supported_attribution_types: activeRiskReady
              ? ["TOTAL_RISK", "ACTIVE_RISK"]
              : ["TOTAL_RISK"],
          },
          {
            key: "SECTOR",
            label: "Sector",
            state: "ready",
            reason: null,
            supported_attribution_types: activeRiskReady
              ? ["TOTAL_RISK", "ACTIVE_RISK"]
              : ["TOTAL_RISK"],
          },
          {
            key: "ASSET_CLASS",
            label: "Asset Class",
            state: "ready",
            reason: null,
            supported_attribution_types: activeRiskReady
              ? ["TOTAL_RISK", "ACTIVE_RISK"]
              : ["TOTAL_RISK"],
          },
          {
            key: "ISSUER",
            label: "Issuer",
            state: attributionType === "TOTAL_RISK" ? "partial" : "blocked",
            reason:
              attributionType === "TOTAL_RISK"
                ? "Issuer is supported for total risk only."
                : "Active risk by issuer remains unavailable until benchmark issuer exposure semantics are approved.",
            supported_attribution_types: ["TOTAL_RISK"],
          },
        ],
        selected_attribution_type: attributionType,
        selected_grouping_dimension: groupingDimension,
      },
      periods:
        state === "ready"
          ? [
              {
                key: period,
                label: period,
                start_date: workspace.report_start_date,
                end_date: workspace.report_end_date,
                attribution_sets: [
                  {
                    attribution_type: attributionType,
                    metric: attributionType === "ACTIVE_RISK" ? "TRACKING_ERROR" : "VOLATILITY",
                    grouping_dimension: groupingDimension,
                    total_value: attributionType === "ACTIVE_RISK" ? 0.034 : 0.121,
                    reconciled_sum: attributionType === "ACTIVE_RISK" ? 0.033 : 0.119,
                    residual: attributionType === "ACTIVE_RISK" ? 0.001 : 0.002,
                    contributors,
                    quality_flags: [],
                  },
                ],
                error: null,
              },
            ]
          : [],
      methodology_context: {
        covariance_method: "EMPIRICAL",
        annualization_basis: 252,
        requested_attribution_types: [attributionType],
        requested_metrics: [attributionType === "ACTIVE_RISK" ? "TRACKING_ERROR" : "VOLATILITY"],
        requested_grouping_dimensions: [groupingDimension],
        min_observations_policy: "STRICT",
        stateful_active_risk_supported_grouping_dimensions: [
          "POSITION",
          "SECTOR",
          "ASSET_CLASS",
        ],
        stateful_active_risk_gated_grouping_dimensions: ["ISSUER"],
        stateful_active_risk_gate_reason: "benchmark issuer exposure semantics unavailable",
      },
    },
    supportability,
    warnings: state === "ready" ? [] : ["RISK_ATTRIBUTION_BLOCKED"],
    partial_failures: [],
    metadata: {
      generated_at: workspace.as_of_date,
      input_mode: "stateful",
      methodology_version: `historical_attribution.fixture.${detailBasis.toLowerCase()}.v1`,
      cache_status: "bypass",
    },
  };
}

export function buildUnavailableRiskSummary({
  workspace,
  period,
  detailBasis,
  detail,
}: {
  workspace: WorkbenchPerformanceWorkspace;
  period: string;
  detailBasis: string;
  detail: string;
}): WorkbenchRiskSummaryResponse {
  return {
    correlation_id: "risk-summary-unavailable",
    contract_version: "risk-workspace.v1",
    portfolio_id: workspace.portfolio.portfolio_id,
    period,
    as_of_date: workspace.as_of_date,
    benchmark_code: workspace.benchmark_code,
    source_service: "lotus-risk",
    state: "unavailable",
    payload: null,
    supportability: [
      {
        key: "risk_summary",
        label: "Risk summary",
        state: "unavailable",
        reason: `${detail} (${detailBasis} basis)`,
        source_service: "lotus-risk",
      },
    ],
    warnings: ["RISK_SUMMARY_UNAVAILABLE"],
    partial_failures: [
      { source_service: "risk", error_code: "RISK_SUMMARY_UNAVAILABLE", detail },
    ],
    metadata: {
      generated_at: workspace.as_of_date,
      input_mode: "stateful",
      cache_status: "miss",
    },
  };
}

export function buildUnavailableRiskConcentration({
  workspace,
  period,
  detail,
}: {
  workspace: WorkbenchPerformanceWorkspace;
  period: string;
  detail: string;
}): WorkbenchRiskConcentrationResponse {
  return {
    correlation_id: "risk-concentration-unavailable",
    contract_version: "risk-workspace.v1",
    portfolio_id: workspace.portfolio.portfolio_id,
    period,
    as_of_date: workspace.as_of_date,
    benchmark_code: workspace.benchmark_code,
    source_service: "lotus-risk",
    state: "unavailable",
    payload: null,
    supportability: [
      {
        key: "risk_concentration",
        label: "Risk concentration",
        state: "unavailable",
        reason: detail,
        source_service: "lotus-risk",
      },
    ],
    warnings: ["RISK_CONCENTRATION_UNAVAILABLE"],
    partial_failures: [
      { source_service: "risk", error_code: "RISK_CONCENTRATION_UNAVAILABLE", detail },
    ],
    metadata: {
      generated_at: workspace.as_of_date,
      input_mode: "stateful",
      cache_status: "miss",
    },
  };
}

export function buildUnavailableRiskDrawdown({
  workspace,
  period,
  detailBasis,
  detail,
  includeUnderwaterSeries,
}: {
  workspace: WorkbenchPerformanceWorkspace;
  period: string;
  detailBasis: string;
  detail: string;
  includeUnderwaterSeries: boolean;
}): WorkbenchRiskDrawdownResponse {
  return {
    correlation_id: "risk-drawdown-unavailable",
    contract_version: "risk-workspace.v1",
    portfolio_id: workspace.portfolio.portfolio_id,
    period,
    as_of_date: workspace.as_of_date,
    benchmark_code: workspace.benchmark_code,
    source_service: "lotus-risk",
    state: "unavailable",
    payload: null,
    supportability: [
      {
        key: "risk_drawdown",
        label: includeUnderwaterSeries ? "Risk drawdown detail" : "Risk drawdown",
        state: "unavailable",
        reason: `${detail} (${detailBasis} basis)`,
        source_service: "lotus-risk",
      },
    ],
    warnings: ["RISK_DRAWDOWN_UNAVAILABLE"],
    partial_failures: [
      { source_service: "risk", error_code: "RISK_DRAWDOWN_UNAVAILABLE", detail },
    ],
    metadata: {
      generated_at: workspace.as_of_date,
      input_mode: "stateful",
      cache_status: "miss",
    },
  };
}

export function buildUnavailableRiskRolling({
  workspace,
  period,
  detailBasis,
  detail,
  includeTimeSeries,
}: {
  workspace: WorkbenchPerformanceWorkspace;
  period: string;
  detailBasis: string;
  detail: string;
  includeTimeSeries: boolean;
}): WorkbenchRiskRollingResponse {
  return {
    correlation_id: "risk-rolling-unavailable",
    contract_version: "risk-workspace.v1",
    portfolio_id: workspace.portfolio.portfolio_id,
    period,
    as_of_date: workspace.as_of_date,
    benchmark_code: workspace.benchmark_code,
    source_service: "lotus-risk",
    state: "unavailable",
    payload: null,
    supportability: [
      {
        key: "risk_rolling",
        label: includeTimeSeries ? "Rolling risk detail" : "Rolling risk",
        state: "unavailable",
        reason: `${detail} (${detailBasis} basis)`,
        source_service: "lotus-risk",
      },
    ],
    warnings: ["RISK_ROLLING_UNAVAILABLE"],
    partial_failures: [
      { source_service: "risk", error_code: "RISK_ROLLING_UNAVAILABLE", detail },
    ],
    metadata: {
      generated_at: workspace.as_of_date,
      input_mode: "stateful",
      cache_status: "miss",
    },
  };
}

export function buildUnavailableRiskAttribution({
  workspace,
  period,
  detail,
}: {
  workspace: WorkbenchPerformanceWorkspace;
  period: string;
  detail: string;
}): WorkbenchRiskAttributionResponse {
  return {
    correlation_id: "risk-attribution-unavailable",
    contract_version: "risk-workspace.v1",
    portfolio_id: workspace.portfolio.portfolio_id,
    period,
    as_of_date: workspace.as_of_date,
    benchmark_code: workspace.benchmark_code,
    source_service: "lotus-risk",
    state: "unavailable",
    payload: null,
    supportability: [
      {
        key: "risk_attribution",
        label: "Historical risk attribution",
        state: "unavailable",
        reason: detail,
        source_service: "lotus-risk",
      },
    ],
    warnings: ["RISK_ATTRIBUTION_UNAVAILABLE"],
    partial_failures: [
      { source_service: "risk", error_code: "RISK_ATTRIBUTION_UNAVAILABLE", detail },
    ],
    metadata: {
      generated_at: workspace.as_of_date,
      input_mode: "stateful",
      cache_status: "miss",
    },
  };
}

function buildStateViewModel(
  workspace: WorkbenchPerformanceWorkspace,
  period: string,
  detailBasis: string,
  state: PerformanceRiskState
): PerformanceRiskViewModel {
  const asOfDate = workspace.as_of_date;
  const title =
    state === "loading"
      ? "Loading stateful risk"
      : state === "unavailable"
        ? "Risk unavailable"
        : "Risk not available";

  return {
    state,
    title,
    synopsis:
      state === "loading"
        ? "Risk snapshot and concentration modules are loading from the Gateway BFF contract."
        : "Stateful risk is not available for the selected portfolio context.",
    contextItems: buildContextItems(workspace, period, detailBasis, asOfDate),
    snapshotExecutiveSummary: null,
    snapshotMetrics: [],
    snapshotContextRows: [],
    concentrationIndicators: [],
    concentrationExecutiveSummary: null,
    concentrationDriverAnalysis: [],
    concentrationScales: [],
    concentrationContextRows: [],
    drawdownExecutiveSummary: null,
    drawdownHeadlineMetrics: [],
    drawdownContextRows: [],
    drawdownEpisodes: [],
    drawdownRelativeMetric: null,
    underwaterSeries: [],
    underwaterDetailState: "idle",
    rollingWindows: [],
    rollingQualityFlags: [],
    rollingDetailState: "idle",
    rollingExecutiveSummary: null,
    rollingContextRows: [],
    attributionControls: null,
    attributionRows: [],
    attributionTotals: null,
    attributionExecutiveSummary: null,
    attributionMethodologyRows: [],
    attributionState: "idle",
    attributionWarnings: [],
    supportability: [
      {
        key: "risk_bff",
        label: "Risk BFF",
        state: state === "loading" ? "partial" : "unavailable",
        reason:
          state === "loading"
            ? "Gateway risk contract is loading."
            : "Gateway risk BFF response is not available.",
      },
    ],
    warnings: state === "loading" ? [] : ["RISK_WORKSPACE_UNAVAILABLE"],
    partialFailures: [],
  };
}

function buildContextItems(
  workspace: WorkbenchPerformanceWorkspace,
  period: string,
  detailBasis: string,
  asOfDate: string
) {
  return [
    { label: "Portfolio", value: workspace.portfolio.portfolio_id },
    { label: "Period", value: period },
    { label: "Basis", value: detailBasis },
    { label: "Benchmark", value: workspace.benchmark_code ?? "Unassigned" },
    { label: "As of", value: formatDateValue(asOfDate) },
  ];
}

function metric(
  key: string,
  label: string,
  value: number | null,
  state: WorkbenchRiskModuleState,
  details?: Record<string, unknown>
): WorkbenchRiskMetric {
  return { key, label, value, state, details };
}

function mapSnapshotMetrics(response: WorkbenchRiskSummaryResponse) {
  const metrics = response.payload?.periods[0]?.metrics ?? [];
  return metrics.map((item) => ({
    key: item.key,
    label: item.label,
    value: formatRiskMetric(item),
    support: item.reason ?? (item.state === "ready" ? "Stateful risk metric" : "Not available"),
    state: resolveMetricState(item.state),
  }));
}

function mapSnapshotExecutiveSummary(
  response: WorkbenchRiskSummaryResponse
): PerformanceRiskExecutiveSummary | null {
  const period = response.payload?.periods[0];
  if (!period) {
    return null;
  }
  const volatility = period.metrics.find((metric) => metric.key === "VOLATILITY");
  const trackingError = period.metrics.find((metric) => metric.key === "TRACKING_ERROR");
  const informationRatio = period.metrics.find((metric) => metric.key === "INFORMATION_RATIO");
  const benchmarkApplied = period.benchmark_context?.reason === "APPLIED";

  return {
    heading: "Business reading",
    headline:
      typeof volatility?.value === "number" && volatility.value >= 12
        ? "Realized portfolio volatility is elevated."
        : typeof volatility?.value === "number" && volatility.value >= 8
          ? "Realized portfolio volatility is moderate."
          : "Realized portfolio volatility is contained.",
    detail: benchmarkApplied
      ? `Benchmark-relative metrics are available. Tracking error is ${formatRiskMetric(trackingError ?? metric("TRACKING_ERROR", "Tracking Error", null, "unavailable"))} and information ratio is ${formatRiskMetric(informationRatio ?? metric("INFORMATION_RATIO", "Information Ratio", null, "unavailable"))}.`
      : "Benchmark-relative metrics should be qualified because benchmark alignment is incomplete.",
    actionCue: benchmarkApplied
      ? "Review volatility, tracking error, and information ratio together before treating the book as benchmark-stable."
      : "Confirm benchmark availability before relying on relative risk interpretation.",
  };
}

function mapSnapshotContextRows(
  response: WorkbenchRiskSummaryResponse
): PerformanceRiskContextRow[] {
  const period = response.payload?.periods[0];
  if (!period) {
    return [];
  }
  return [
    {
      key: "portfolio_observations",
      label: "Portfolio observations",
      value: formatInteger(period.portfolio_observation_count),
      support: "Return observations used for realized risk calculations",
    },
    {
      key: "benchmark_observations",
      label: "Benchmark observations",
      value: formatInteger(period.benchmark_observation_count),
      support:
        period.benchmark_context?.reason === "APPLIED"
          ? `${formatInteger(period.aligned_benchmark_observation_count)} aligned for relative metrics`
          : period.benchmark_context?.reason ?? "Benchmark-relative metrics not applied",
    },
    {
      key: "benchmark_context",
      label: "Benchmark context",
      value: formatEnumLabel(period.benchmark_context?.reason) ?? "Not requested",
      support:
        period.benchmark_context?.requested_metrics?.length
          ? `${period.benchmark_context.requested_metrics.join(", ")} requested`
          : "No benchmark-relative metrics requested",
    },
  ];
}

function mapConcentrationIndicators(
  response: WorkbenchRiskConcentrationResponse
): PerformanceRiskConcentrationIndicator[] {
  const payload = response.payload;
  if (!payload) {
    return [];
  }
  const coverageTone = resolveConcentrationIndicatorTone(response.supportability);
  return [
    {
      key: "portfolio_hhi",
      label: "Portfolio Concentration Index",
      value: formatNumber(payload.portfolio_concentration.hhi_current, { maximumFractionDigits: 0 }),
      support: "Position-level concentration across the live book",
      definition:
        "Herfindahl-Hirschman Index for the current portfolio. Higher values indicate exposure concentrated in fewer holdings.",
    },
    {
      key: "issuer_hhi",
      label: "Issuer Concentration Index",
      value: formatNumber(payload.issuer_concentration.hhi_current, { maximumFractionDigits: 0 }),
      support: "Issuer-level concentration after grouping",
      definition:
        "Concentration index after holdings are grouped at issuer level using the configured enrichment and grouping policy.",
      tone: coverageTone,
    },
    {
      key: "top_position_weight",
      label: "Largest Position Weight",
      value: formatRiskPercentValue(payload.single_position_concentration.top_position_weight_current),
      support: "Weight of the largest single holding",
      definition: "Weight of the single largest holding in the current portfolio.",
      tone: resolveWeightIndicatorTone(payload.single_position_concentration.top_position_weight_current),
    },
    {
      key: "top_issuer_weight",
      label: "Largest Issuer Weight",
      value: formatRiskPercentValue(payload.issuer_concentration.top_issuer_weight_current),
      support: "Aggregated exposure to the largest issuer group",
      definition: "Combined weight of all holdings mapped to the largest issuer group.",
      tone: resolveWeightIndicatorTone(payload.issuer_concentration.top_issuer_weight_current),
    },
    {
      key: "top_n_cumulative",
      label: `Top ${payload.single_position_concentration.top_n} Weight`,
      value: formatRiskPercentValue(
        payload.single_position_concentration.top_n_cumulative_weight_current
      ),
      support: "Cumulative weight of the 10 largest holdings",
      definition: "Cumulative portfolio weight of the 10 largest holdings.",
      tone: resolveWeightIndicatorTone(payload.single_position_concentration.top_n_cumulative_weight_current),
    },
  ];
}

function mapConcentrationExecutiveSummary(
  response: WorkbenchRiskConcentrationResponse
): PerformanceRiskConcentrationExecutiveSummary | null {
  const payload = response.payload;
  if (!payload) {
    return null;
  }
  const posture = buildConcentrationPostureModel(response);
  const topPositionName =
    payload.single_position_concentration.top_position_current.security_name ?? "the largest holding";
  const topIssuerName =
    payload.issuer_concentration.top_issuer_current.issuer_name ?? "the largest issuer group";
  const topPositionWeight = formatRiskPercentValue(
    payload.single_position_concentration.top_position_weight_current
  );
  const topIssuerWeight = formatRiskPercentValue(payload.issuer_concentration.top_issuer_weight_current);

  const driverSummary =
    posture.principalDriver === "both"
      ? "Both position and issuer concentration are contributing materially."
      : posture.principalDriver === "issuer"
        ? "Issuer grouping confirms concentration remains issuer-led."
        : "Single-name exposure is the main concentration driver.";

  const issuerReliability =
    posture.state === "partial"
      ? "Issuer interpretation is partial because not all holdings are enriched to issuer level."
      : "Issuer interpretation is reliable for the current selection.";

  return {
    heading: "Business reading",
    postureLabel: posture.label,
    postureState: posture.state,
    businessReadingHeadline: posture.summary,
    businessReadingDetail: `${driverSummary} ${issuerReliability}`,
    actionCue:
      posture.state === "partial"
        ? "Qualify issuer-level conclusions until coverage is complete."
        : posture.state === "high" || posture.state === "elevated"
          ? `Review ${topPositionName} (${topPositionWeight}) and ${topIssuerName} (${topIssuerWeight}) against diversification expectations.`
          : "Compare the largest exposures with diversification expectations.",
  };
}

function mapConcentrationDriverAnalysis(
  response: WorkbenchRiskConcentrationResponse
): PerformanceRiskConcentrationDriverAnalysisRow[] {
  const payload = response.payload;
  if (!payload) {
    return [];
  }
  const topPositionWeight = formatRiskPercentValue(
    payload.single_position_concentration.top_position_weight_current
  );
  const topIssuerWeight = formatRiskPercentValue(payload.issuer_concentration.top_issuer_weight_current);
  const topTenWeight = formatRiskPercentValue(
    payload.single_position_concentration.top_n_cumulative_weight_current
  );
  const coverageRatio = formatRiskPercentValue(payload.issuer_concentration.coverage_ratio_current);
  const breadthSummary = buildBreadthSummary(
    payload.single_position_concentration.top_n_cumulative_weight_current
  );
  const issuerCoverageSummary =
    payload.issuer_concentration.coverage_ratio_current >= 0.99
      ? "Issuer interpretation is reliable for the current selection."
      : "Issuer interpretation should be qualified because coverage is not complete.";

  return [
    {
      key: "largest_current_exposures",
      eyebrow: "Largest current exposures",
      summary: `The largest single holding is ${topPositionWeight}, and the largest issuer group is ${topIssuerWeight}, indicating concentration is driven by a small number of names.`,
      supportingMetricLabel: "Largest line items",
      supportingMetricValue: `${topPositionWeight} / ${topIssuerWeight}`,
    },
    {
      key: "concentration_breadth",
      eyebrow: "Concentration breadth",
      summary: `The top ${payload.single_position_concentration.top_n} holdings represent ${topTenWeight} of portfolio weight, indicating ${breadthSummary.toLowerCase()}`,
      supportingMetricLabel: `Top ${payload.single_position_concentration.top_n} weight`,
      supportingMetricValue: topTenWeight,
    },
    {
      key: "issuer_interpretation",
      eyebrow: "Issuer interpretation",
      summary: `${issuerCoverageSummary} Grouping is performed at ${formatEnumLabel(
        payload.execution_context?.issuer_grouping_level
      ) ?? "the configured issuer level"}.`,
      supportingMetricLabel: "Issuer coverage",
      supportingMetricValue: coverageRatio,
    },
  ];
}

function mapConcentrationScales(
  response: WorkbenchRiskConcentrationResponse
): PerformanceRiskConcentrationScale[] {
  const payload = response.payload;
  if (!payload) {
    return [];
  }
  return [
    {
      key: "portfolio_hhi",
      label: "Portfolio Concentration Index",
      value: formatNumber(payload.portfolio_concentration.hhi_current, { maximumFractionDigits: 0 }),
      interpretationBand: resolveConcentrationBand(payload.portfolio_concentration.hhi_current),
      interpretation: `Position-level concentration is ${resolveConcentrationBand(payload.portfolio_concentration.hhi_current).toLowerCase()} across the live book.`,
      markerPct: resolveConcentrationIndexMarker(payload.portfolio_concentration.hhi_current),
      definition:
        "Herfindahl-Hirschman Index for the current portfolio. Higher values indicate exposure concentrated in fewer holdings.",
    },
    {
      key: "issuer_hhi",
      label: "Issuer Concentration Index",
      value: formatNumber(payload.issuer_concentration.hhi_current, { maximumFractionDigits: 0 }),
      interpretationBand: resolveConcentrationBand(payload.issuer_concentration.hhi_current),
      interpretation: `Issuer-level concentration remains ${resolveConcentrationBand(payload.issuer_concentration.hhi_current).toLowerCase()} after issuer grouping.`,
      markerPct: resolveConcentrationIndexMarker(payload.issuer_concentration.hhi_current),
      definition:
        "Concentration index after holdings are grouped at issuer level using the configured enrichment and grouping policy.",
    },
  ];
}

function mapConcentrationContextRows(
  response: WorkbenchRiskConcentrationResponse
): PerformanceRiskConcentrationContextRow[] {
  const payload = response.payload;
  if (!payload) {
    return [];
  }
  const executionContext = payload.execution_context;
  const valuationContext = payload.valuation_context;
  return [
    {
      key: "issuer_coverage",
      label: "Issuer Coverage",
      value: formatRiskPercentValue(payload.issuer_concentration.coverage_ratio_current),
      definition:
        "Share of positions with issuer mapping sufficient for issuer-level concentration analysis.",
      support: `${payload.issuer_concentration.covered_position_count_current}/${payload.issuer_concentration.total_position_count_current} positions mapped for issuer analysis`,
    },
    {
      key: "grouping_level",
      label: "Grouping Level",
      value: formatEnumLabel(executionContext?.issuer_grouping_level) ?? "N/A",
      definition: "Issuer grouping level used to aggregate exposures for concentration review.",
      support: "Aggregation level used for issuer groups",
    },
    {
      key: "enrichment_policy",
      label: "Enrichment Policy",
      value: formatEnumLabel(executionContext?.enrichment_policy) ?? "N/A",
      definition:
        "Policy used to combine caller-supplied mapping and core enrichment when forming issuer groups.",
      support: "Caller and core mapping merge posture",
    },
    {
      key: "weight_basis",
      label: "Weight Basis",
      value: formatEnumLabel(valuationContext?.weight_basis) ?? "N/A",
      definition: "Portfolio denominator used to calculate concentration weights.",
      support: "Denominator used for weight calculations",
    },
    {
      key: "reporting_currency",
      label: "Reporting Currency",
      value: valuationContext?.reporting_currency ?? "N/A",
      definition: "Reporting currency used for the current concentration review.",
      support: valuationContext?.portfolio_currency ? "Portfolio currency" : "Portfolio currency",
    },
  ];
}

function mapDrawdownHeadlineMetrics(response: WorkbenchRiskDrawdownResponse) {
  const summary = response.payload?.periods[0]?.summary;
  if (!summary) {
    return [];
  }
  return [
    {
      key: "max_drawdown",
      label: "Max Drawdown",
      value: formatDrawdownPercent(summary.max_drawdown),
      support: buildDrawdownDateRange(summary),
      state: resolveModuleState(response.state),
    },
    {
      key: "time_under_water_days",
      label: "Time Under Water",
      value: formatInteger(summary.time_under_water_days),
      support: "Business days below prior peak",
      state: resolveModuleState(response.state),
    },
    {
      key: "ulcer_index",
      label: "Ulcer Index",
      value: formatDrawdownPercent(summary.ulcer_index),
      support: "Path severity across underwater observations",
      state: resolveModuleState(response.state),
    },
    {
      key: "drawdown_at_risk_95",
      label: "DaR 95",
      value: formatDrawdownPercent(summary.drawdown_at_risk_95),
      support: "Episode-tail drawdown threshold",
      state: resolveModuleState(response.state),
    },
    {
      key: "conditional_drawdown_at_risk_95",
      label: "CDaR 95",
      value: formatDrawdownPercent(summary.conditional_drawdown_at_risk_95),
      support: "Average of worst drawdown tail",
      state: resolveModuleState(response.state),
    },
  ];
}

function mapDrawdownExecutiveSummary(
  response: WorkbenchRiskDrawdownResponse
): PerformanceRiskExecutiveSummary | null {
  const period = response.payload?.periods[0];
  const summary = period?.summary;
  if (!period || !summary) {
    return null;
  }
  const relative = period.relative_to_benchmark;
  const hasPortfolioDrawdown = typeof summary.max_drawdown === "number" && summary.max_drawdown < 0;
  const hasRelativeDrawdown = typeof relative?.max_drawdown === "number" && relative.max_drawdown < 0;

  return {
    heading: "Business reading",
    headline: hasPortfolioDrawdown
      ? `Realized drawdown reached ${formatDrawdownPercent(summary.max_drawdown)} over the selected window.`
      : hasRelativeDrawdown
        ? "Absolute drawdown remained contained, but benchmark-relative drawdown is visible."
        : "No realized drawdown was recorded in the selected window.",
    detail: hasRelativeDrawdown
      ? `Benchmark-relative drawdown reached ${formatDrawdownPercent(relative?.max_drawdown)} and remained underwater for ${formatInteger(relative?.time_under_water_days)} business days.`
      : `Time under water was ${formatInteger(summary.time_under_water_days)} business days and the ulcer index was ${formatDrawdownPercent(summary.ulcer_index)}.`,
    actionCue: hasPortfolioDrawdown || hasRelativeDrawdown
      ? "Review the largest adverse interval and confirm whether recovery has been completed."
      : "Use benchmark-relative drawdown and episode evidence for any deeper stress review.",
  };
}

function mapDrawdownContextRows(
  response: WorkbenchRiskDrawdownResponse
): PerformanceRiskContextRow[] {
  const period = response.payload?.periods[0];
  const analysisContext = response.payload?.analysis_context;
  if (!period) {
    return [];
  }
  return [
    {
      key: "portfolio_observations",
      label: "Portfolio observations",
      value: formatInteger(period.portfolio_observation_count),
      support: "Return observations used for drawdown analysis",
    },
    {
      key: "benchmark_relative_review",
      label: "Benchmark-relative review",
      value: formatEnumLabel(period.relative_to_benchmark_context?.reason) ?? "Not requested",
      support:
        period.relative_to_benchmark_context?.applied
          ? `${formatInteger(period.relative_to_benchmark_context.aligned_observation_count)} aligned observations`
          : "Benchmark-relative drawdown not applied",
    },
    {
      key: "duration_unit",
      label: "Duration unit",
      value: formatEnumLabel(analysisContext?.duration_unit) ?? "Business Days",
      support: "Drawdown duration convention",
    },
  ];
}

function mapDrawdownEpisodes(response: WorkbenchRiskDrawdownResponse) {
  const episodes = response.payload?.periods[0]?.episodes ?? [];
  return episodes.map((episode) => ({
    key: episode.episode_id,
    episode: episode.episode_id.toUpperCase(),
    depth: formatDrawdownPercent(episode.depth),
    peakDate: formatDateValue(episode.peak_date),
    troughDate: formatDateValue(episode.trough_date),
    recoveryDate: episode.recovery_date ? formatDateValue(episode.recovery_date) : "Open",
    totalDays: formatInteger(episode.total_days),
    status: episode.is_recovered ? "Recovered" : "Open",
  }));
}

function mapRelativeDrawdownMetric(response: WorkbenchRiskDrawdownResponse) {
  const relative = response.payload?.periods[0]?.relative_to_benchmark;
  const supportability = response.supportability.find(
    (item) => item.key === "benchmark_relative_drawdown"
  );
  if (!relative && !supportability) {
    return null;
  }
  return {
    label: "Relative Max Drawdown",
    value: relative ? formatDrawdownPercent(relative.max_drawdown) : "N/A",
    support:
      supportability?.reason ??
      (relative
        ? `${formatDateValue(relative.max_drawdown_peak_date ?? "")} to ${formatDateValue(
            relative.max_drawdown_trough_date ?? ""
          )}`
        : "Benchmark-relative drawdown not available."),
    state: resolveMetricState(supportability?.state ?? "unavailable"),
  };
}

function mapUnderwaterSeries(response: WorkbenchRiskDrawdownResponse | null) {
  const points = response?.payload?.periods[0]?.underwater_series ?? [];
  return points.map((point) => ({
    key: `${point.date}-${point.drawdown}`,
    date: formatDateValue(point.date),
    drawdown: formatDrawdownPercent(point.drawdown),
  }));
}

function resolveUnderwaterDetailState({
  drawdown,
  drawdownDetail,
  isDrawdownDetailLoading,
}: {
  drawdown: WorkbenchRiskDrawdownResponse;
  drawdownDetail: WorkbenchRiskDrawdownResponse | null;
  isDrawdownDetailLoading: boolean;
}): "idle" | "loading" | "ready" | "unavailable" {
  if (isDrawdownDetailLoading) {
    return "loading";
  }
  if (drawdownDetail?.payload?.periods[0]?.underwater_series?.length) {
    return "ready";
  }
  if (drawdownDetail?.state === "unavailable") {
    return "unavailable";
  }
  const supportability = drawdown.supportability.find((item) => item.key === "underwater_series");
  return supportability?.state === "unavailable" ? "unavailable" : "idle";
}

function mapRollingWindows(
  rolling: WorkbenchRiskRollingResponse,
  rollingDetail: WorkbenchRiskRollingResponse | null
) {
  const summaryWindows = rolling.payload?.periods[0]?.window_results ?? [];
  const detailWindows = new Map(
    (rollingDetail?.payload?.periods[0]?.window_results ?? []).map((window) => [
      window.window_length,
      window,
    ])
  );

  return summaryWindows.map((window) => {
    const detailWindow = detailWindows.get(window.window_length) ?? null;
    const metricKeys = Array.from(
      new Set([
        ...Object.keys(window.metric_summaries),
        ...Object.keys(detailWindow?.metric_summaries ?? {}),
      ])
    );
    return {
      key: String(window.window_length),
      label: buildRollingWindowLabel(window.window_length),
      headlineMetrics: metricKeys.map((metricKey) => {
        const summary = window.metric_summaries[metricKey];
        return {
          key: `${window.window_length}-${metricKey}`,
          label: resolveRollingMetricLabel(metricKey),
          value: formatRollingMetricSummaryValue(metricKey, summary?.latest ?? null),
          support: buildRollingMetricSupport(metricKey, summary),
          state: summary ? ("ready" as PerformanceRiskState) : ("unavailable" as PerformanceRiskState),
        };
      }),
      summaryRows: metricKeys.map((metricKey) => {
        const summary = window.metric_summaries[metricKey];
        return {
          key: `${window.window_length}-${metricKey}`,
          metric: resolveRollingMetricLabel(metricKey),
          latest: formatRollingMetricSummaryValue(metricKey, summary?.latest ?? null),
          average: formatRollingMetricSummaryValue(metricKey, summary?.average ?? null),
          p05: formatRollingMetricSummaryValue(metricKey, summary?.p05 ?? null),
          p95: formatRollingMetricSummaryValue(metricKey, summary?.p95 ?? null),
          support: buildRollingMetricSupport(metricKey, summary),
        };
      }),
      seriesRows: mapRollingSeriesRows(detailWindow?.metric_series ?? []),
      seriesMetricKeys: metricKeys,
    };
  });
}

function resolveRollingDetailState({
  rolling,
  rollingDetail,
  isRollingDetailLoading,
}: {
  rolling: WorkbenchRiskRollingResponse;
  rollingDetail: WorkbenchRiskRollingResponse | null;
  isRollingDetailLoading: boolean;
}): "idle" | "loading" | "ready" | "unavailable" {
  if (isRollingDetailLoading) {
    return "loading";
  }
  if (
    rollingDetail?.payload?.periods[0]?.window_results?.some(
      (window) => (window.metric_series?.length ?? 0) > 0
    )
  ) {
    return "ready";
  }
  if (rollingDetail?.state === "unavailable") {
    return "unavailable";
  }
  const supportability = rolling.supportability.find((item) => item.key === "rolling_time_series");
  return supportability?.state === "unavailable" ? "unavailable" : "idle";
}

function mapRollingSeriesRows(
  series: RiskRollingPayload["periods"][number]["window_results"][number]["metric_series"]
) {
  return (series ?? []).map((point) => ({
    key: point.date,
    date: formatDateValue(point.date),
    values: Object.fromEntries(
      Object.entries(point.metric_values).map(([metricKey, value]) => [
        metricKey,
        formatRollingMetricSummaryValue(metricKey, value),
      ])
    ),
  }));
}

function buildRollingMetricSupport(
  metricKey: string,
  summary:
    | RiskRollingPayload["periods"][number]["window_results"][number]["metric_summaries"][string]
    | undefined
) {
  if (!summary) {
    return "Metric not returned for this rolling request.";
  }
  return `Avg ${formatRollingMetricSummaryValue(metricKey, summary.average)} • P05 ${formatRollingMetricSummaryValue(metricKey, summary.p05)} • P95 ${formatRollingMetricSummaryValue(metricKey, summary.p95)}`;
}

function buildRollingWindowLabel(windowLength: number) {
  return `${windowLength}D`;
}

function resolveRollingMetricLabel(metricKey: string) {
  switch (metricKey) {
    case "ROLLING_VOLATILITY":
      return "Volatility";
    case "ROLLING_MAX_DRAWDOWN":
      return "Max Drawdown";
    case "ROLLING_SHARPE":
      return "Sharpe";
    case "ROLLING_BETA":
      return "Beta";
    case "ROLLING_TRACKING_ERROR":
      return "Tracking Error";
    case "ROLLING_INFORMATION_RATIO":
      return "Information Ratio";
    default:
      return metricKey.replaceAll("_", " ");
  }
}

function formatRiskMetric(metric: WorkbenchRiskMetric) {
  if (typeof metric.value !== "number") {
    return "N/A";
  }
  if (["VOLATILITY", "TRACKING_ERROR", "VAR"].includes(metric.key)) {
    return formatPercent(metric.value);
  }
  return formatNumber(metric.value, { maximumFractionDigits: 2 });
}

function formatDrawdownPercent(value: number | null | undefined) {
  if (typeof value !== "number") {
    return "N/A";
  }
  return formatPercent(value * 100);
}

function formatRiskPercentValue(
  value: number | null | undefined,
  {
    nullDisplay = "N/A",
    minimumFractionDigits = 2,
    maximumFractionDigits = minimumFractionDigits,
  }: {
    nullDisplay?: string;
    minimumFractionDigits?: number;
    maximumFractionDigits?: number;
  } = {}
) {
  if (typeof value !== "number") {
    return nullDisplay;
  }
  const normalizedValue = Math.abs(value) <= 1 ? value * 100 : value;
  return formatPercent(normalizedValue, {
    nullDisplay,
    minimumFractionDigits,
    maximumFractionDigits,
  });
}

function mapRollingExecutiveSummary(
  response: WorkbenchRiskRollingResponse
): PerformanceRiskExecutiveSummary | null {
  const period = response.payload?.periods[0];
  if (!period) {
    return null;
  }
  const firstWindow = period.window_results[0];
  const volatility = firstWindow?.metric_summaries.ROLLING_VOLATILITY;
  const trackingError = firstWindow?.metric_summaries.ROLLING_TRACKING_ERROR;
  const riskFreeApplied = period.risk_free_context?.reason === "APPLIED";

  return {
    heading: "Business reading",
    headline:
      typeof volatility?.latest === "number"
        ? `Rolling volatility is ${formatRollingMetricSummaryValue("ROLLING_VOLATILITY", volatility.latest)} on the shortest emitted window.`
        : "Rolling risk diagnostics are only partially available for the selected request.",
    detail:
      typeof trackingError?.latest === "number"
        ? `Tracking error is ${formatRollingMetricSummaryValue("ROLLING_TRACKING_ERROR", trackingError.latest)}, and ${riskFreeApplied ? "risk-free aligned measures are available." : "risk-free aligned measures should be qualified."}`
        : riskFreeApplied
          ? "Risk-free aligned measures are available across the emitted windows."
          : "Risk-free aligned measures should be qualified for this request.",
    actionCue: "Use shorter windows for current behaviour and longer windows for stability review.",
  };
}

function mapRollingContextRows(
  response: WorkbenchRiskRollingResponse
): PerformanceRiskContextRow[] {
  const period = response.payload?.periods[0];
  const requestContext = response.payload?.request_context;
  if (!period) {
    return [];
  }
  return [
    {
      key: "window_coverage",
      label: "Window coverage",
      value: `${formatInteger(period.window_count_emitted)} / ${formatInteger(period.window_count_requested)}`,
      support: `${(period.window_lengths_emitted ?? []).join(", ")} windows emitted`,
    },
    {
      key: "benchmark_dependency",
      label: "Benchmark dependency",
      value: formatEnumLabel(period.benchmark_context?.reason) ?? "Not requested",
      support:
        period.benchmark_context?.requested
          ? `${formatInteger(period.aligned_benchmark_series_count)} aligned benchmark observations`
          : "Benchmark-relative rolling metrics not requested",
    },
    {
      key: "risk_free_dependency",
      label: "Risk-free dependency",
      value: formatEnumLabel(period.risk_free_context?.reason) ?? "Not requested",
      support:
        period.risk_free_context?.requested
          ? `${formatInteger(period.aligned_risk_free_series_count)} aligned risk-free observations`
          : "Risk-free rolling metrics not requested",
    },
    {
      key: "rolling_methodology",
      label: "Methodology",
      value: `${formatInteger(requestContext?.annualization_basis)} / ${formatEnumLabel(requestContext?.min_observations_policy) ?? "Strict"}`,
      support: `${formatEnumLabel(requestContext?.alignment_policy) ?? "Inner Join"} alignment`,
    },
  ];
}

function resolveConcentrationIndicatorTone(
  supportability: WorkbenchRiskConcentrationResponse["supportability"]
) {
  const issuerCoverage = supportability.find((item) => item.key === "issuer_enrichment");
  if (issuerCoverage?.state === "partial" || issuerCoverage?.state === "blocked") {
    return "warn" as const;
  }
  if (issuerCoverage?.state === "unavailable") {
    return "danger" as const;
  }
  return "neutral" as const;
}

function resolveWeightIndicatorTone(value: number | null | undefined) {
  if (typeof value !== "number") {
    return "neutral" as const;
  }
  if (value >= 0.25) {
    return "danger" as const;
  }
  if (value >= 0.15) {
    return "warn" as const;
  }
  return "neutral" as const;
}

function formatEnumLabel(value: string | null | undefined) {
  if (!value) {
    return null;
  }
  return value
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function formatInteger(value: number | null | undefined) {
  if (typeof value !== "number") {
    return "N/A";
  }
  return formatNumber(value, { maximumFractionDigits: 0 });
}

function formatRollingMetricSummaryValue(metricKey: string, value: number | null | undefined) {
  if (typeof value !== "number") {
    return "N/A";
  }
  if (
    metricKey === "ROLLING_VOLATILITY" ||
    metricKey === "ROLLING_MAX_DRAWDOWN" ||
    metricKey === "ROLLING_TRACKING_ERROR"
  ) {
    return formatPercent(value * 100);
  }
  return formatNumber(value, { maximumFractionDigits: 2 });
}

function buildFixtureRollingMetricSummaries({
  windowLength,
  includeBenchmarkMetrics,
}: {
  windowLength: number;
  includeBenchmarkMetrics: boolean;
}) {
  const volatilityBase = 0.109 + windowLength / 5000;
  const maxDrawdownBase = -0.017 - windowLength / 5000;
  const summaries: Record<
    string,
    {
      latest: number | null;
      average: number | null;
      minimum: number | null;
      maximum: number | null;
      p05: number | null;
      p50: number | null;
      p95: number | null;
    }
  > = {
    ROLLING_VOLATILITY: {
      latest: volatilityBase,
      average: volatilityBase - 0.008,
      minimum: volatilityBase - 0.026,
      maximum: volatilityBase + 0.021,
      p05: volatilityBase - 0.02,
      p50: volatilityBase - 0.004,
      p95: volatilityBase + 0.018,
    },
    ROLLING_MAX_DRAWDOWN: {
      latest: maxDrawdownBase,
      average: maxDrawdownBase + 0.005,
      minimum: maxDrawdownBase - 0.02,
      maximum: maxDrawdownBase + 0.011,
      p05: maxDrawdownBase - 0.016,
      p50: maxDrawdownBase + 0.003,
      p95: maxDrawdownBase + 0.009,
    },
    ROLLING_SHARPE: {
      latest: 0.74 + windowLength / 1000,
      average: 0.68 + windowLength / 1000,
      minimum: 0.31 + windowLength / 1200,
      maximum: 1.14 + windowLength / 900,
      p05: 0.42 + windowLength / 1200,
      p50: 0.71 + windowLength / 1000,
      p95: 1.02 + windowLength / 900,
    },
  };
  if (includeBenchmarkMetrics) {
    summaries.ROLLING_BETA = {
      latest: 0.91 + windowLength / 5000,
      average: 0.88 + windowLength / 5000,
      minimum: 0.74,
      maximum: 1.08,
      p05: 0.78,
      p50: 0.89,
      p95: 1.02,
    };
    summaries.ROLLING_TRACKING_ERROR = {
      latest: 0.024 + windowLength / 10000,
      average: 0.022 + windowLength / 10000,
      minimum: 0.015,
      maximum: 0.034,
      p05: 0.017,
      p50: 0.022,
      p95: 0.031,
    };
    summaries.ROLLING_INFORMATION_RATIO = {
      latest: 0.29 + windowLength / 2000,
      average: 0.24 + windowLength / 2000,
      minimum: -0.08,
      maximum: 0.61,
      p05: 0.01,
      p50: 0.27,
      p95: 0.55,
    };
  }
  return summaries;
}

function buildFixtureRollingSeries({
  windowLength,
  includeBenchmarkMetrics,
  offset,
}: {
  windowLength: number;
  includeBenchmarkMetrics: boolean;
  offset: number;
}) {
  return [
    {
      date: `2026-03-${String(15 + offset).padStart(2, "0")}`,
      metric_values: buildFixtureRollingSeriesMetricValues({
        windowLength,
        includeBenchmarkMetrics,
        volatility: 0.112 + windowLength / 5200,
        maxDrawdown: -0.018 - windowLength / 5200,
      }),
    },
    {
      date: `2026-03-${String(22 + offset).padStart(2, "0")}`,
      metric_values: buildFixtureRollingSeriesMetricValues({
        windowLength,
        includeBenchmarkMetrics,
        volatility: 0.118 + windowLength / 5200,
        maxDrawdown: -0.022 - windowLength / 5200,
      }),
    },
    {
      date: `2026-03-${String(29 + offset).padStart(2, "0")}`,
      metric_values: buildFixtureRollingSeriesMetricValues({
        windowLength,
        includeBenchmarkMetrics,
        volatility: 0.121 + windowLength / 5200,
        maxDrawdown: -0.028 - windowLength / 5200,
      }),
    },
  ];
}

function buildFixtureRollingSeriesMetricValues({
  windowLength,
  includeBenchmarkMetrics,
  volatility,
  maxDrawdown,
}: {
  windowLength: number;
  includeBenchmarkMetrics: boolean;
  volatility: number;
  maxDrawdown: number;
}) {
  const values: Record<string, number> = {
    ROLLING_VOLATILITY: volatility,
    ROLLING_MAX_DRAWDOWN: maxDrawdown,
    ROLLING_SHARPE: 0.67 + windowLength / 1100,
  };
  if (includeBenchmarkMetrics) {
    values.ROLLING_BETA = 0.9 + windowLength / 5200;
    values.ROLLING_TRACKING_ERROR = 0.023 + windowLength / 11000;
    values.ROLLING_INFORMATION_RATIO = 0.25 + windowLength / 2200;
  }
  return values;
}

function buildDrawdownDateRange(summary: WorkbenchRiskDrawdownSummary) {
  if (!summary.max_drawdown_peak_date || !summary.max_drawdown_trough_date) {
    return "Peak/trough timing unavailable";
  }
  return `${formatDateValue(summary.max_drawdown_peak_date)} to ${formatDateValue(
    summary.max_drawdown_trough_date
  )}`;
}

function buildBreadthSummary(topNWeight: number) {
  if (topNWeight >= 0.9) {
    return "limited diversification breadth.";
  }
  if (topNWeight >= 0.75) {
    return "elevated breadth concentration.";
  }
  if (topNWeight >= 0.6) {
    return "the largest holdings still account for a meaningful share of the book.";
  }
  return "diversification is broader across the portfolio.";
}

function resolveConcentrationBand(value: number) {
  if (value < 1000) {
    return "Diversified";
  }
  if (value < 1500) {
    return "Moderate";
  }
  if (value < 2000) {
    return "Elevated";
  }
  return "High";
}

function resolveConcentrationIndexMarker(value: number) {
  return Math.max(0, Math.min(100, (value / 2500) * 100));
}

function buildConcentrationPostureModel(response: WorkbenchRiskConcentrationResponse) {
  const payload = response.payload;
  if (!payload) {
    return {
      state: "partial" as const,
      label: "Partial Coverage",
      principalDriver: "both" as const,
      summary: "Concentration is available only partially for the current selection.",
    };
  }
  const topPosition = payload.single_position_concentration.top_position_weight_current;
  const topIssuer = payload.issuer_concentration.top_issuer_weight_current;
  const topTen = payload.single_position_concentration.top_n_cumulative_weight_current;
  const coverage = payload.issuer_concentration.coverage_ratio_current;
  const portfolioBand = resolveConcentrationBand(payload.portfolio_concentration.hhi_current);
  const issuerBand = resolveConcentrationBand(payload.issuer_concentration.hhi_current);
  const principalDriver =
    topIssuer - topPosition >= 0.03
      ? ("issuer" as const)
      : topPosition - topIssuer >= 0.03
        ? ("position" as const)
        : ("both" as const);

  if (coverage < 0.99) {
    return {
      state: "partial" as const,
      label: "Partial",
      principalDriver,
      summary:
        "Concentration is visible, but issuer interpretation is only partial.",
    };
  }
  if (topTen >= 0.9 || topPosition >= 0.2 || topIssuer >= 0.25) {
    return {
      state: "high" as const,
      label: "High",
      principalDriver,
      summary: "Concentration is high and is driven by a small number of holdings.",
    };
  }
  if (topTen >= 0.75 || topPosition >= 0.15 || topIssuer >= 0.2) {
    return {
      state: "elevated" as const,
      label: "Elevated",
      principalDriver,
      summary:
        portfolioBand === "Elevated" && issuerBand === "Elevated"
          ? "Both position and issuer concentration are materially elevated."
          : "Concentration is elevated and is driven by a limited number of holdings.",
    };
  }
  if (topTen >= 0.6) {
    return {
      state: "moderate" as const,
      label: "Moderate",
      principalDriver,
      summary: "Concentration is moderate and should be reviewed against diversification expectations.",
    };
  }
  return {
    state: "acceptable" as const,
    label: "Acceptable",
    principalDriver,
    summary: "Concentration appears acceptable for the current selection.",
  };
}

function resolveModuleState(state: WorkbenchRiskModuleState): PerformanceRiskState {
  if (state === "ready" || state === "partial" || state === "unavailable") {
    return state;
  }
  return "unavailable";
}

function resolveMetricState(state: WorkbenchRiskModuleState): PerformanceRiskState {
  return resolveModuleState(state);
}

function mapSupportabilityGroup(
  group: "summary" | "concentration" | "attribution" | "drawdown" | "rolling",
  items: PerformanceRiskViewModel["supportability"]
) {
  return items.map((item) => ({
    ...item,
    key: `${group}:${item.key}`,
  }));
}

function mapAttributionControls(response: WorkbenchRiskAttributionResponse | null) {
  if (!response?.payload) {
    return null;
  }
  return {
    selectedAttributionType: response.payload.controls.selected_attribution_type,
    selectedGroupingDimension: response.payload.controls.selected_grouping_dimension,
    attributionTypes: response.payload.controls.attribution_types.map((option) => ({
      key: option.key,
      label: option.label,
      disabled: option.state !== "ready",
      reason: option.reason,
    })),
    groupingDimensions: response.payload.controls.grouping_dimensions.map((option) => ({
      key: option.key,
      label: option.label,
      disabled: option.state === "blocked" || option.state === "unavailable",
      reason: option.reason,
    })),
  };
}

function mapAttributionRows(response: WorkbenchRiskAttributionResponse | null) {
  const selectedSet = response?.payload?.periods[0]?.attribution_sets[0];
  if (!selectedSet) {
    return [];
  }
  return selectedSet.contributors.map((contributor) => ({
    key: contributor.group_key,
    group: contributor.group_label,
    avgWeight: formatRiskPercentValue(contributor.weight_average),
    marginalContribution: formatRiskPercentValue(contributor.marginal_contribution),
    componentContribution: formatRiskPercentValue(contributor.component_contribution),
    contributionShare: formatRiskPercentValue(contributor.percent_contribution),
  }));
}

function mapAttributionTotals(response: WorkbenchRiskAttributionResponse | null) {
  const selectedSet = response?.payload?.periods[0]?.attribution_sets[0];
  if (!selectedSet) {
    return null;
  }
  return {
    metric: `${selectedSet.attribution_type.replaceAll("_", " ")} • ${selectedSet.metric.replaceAll("_", " ")}`,
    totalValue: formatRiskPercentValue(selectedSet.total_value),
    reconciledSum: formatRiskPercentValue(selectedSet.reconciled_sum),
    residual: formatRiskPercentValue(selectedSet.residual),
    support: selectedSet.grouping_dimension.replaceAll("_", " "),
  };
}

function mapAttributionExecutiveSummary(
  response: WorkbenchRiskAttributionResponse | null
): PerformanceRiskExecutiveSummary | null {
  const selectedSet = response?.payload?.periods[0]?.attribution_sets[0];
  if (!selectedSet) {
    return null;
  }
  const topContributor = [...selectedSet.contributors]
    .sort(
      (left, right) =>
        Math.abs(right.component_contribution ?? 0) - Math.abs(left.component_contribution ?? 0)
    )[0];
  return {
    heading: "Business reading",
    headline: `${formatEnumLabel(selectedSet.attribution_type) ?? selectedSet.attribution_type} attribution is available by ${formatEnumLabel(selectedSet.grouping_dimension) ?? selectedSet.grouping_dimension}.`,
    detail: topContributor
      ? `${topContributor.group_label} is the largest visible contributor with component effect ${formatRiskPercentValue(topContributor.component_contribution)}. Residual remains ${formatRiskPercentValue(selectedSet.residual)}.`
      : "No contributor rows were returned for the selected attribution controls.",
    actionCue:
      selectedSet.attribution_type === "ACTIVE_RISK"
        ? "Review the largest benchmark-relative contributors before using active-risk decomposition externally."
        : "Review the largest contributors before presenting total-risk decomposition externally.",
  };
}

function mapAttributionMethodologyRows(
  response: WorkbenchRiskAttributionResponse | null
): PerformanceRiskContextRow[] {
  const methodologyContext = response?.payload?.methodology_context;
  if (!methodologyContext) {
    return [];
  }
  return [
    {
      key: "covariance_method",
      label: "Covariance method",
      value: formatEnumLabel(methodologyContext.covariance_method) ?? "N/A",
      support: "Attribution covariance convention",
    },
    {
      key: "annualization_basis",
      label: "Annualization basis",
      value: formatInteger(methodologyContext.annualization_basis),
      support: "Periods used for annualized attribution metrics",
    },
    {
      key: "requested_metric",
      label: "Requested metric",
      value: methodologyContext.requested_metrics?.join(", ") ?? "N/A",
      support: methodologyContext.requested_grouping_dimensions?.join(", ") ?? "No grouping selected",
    },
    {
      key: "active_risk_support",
      label: "Active-risk support",
      value:
        methodologyContext.stateful_active_risk_supported_grouping_dimensions?.join(", ") ?? "N/A",
      support:
        methodologyContext.stateful_active_risk_gate_reason ??
        "Supported grouping dimensions for active-risk decomposition",
    },
  ];
}

function resolveAttributionState({
  attribution,
  isAttributionLoading,
}: {
  attribution: WorkbenchRiskAttributionResponse | null;
  isAttributionLoading: boolean;
}): "idle" | "loading" | "ready" | "blocked" | "unavailable" {
  if (isAttributionLoading) {
    return "loading";
  }
  if (!attribution) {
    return "idle";
  }
  if (attribution.state === "blocked") {
    return "blocked";
  }
  if (attribution.state === "unavailable") {
    return "unavailable";
  }
  return "ready";
}
