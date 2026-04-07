import type {
  WorkbenchPerformanceWorkspace,
  WorkbenchRiskConcentrationResponse,
  WorkbenchRiskDrawdownResponse,
  WorkbenchRiskDrawdownSummary,
  WorkbenchRiskMetric,
  WorkbenchRiskModuleState,
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

export type PerformanceRiskViewModel = {
  state: PerformanceRiskState;
  title: string;
  synopsis: string;
  contextItems: Array<{ label: string; value: string }>;
  snapshotMetrics: Array<{
    key: string;
    label: string;
    value: string;
    support: string;
    state: PerformanceRiskState;
  }>;
  concentrationMetrics: Array<{
    key: string;
    label: string;
    value: string;
    support: string;
  }>;
  drawdownHeadlineMetrics: Array<{
    key: string;
    label: string;
    value: string;
    support: string;
    state: PerformanceRiskState;
  }>;
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
  supportability: Array<{
    key: string;
    label: string;
    state: WorkbenchRiskModuleState;
    reason?: string | null;
  }>;
  provenance: Array<{ label: string; value: string }>;
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
  riskDrawdown?: WorkbenchRiskDrawdownResponse | null;
  riskDrawdownDetail?: WorkbenchRiskDrawdownResponse | null;
  isDrawdownDetailLoading?: boolean;
};

export function buildPerformanceRiskViewModel({
  workspace,
  period,
  detailBasis,
  isDetailsPending = false,
  riskSummary,
  riskConcentration,
  riskDrawdown,
  riskDrawdownDetail,
  isDrawdownDetailLoading = false,
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
  const drawdown =
    riskDrawdown ??
    buildUnavailableRiskDrawdown({
      workspace,
      period,
      detailBasis,
      detail: "Risk drawdown is not available from the Gateway BFF.",
      includeUnderwaterSeries: false,
    });
  const drawdownDetail = riskDrawdownDetail ?? null;

  const supportability = [
    ...mapSupportabilityGroup("summary", summary.supportability),
    ...mapSupportabilityGroup("concentration", concentration.supportability),
    ...mapSupportabilityGroup("drawdown", drawdown.supportability),
  ];
  const hasPayload = Boolean(
    summary.payload?.periods.length || concentration.payload || drawdown.payload?.periods.length
  );
  const state = !hasPayload
    ? "unavailable"
    : summary.state === "ready" && concentration.state === "ready"
      ? "ready"
      : "partial";

  return {
    state,
    title: state === "unavailable" ? "Risk unavailable" : "Stateful Risk",
    synopsis:
      state === "unavailable"
        ? "Stateful risk is not available for the selected portfolio context."
        : state === "partial"
        ? "Risk is available with coverage notes. Review issuer and benchmark supportability before external use."
        : "Stateful portfolio risk is available for the selected performance context.",
    contextItems: buildContextItems(workspace, period, detailBasis, summary.as_of_date),
    snapshotMetrics: mapSnapshotMetrics(summary),
    concentrationMetrics: mapConcentrationMetrics(concentration),
    drawdownHeadlineMetrics: mapDrawdownHeadlineMetrics(drawdown),
    drawdownEpisodes: mapDrawdownEpisodes(drawdown),
    drawdownRelativeMetric: mapRelativeDrawdownMetric(drawdown),
    underwaterSeries: mapUnderwaterSeries(drawdownDetail),
    underwaterDetailState: resolveUnderwaterDetailState({
      drawdown,
      drawdownDetail,
      isDrawdownDetailLoading,
    }),
    supportability: supportability.map((item) => ({
      key: item.key,
      label: item.label,
      state: item.state,
      reason: item.reason,
    })),
    provenance: [
      { label: "Contract", value: summary.contract_version },
      { label: "Source", value: "lotus-risk via lotus-gateway" },
      { label: "Input Mode", value: "Stateful only" },
      { label: "Cache", value: summary.metadata.cache_status ?? "miss" },
      { label: "Generated", value: formatDateValue(summary.metadata.generated_at) },
    ],
    warnings: [...summary.warnings, ...concentration.warnings, ...drawdown.warnings],
    partialFailures: [
      ...summary.partial_failures.map((failure) => failure.detail),
      ...concentration.partial_failures.map((failure) => failure.detail),
      ...drawdown.partial_failures.map((failure) => failure.detail),
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
      risk_proxy: { hhi_current: 1260, hhi_proposed: 1260, hhi_delta: 0 },
      single_position_concentration: {
        top_position_weight_current: 0.184,
        top_position_weight_proposed: 0.184,
        top_position_weight_delta: 0,
        top_n_cumulative_weight_current: 0.528,
        top_n_cumulative_weight_proposed: 0.528,
        top_n_cumulative_weight_delta: 0,
        top_n: 10,
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
        note: "Issuer enrichment is partial in the current stateful risk contract.",
      },
      valuation_context: { reporting_currency: workspace.portfolio.base_currency },
      risk_metadata: { fixture: true },
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
    snapshotMetrics: [],
    concentrationMetrics: [],
    drawdownHeadlineMetrics: [],
    drawdownEpisodes: [],
    drawdownRelativeMetric: null,
    underwaterSeries: [],
    underwaterDetailState: "idle",
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
    provenance: [
      { label: "Contract", value: "risk-workspace.v1" },
      { label: "Input Mode", value: "Stateful only" },
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

function mapConcentrationMetrics(response: WorkbenchRiskConcentrationResponse) {
  const payload = response.payload;
  if (!payload) {
    return [];
  }
  return [
    {
      key: "hhi_current",
      label: "HHI",
      value: formatNumber(payload.risk_proxy.hhi_current, { maximumFractionDigits: 0 }),
      support: "Current portfolio concentration",
    },
    {
      key: "top_position_weight",
      label: "Top Position",
      value: formatPercent(payload.single_position_concentration.top_position_weight_current * 100),
      support: "Largest single-position weight",
    },
    {
      key: "top_issuer_weight",
      label: "Top Issuer",
      value: formatPercent(payload.issuer_concentration.top_issuer_weight_current * 100),
      support: "Largest issuer exposure",
    },
    {
      key: "issuer_coverage",
      label: "Issuer Coverage",
      value: `${payload.issuer_concentration.covered_position_count_current}/${payload.issuer_concentration.total_position_count_current}`,
      support: payload.issuer_concentration.note ?? "Issuer enrichment coverage",
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

function formatInteger(value: number | null | undefined) {
  if (typeof value !== "number") {
    return "N/A";
  }
  return formatNumber(value, { maximumFractionDigits: 0 });
}

function buildDrawdownDateRange(summary: WorkbenchRiskDrawdownSummary) {
  if (!summary.max_drawdown_peak_date || !summary.max_drawdown_trough_date) {
    return "Peak/trough timing unavailable";
  }
  return `${formatDateValue(summary.max_drawdown_peak_date)} to ${formatDateValue(
    summary.max_drawdown_trough_date
  )}`;
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
  group: "summary" | "concentration" | "drawdown",
  items: PerformanceRiskViewModel["supportability"]
) {
  return items.map((item) => ({
    ...item,
    key: `${group}:${item.key}`,
  }));
}
