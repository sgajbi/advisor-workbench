export const ANALYTICS_UI_ALLOWED_LABELS = [
  "route",
  "panel",
  "service",
  "operation",
  "state",
  "reason",
  "freshness_bucket",
  "supportability_state",
  "attention_type",
  "severity",
  "status_class",
  "error_category",
  "region",
  "environment",
] as const;

export type AnalyticsUiAllowedLabel = (typeof ANALYTICS_UI_ALLOWED_LABELS)[number];

export const ANALYTICS_UI_FORBIDDEN_FIELDS = [
  "portfolio_id",
  "client_id",
  "client_name",
  "household_id",
  "account_id",
  "instrument_id",
  "holding_id",
  "transaction_id",
  "trace_id",
  "correlation_id",
  "document_id",
  "advisor_id",
  "advisor_behavior",
  "screen_content",
  "request_body",
  "response_body",
  "raw_entitlement_failure",
] as const;

export type AnalyticsUiForbiddenField = (typeof ANALYTICS_UI_FORBIDDEN_FIELDS)[number];

export const ANALYTICS_UI_STATE_VOCABULARY = [
  "loading",
  "ready",
  "empty",
  "partial",
  "stale",
  "degraded",
  "error",
  "permission_blocked",
  "unsupported",
] as const;

export type AnalyticsUiState = (typeof ANALYTICS_UI_STATE_VOCABULARY)[number];

export const WORKBENCH_ANALYTICS_UI_METRIC_FAMILIES = [
  "lotus_workbench_panel_hydration_duration_seconds",
  "lotus_workbench_panel_state_total",
  "lotus_workbench_api_request_duration_seconds",
] as const;

export type WorkbenchAnalyticsUiMetricFamily =
  (typeof WORKBENCH_ANALYTICS_UI_METRIC_FAMILIES)[number];

const ALLOWED_LABEL_SET = new Set<string>(ANALYTICS_UI_ALLOWED_LABELS);
const FORBIDDEN_FIELD_SET = new Set<string>(ANALYTICS_UI_FORBIDDEN_FIELDS);
const STATE_SET = new Set<string>(ANALYTICS_UI_STATE_VOCABULARY);

export function isAnalyticsUiState(value: string): value is AnalyticsUiState {
  return STATE_SET.has(value);
}

export function assertAnalyticsUiLabels(labels: Record<string, unknown>): void {
  const labelNames = Object.keys(labels);
  const forbiddenLabels = labelNames.filter((label) => FORBIDDEN_FIELD_SET.has(label));
  if (forbiddenLabels.length > 0) {
    throw new Error(
      `Analytics UI labels include forbidden field(s): ${forbiddenLabels.join(", ")}`
    );
  }

  const unsupportedLabels = labelNames.filter((label) => !ALLOWED_LABEL_SET.has(label));
  if (unsupportedLabels.length > 0) {
    throw new Error(
      `Analytics UI labels include unsupported field(s): ${unsupportedLabels.join(", ")}`
    );
  }
}

export function buildAnalyticsUiLabels(
  labels: Partial<Record<AnalyticsUiAllowedLabel, string>>
): Partial<Record<AnalyticsUiAllowedLabel, string>> {
  assertAnalyticsUiLabels(labels);
  return Object.fromEntries(
    Object.entries(labels).filter(([, value]) => value !== undefined && value !== "")
  ) as Partial<Record<AnalyticsUiAllowedLabel, string>>;
}
