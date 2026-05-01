import { describe, expect, it } from "vitest";

import { POST as POST_METRIC_EVENT } from "@/app/api/metrics/events/route";
import { GET } from "@/app/api/metrics/route";
import {
  recordAnalyticsUiPanelState,
  resetAnalyticsUiMetricEvents,
} from "@/features/analytics-observability/metrics";

describe("metrics route", () => {
  it("returns product-safe Prometheus text for implemented analytics UI metrics", async () => {
    resetAnalyticsUiMetricEvents();
    recordAnalyticsUiPanelState({
      context: {
        route: "workbench.risk",
        panel: "risk-summary",
        operation: "risk.summary",
      },
      state: "degraded",
      reason: "source_partial",
    });

    const response = await GET();
    const body = await response.text();

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toContain("text/plain");
    expect(body).toContain("# TYPE lotus_workbench_panel_state_total counter");
    expect(body).toContain("# TYPE lotus_analytics_ui_attention_events_total counter");
    expect(body).toContain(
      'lotus_workbench_panel_state_total{route="workbench.risk",panel="risk-summary"'
    );
    expect(body).not.toContain("portfolio_id");
    expect(body).not.toContain("client_name");
    resetAnalyticsUiMetricEvents();
  });

  it("accepts bounded client-side metric events for Prometheus export", async () => {
    resetAnalyticsUiMetricEvents();
    const response = await POST_METRIC_EVENT(
      new Request("http://workbench.dev.lotus/api/metrics/events", {
        method: "POST",
        body: JSON.stringify({
          event_name: "workbench.analytics.panel_state",
          metric_name: "lotus_workbench_panel_state_total",
          value: 1,
          labels: {
            route: "workbench.performance",
            panel: "performance-advisor-brief-review-action",
            operation: "performance.workspace.advisor-brief.review-action",
            service: "lotus-gateway",
            state: "ready",
            freshness_bucket: "unknown",
            supportability_state: "unknown",
          },
          recorded_at: "2026-05-01T00:00:00.000Z",
        }),
      })
    );

    const metricsResponse = await GET();
    const body = await metricsResponse.text();

    expect(response.status).toBe(202);
    expect(body).toContain("performance-advisor-brief-review-action");
    expect(body).toContain("performance.workspace.advisor-brief.review-action");
    expect(body).not.toContain("PB_SG_GLOBAL_BAL_001");
    expect(body).not.toContain("advisor_1");
    resetAnalyticsUiMetricEvents();
  });

  it("rejects client-side metric events with forbidden labels", async () => {
    resetAnalyticsUiMetricEvents();
    const response = await POST_METRIC_EVENT(
      new Request("http://workbench.dev.lotus/api/metrics/events", {
        method: "POST",
        body: JSON.stringify({
          event_name: "workbench.analytics.panel_state",
          metric_name: "lotus_workbench_panel_state_total",
          value: 1,
          labels: {
            route: "workbench.performance",
            panel: "performance-advisor-brief-review-action",
            operation: "performance.workspace.advisor-brief.review-action",
            portfolio_id: "PB_SG_GLOBAL_BAL_001",
          },
        }),
      })
    );

    const metricsResponse = await GET();
    const body = await metricsResponse.text();

    expect(response.status).toBe(400);
    expect(body).not.toContain("performance-advisor-brief-review-action");
    expect(body).not.toContain("PB_SG_GLOBAL_BAL_001");
  });
});
