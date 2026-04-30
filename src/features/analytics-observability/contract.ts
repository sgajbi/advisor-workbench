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
  "batch_id",
  "report_job_id",
  "session_id",
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

export const ANALYTICS_UI_SEVERITY_LEVELS = [
  "info",
  "warning",
  "action_required",
  "critical",
] as const;

export type AnalyticsUiSeverity = (typeof ANALYTICS_UI_SEVERITY_LEVELS)[number];

export const ANALYTICS_UI_ATTENTION_EVENT_TYPES = [
  "panel_stale",
  "panel_degraded",
  "panel_repeated_failure",
  "source_partial",
  "permission_blocked",
] as const;

export type AnalyticsUiAttentionEventType =
  (typeof ANALYTICS_UI_ATTENTION_EVENT_TYPES)[number];

export const ANALYTICS_UI_AUDIT_EVENT_TYPES = [
  "analytics_read_allowed",
  "analytics_read_denied",
  "protected_diagnostics_lookup",
] as const;

export type AnalyticsUiAuditEventType = (typeof ANALYTICS_UI_AUDIT_EVENT_TYPES)[number];

export const WORKBENCH_ANALYTICS_UI_METRIC_FAMILIES = [
  "lotus_workbench_panel_hydration_duration_seconds",
  "lotus_workbench_panel_state_total",
  "lotus_workbench_api_request_duration_seconds",
  "lotus_analytics_ui_attention_events_total",
] as const;

export type WorkbenchAnalyticsUiMetricFamily =
  (typeof WORKBENCH_ANALYTICS_UI_METRIC_FAMILIES)[number];

export const WORKBENCH_ANALYTICS_UI_BROWSER_EVENTS = [
  "workbench.analytics.panel_hydration",
  "workbench.analytics.panel_state",
  "workbench.analytics.api_request",
  "workbench.analytics.attention",
] as const;

export type WorkbenchAnalyticsUiBrowserEvent =
  (typeof WORKBENCH_ANALYTICS_UI_BROWSER_EVENTS)[number];

export const ANALYTICS_UI_TRACE_ATTRIBUTES = [
  "route",
  "panel",
  "service",
  "operation",
  "state",
  "freshness_bucket",
  "supportability_state",
  "status_class",
  "error_category",
] as const satisfies readonly AnalyticsUiAllowedLabel[];

export const ANALYTICS_UI_ATTENTION_EVENT_ATTRIBUTES = [
  "route",
  "panel",
  "attention_type",
  "severity",
  "state",
  "reason",
  "freshness_bucket",
  "supportability_state",
] as const satisfies readonly AnalyticsUiAllowedLabel[];

export const ANALYTICS_UI_AUDIT_EVENT_ATTRIBUTES = [
  "route",
  "panel",
  "operation",
  "state",
  "reason",
  "status_class",
  "region",
  "environment",
] as const satisfies readonly AnalyticsUiAllowedLabel[];

const ALLOWED_LABEL_SET = new Set<string>(ANALYTICS_UI_ALLOWED_LABELS);
const FORBIDDEN_FIELD_SET = new Set<string>(ANALYTICS_UI_FORBIDDEN_FIELDS);
const STATE_SET = new Set<string>(ANALYTICS_UI_STATE_VOCABULARY);

export function isAnalyticsUiState(value: string): value is AnalyticsUiState {
  return STATE_SET.has(value);
}

export function assertAnalyticsUiLabels(labels: Record<string, unknown>): void {
  assertAnalyticsUiAttributeNames(Object.keys(labels));
}

export function assertAnalyticsUiAttributeNames(attributeNames: readonly string[]): void {
  const forbiddenAttributes = attributeNames.filter((attribute) =>
    FORBIDDEN_FIELD_SET.has(attribute)
  );
  if (forbiddenAttributes.length > 0) {
    throw new Error(
      `Analytics UI attributes include forbidden field(s): ${forbiddenAttributes.join(", ")}`
    );
  }

  const unsupportedAttributes = attributeNames.filter(
    (attribute) => !ALLOWED_LABEL_SET.has(attribute)
  );
  if (unsupportedAttributes.length > 0) {
    throw new Error(
      `Analytics UI attributes include unsupported field(s): ${unsupportedAttributes.join(", ")}`
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
