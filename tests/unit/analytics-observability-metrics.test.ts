import { afterEach, describe, expect, it } from "vitest";

import {
  classifyAnalyticsUiFreshnessBucket,
  classifyAnalyticsUiPanelState,
  deriveAnalyticsUiSupportabilityState,
  getAnalyticsUiMetricEvents,
  renderAnalyticsUiPrometheusMetrics,
  observeWorkbenchAnalyticsRequest,
  recordAnalyticsUiAttentionEvent,
  recordAnalyticsUiPanelState,
  resetAnalyticsUiMetricEvents,
} from "../../src/features/analytics-observability/metrics";

const context = {
  route: "workbench.performance",
  panel: "performance-summary",
  operation: "performance.workspace.summary",
};

describe("analytics UI observability metrics", () => {
  afterEach(() => {
    resetAnalyticsUiMetricEvents();
  });

  it("classifies governed panel states without ambiguous aliases", () => {
    expect(classifyAnalyticsUiPanelState({ response: { state: "ready" } })).toBe(
      "ready"
    );
    expect(classifyAnalyticsUiPanelState({ empty: true })).toBe("empty");
    expect(classifyAnalyticsUiPanelState({ freshnessBucket: "stale" })).toBe("stale");
    expect(
      classifyAnalyticsUiPanelState({ supportabilityState: "action_required" })
    ).toBe("degraded");
    expect(classifyAnalyticsUiPanelState({ error: new Error("failed") })).toBe(
      "error"
    );
    expect(classifyAnalyticsUiPanelState({ status: 403 })).toBe(
      "permission_blocked"
    );
    expect(classifyAnalyticsUiPanelState({ unsupported: true })).toBe(
      "unsupported"
    );
  });

  it("classifies freshness buckets deterministically", () => {
    const now = new Date("2026-04-29T12:00:00Z");

    expect(
      classifyAnalyticsUiFreshnessBucket({
        asOfDate: "2026-04-28",
        now,
        staleAfterDays: 3,
      })
    ).toBe("fresh");
    expect(
      classifyAnalyticsUiFreshnessBucket({
        asOfDate: "2026-04-20",
        now,
        staleAfterDays: 3,
      })
    ).toBe("stale");
    expect(classifyAnalyticsUiFreshnessBucket({ now })).toBe("unknown");
  });

  it("derives supportability posture from bounded response metadata", () => {
    expect(deriveAnalyticsUiSupportabilityState({ supportability_status: "READY" })).toBe(
      "ready"
    );
    expect(
      deriveAnalyticsUiSupportabilityState({ partial_failures: [{ reason: "source" }] })
    ).toBe("partial");
    expect(deriveAnalyticsUiSupportabilityState({ supportability_state: "unsupported" })).toBe(
      "unsupported"
    );
  });

  it("records only allowed product-safe metric labels", () => {
    const event = recordAnalyticsUiPanelState({
      context,
      state: "ready",
      freshnessBucket: "fresh",
      supportabilityState: "ready",
    });

    expect(event).toEqual(
      expect.objectContaining({
        event_name: "workbench.analytics.panel_state",
        metric_name: "lotus_workbench_panel_state_total",
        value: 1,
      })
    );
    expect(event.labels).toEqual({
      route: "workbench.performance",
      panel: "performance-summary",
      service: "lotus-gateway",
      operation: "performance.workspace.summary",
      state: "ready",
      freshness_bucket: "fresh",
      supportability_state: "ready",
    });
    expect(Object.keys(event.labels)).not.toContain("portfolio_id");
    expect(Object.keys(event.labels)).not.toContain("client_name");
    expect(Object.keys(event.labels)).not.toContain("correlation_id");
  });

  it("records API duration, panel state, and hydration for successful observations", async () => {
    await observeWorkbenchAnalyticsRequest(context, async () => ({
      as_of_date: new Date().toISOString().slice(0, 10),
      supportability_status: "READY",
      state: "ready",
      portfolio_id: "PF_1001",
      client_name: "Sensitive Client",
    }));

    const events = getAnalyticsUiMetricEvents();
    expect(events.map((event) => event.metric_name)).toEqual([
      "lotus_workbench_api_request_duration_seconds",
      "lotus_workbench_panel_state_total",
      "lotus_workbench_panel_hydration_duration_seconds",
    ]);
    expect(events.every((event) => event.labels.panel === "performance-summary")).toBe(
      true
    );
    expect(events.every((event) => !("portfolio_id" in event.labels))).toBe(true);
    expect(events.every((event) => !("client_name" in event.labels))).toBe(true);

    const renderedMetrics = renderAnalyticsUiPrometheusMetrics();
    expect(renderedMetrics).toContain(
      "lotus_workbench_panel_state_total{route=\"workbench.performance\""
    );
    expect(renderedMetrics).toContain(
      "lotus_workbench_api_request_duration_seconds_sum"
    );
    expect(renderedMetrics).toContain(
      "lotus_workbench_api_request_duration_seconds_bucket"
    );
    expect(renderedMetrics).not.toContain("portfolio_id");
    expect(renderedMetrics).not.toContain("Sensitive Client");
  });

  it("emits one bounded attention event for stale source-backed panel state", async () => {
    await observeWorkbenchAnalyticsRequest(context, async () => ({
      as_of_date: "2026-04-01",
      state: "stale",
      warnings: ["PERFORMANCE_STALE_SOURCE"],
      portfolio_id: "PF_SENSITIVE",
      client_name: "Sensitive Client",
    }));

    const attentionEvents = getAnalyticsUiMetricEvents().filter(
      (event) => event.metric_name === "lotus_analytics_ui_attention_events_total"
    );
    expect(attentionEvents).toEqual([
      expect.objectContaining({
        event_name: "workbench.analytics.attention",
        labels: expect.objectContaining({
          route: "workbench.performance",
          panel: "performance-summary",
          attention_type: "panel_stale",
          severity: "warning",
          state: "stale",
          reason: "PERFORMANCE_STALE_SOURCE",
          freshness_bucket: "stale",
        }),
      }),
    ]);
    expect(JSON.stringify(attentionEvents)).not.toContain("PF_SENSITIVE");
    expect(JSON.stringify(attentionEvents)).not.toContain("Sensitive Client");
  });

  it("deduplicates attention events by bounded label identity", () => {
    const first = recordAnalyticsUiAttentionEvent({
      context,
      attentionType: "panel_degraded",
      severity: "action_required",
      state: "degraded",
      reason: "Performance source unavailable for private client",
      freshnessBucket: "unknown",
      supportabilityState: "action_required",
    });
    const duplicate = recordAnalyticsUiAttentionEvent({
      context,
      attentionType: "panel_degraded",
      severity: "action_required",
      state: "degraded",
      reason: "Performance source unavailable for private client",
      freshnessBucket: "unknown",
      supportabilityState: "action_required",
    });

    expect(first).toBeDefined();
    expect(duplicate).toBeUndefined();
    expect(getAnalyticsUiMetricEvents()).toHaveLength(1);
    expect(getAnalyticsUiMetricEvents()[0].labels.reason).toBe(
      "Performance_source_unavailable_for_private_client"
    );
  });

  it("emits repeated-failure attention only after repeated selected panel failures", async () => {
    for (let attempt = 0; attempt < 3; attempt += 1) {
      await expect(
        observeWorkbenchAnalyticsRequest(context, async () => {
          throw new Error("Failed to fetch performance workspace summary (503)");
        })
      ).rejects.toThrow("503");
    }

    const attentionEvents = getAnalyticsUiMetricEvents().filter(
      (event) => event.metric_name === "lotus_analytics_ui_attention_events_total"
    );
    expect(attentionEvents).toEqual([
      expect.objectContaining({
        labels: expect.objectContaining({
          attention_type: "panel_repeated_failure",
          severity: "action_required",
          state: "error",
          reason: "server",
        }),
      }),
    ]);
  });

  it("records a bounded error state when a selected analytics request fails", async () => {
    await expect(
      observeWorkbenchAnalyticsRequest(context, async () => {
        throw new Error("Failed to fetch performance workspace summary (503)");
      })
    ).rejects.toThrow("503");

    expect(getAnalyticsUiMetricEvents()).toEqual([
      expect.objectContaining({
        metric_name: "lotus_workbench_api_request_duration_seconds",
        labels: expect.objectContaining({
          status_class: "5xx",
          state: "error",
          error_category: "server",
        }),
      }),
      expect.objectContaining({
        metric_name: "lotus_workbench_panel_state_total",
        labels: expect.objectContaining({ state: "error", reason: "server" }),
      }),
    ]);
  });
});
