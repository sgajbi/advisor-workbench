import { describe, expect, it } from "vitest";

import {
  ANALYTICS_UI_ALLOWED_LABELS,
  ANALYTICS_UI_ATTENTION_EVENT_ATTRIBUTES,
  ANALYTICS_UI_ATTENTION_EVENT_TYPES,
  ANALYTICS_UI_AUDIT_EVENT_ATTRIBUTES,
  ANALYTICS_UI_AUDIT_EVENT_TYPES,
  ANALYTICS_UI_FORBIDDEN_FIELDS,
  ANALYTICS_UI_SEVERITY_LEVELS,
  ANALYTICS_UI_STATE_VOCABULARY,
  ANALYTICS_UI_TRACE_ATTRIBUTES,
  WORKBENCH_ANALYTICS_UI_BROWSER_EVENTS,
  WORKBENCH_ANALYTICS_UI_METRIC_FAMILIES,
  assertAnalyticsUiAttributeNames,
  assertAnalyticsUiLabels,
  buildAnalyticsUiLabels,
  isAnalyticsUiState,
} from "../../src/features/analytics-observability/contract";

describe("analytics UI observability contract", () => {
  it("keeps the Workbench-owned metric families explicit and planned-safe", () => {
    expect(WORKBENCH_ANALYTICS_UI_METRIC_FAMILIES).toEqual([
      "lotus_workbench_panel_hydration_duration_seconds",
      "lotus_workbench_panel_state_total",
      "lotus_workbench_api_request_duration_seconds",
    ]);
  });

  it("recognizes only governed analytics UI states", () => {
    expect(ANALYTICS_UI_STATE_VOCABULARY).toContain("permission_blocked");
    expect(isAnalyticsUiState("degraded")).toBe(true);
    expect(isAnalyticsUiState("blocked")).toBe(false);
  });

  it("keeps telemetry event names and severity vocabularies explicit", () => {
    expect(WORKBENCH_ANALYTICS_UI_BROWSER_EVENTS).toEqual([
      "workbench.analytics.panel_hydration",
      "workbench.analytics.panel_state",
      "workbench.analytics.api_request",
    ]);
    expect(ANALYTICS_UI_SEVERITY_LEVELS).toEqual([
      "info",
      "warning",
      "action_required",
      "critical",
    ]);
    expect(ANALYTICS_UI_ATTENTION_EVENT_TYPES).toContain("panel_degraded");
    expect(ANALYTICS_UI_AUDIT_EVENT_TYPES).toContain("analytics_read_denied");
  });

  it("keeps trace, attention, and audit attributes bounded and product-safe", () => {
    for (const attributes of [
      ANALYTICS_UI_TRACE_ATTRIBUTES,
      ANALYTICS_UI_ATTENTION_EVENT_ATTRIBUTES,
      ANALYTICS_UI_AUDIT_EVENT_ATTRIBUTES,
    ]) {
      expect(() => assertAnalyticsUiAttributeNames(attributes)).not.toThrow();
      expect(attributes).not.toContain("portfolio_id");
      expect(attributes).not.toContain("client_name");
      expect(attributes).not.toContain("screen_content");
    }
  });

  it("accepts only bounded non-sensitive telemetry labels", () => {
    expect(() =>
      assertAnalyticsUiLabels({
        route: "performance",
        panel: "risk-summary",
        state: "ready",
        freshness_bucket: "fresh",
        status_class: "2xx",
      })
    ).not.toThrow();
  });

  it("rejects forbidden sensitive field names before telemetry emission", () => {
    for (const field of ANALYTICS_UI_FORBIDDEN_FIELDS) {
      expect(() => assertAnalyticsUiLabels({ [field]: "sensitive" })).toThrow(
        "forbidden field"
      );
      expect(() => assertAnalyticsUiAttributeNames([field])).toThrow("forbidden field");
    }
  });

  it("rejects unsupported ad hoc labels", () => {
    expect(ANALYTICS_UI_ALLOWED_LABELS).not.toContain("portfolio_id");
    expect(() => assertAnalyticsUiLabels({ custom_dimension: "drift" })).toThrow(
      "unsupported field"
    );
    expect(() => assertAnalyticsUiAttributeNames(["custom_dimension"])).toThrow(
      "unsupported field"
    );
  });

  it("drops empty optional values while preserving allowed labels", () => {
    expect(
      buildAnalyticsUiLabels({
        route: "portfolio",
        panel: "",
        operation: undefined,
        state: "empty",
      })
    ).toEqual({ route: "portfolio", state: "empty" });
  });
});
