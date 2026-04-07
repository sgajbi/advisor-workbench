import type { WorkbenchPerformanceWorkspace } from "@/features/workbench/types";
import {
  formatDateValue,
  formatNumber,
  formatPercent,
} from "@/design-system/utils/financial-formatters";

type RiskModuleState = "ready" | "partial" | "unavailable" | "blocked";
type RiskSupportabilityState = RiskModuleState;

export type WorkbenchRiskSupportabilityItem = {
  key: string;
  label: string;
  state: RiskSupportabilityState;
  reason?: string | null;
  source_service?: string | null;
};

export type WorkbenchRiskMetric = {
  key: string;
  label: string;
  value: number | null;
  state: RiskModuleState;
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
  state: RiskModuleState;
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
  partial_failures: Array<{
    source_service: string;
    error_code: string;
    detail: string;
  }>;
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
  state: RiskModuleState;
  payload: {
    risk_proxy: {
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
      note?: string | null;
    };
    valuation_context?: Record<string, unknown> | null;
    risk_metadata?: Record<string, unknown> | null;
  } | null;
  supportability: WorkbenchRiskSupportabilityItem[];
  warnings: string[];
  partial_failures: Array<{
    source_service: string;
    error_code: string;
    detail: string;
  }>;
  metadata: {
    generated_at: string;
    input_mode: "stateful";
    methodology_version?: string | null;
    cache_status?: "hit" | "miss" | "bypass" | null;
  };
};

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
  supportability: Array<{
    key: string;
    label: string;
    state: RiskSupportabilityState;
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
  unavailable?: boolean;
};

export function buildPerformanceRiskViewModel({
  workspace,
  period,
  detailBasis,
  isDetailsPending = false,
  riskSummary,
  riskConcentration,
  unavailable = false,
}: BuildPerformanceRiskViewModelOptions): PerformanceRiskViewModel {
  if (isDetailsPending) {
    return buildStateViewModel(workspace, period, detailBasis, "loading");
  }
  if (unavailable) {
    return buildStateViewModel(workspace, period, detailBasis, "unavailable");
  }

  const summary = riskSummary ?? buildFixtureRiskSummary(workspace, period, detailBasis);
  const concentration =
    riskConcentration ?? buildFixtureRiskConcentration(workspace, period);
  const supportability = [...summary.supportability, ...concentration.supportability];
  const hasPayload = Boolean(summary.payload?.periods.length || concentration.payload);

  const state = !hasPayload
    ? "empty"
    : summary.state === "unavailable" || concentration.state === "unavailable"
      ? "partial"
      : summary.state === "partial" || concentration.state === "partial"
        ? "partial"
        : "ready";

  return {
    state,
    title: "Stateful Risk",
    synopsis:
      state === "partial"
        ? "Risk is available with coverage notes. Review issuer and benchmark supportability before using the result externally."
        : "Stateful portfolio risk is available for the selected performance context.",
    contextItems: buildContextItems(workspace, period, detailBasis, summary.as_of_date),
    snapshotMetrics: mapSnapshotMetrics(summary),
    concentrationMetrics: mapConcentrationMetrics(concentration),
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
    warnings: [...summary.warnings, ...concentration.warnings],
    partialFailures: [
      ...summary.partial_failures.map((failure) => failure.detail),
      ...concentration.partial_failures.map((failure) => failure.detail),
    ],
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
    supportability: [
      {
        key: "risk_bff",
        label: "Risk BFF",
        state: state === "loading" ? "partial" : "unavailable",
        reason:
          state === "loading"
            ? "Gateway risk contract is being prepared."
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

function buildFixtureRiskSummary(
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
        reason: workspace.benchmark_code ? null : "Benchmark-relative risk requires benchmark context.",
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

function buildFixtureRiskConcentration(
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

function metric(
  key: string,
  label: string,
  value: number | null,
  state: RiskModuleState,
  details?: Record<string, unknown>
): WorkbenchRiskMetric {
  return { key, label, value, state, details };
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

function resolveMetricState(state: RiskModuleState): PerformanceRiskState {
  if (state === "ready" || state === "partial" || state === "unavailable") {
    return state;
  }
  return "unavailable";
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

function formatRiskMetric(metric: WorkbenchRiskMetric) {
  if (typeof metric.value !== "number") {
    return "N/A";
  }
  if (["VOLATILITY", "TRACKING_ERROR", "VAR"].includes(metric.key)) {
    return formatPercent(metric.value);
  }
  return formatNumber(metric.value, { maximumFractionDigits: 2 });
}
