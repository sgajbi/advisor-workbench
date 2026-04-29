import { describe, expect, it } from "vitest";

import {
  ANALYTICS_UI_ALLOWED_LABELS,
  ANALYTICS_UI_FORBIDDEN_FIELDS,
  ANALYTICS_UI_STATE_VOCABULARY,
  WORKBENCH_ANALYTICS_UI_METRIC_FAMILIES,
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
    }
  });

  it("rejects unsupported ad hoc labels", () => {
    expect(ANALYTICS_UI_ALLOWED_LABELS).not.toContain("portfolio_id");
    expect(() => assertAnalyticsUiLabels({ custom_dimension: "drift" })).toThrow(
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
