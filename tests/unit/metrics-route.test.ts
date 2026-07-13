import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { POST as POST_METRIC_EVENT } from "@/app/api/metrics/events/route";
import { GET } from "@/app/api/metrics/route";
import {
  recordAnalyticsUiPanelState,
  resetAnalyticsUiMetricEvents,
} from "@/features/analytics-observability/metrics";

type MetricsEventResponseExample = {
  id: string;
  request: Record<string, unknown>;
  expectedStatus: number;
  response: Record<string, unknown>;
};

type MetricsEventResponseExamples = {
  schemaVersion: string;
  endpoint: { method: string; path: string };
  cases: MetricsEventResponseExample[];
};

const metricsEventResponseExamples = JSON.parse(
  readFileSync(
    join(
      process.cwd(),
      "docs",
      "operations",
      "metrics-event-response-examples.v1.json"
    ),
    "utf8"
  )
) as MetricsEventResponseExamples;

function responseExample(id: string): MetricsEventResponseExample {
  const example = metricsEventResponseExamples.cases.find((item) => item.id === id);
  if (!example) {
    throw new Error(`Missing metrics response example: ${id}`);
  }
  return example;
}

async function invokeResponseExample(example: MetricsEventResponseExample) {
  return POST_METRIC_EVENT(
    new Request(`http://workbench.dev.lotus${metricsEventResponseExamples.endpoint.path}`, {
      method: metricsEventResponseExamples.endpoint.method,
      body: JSON.stringify(example.request),
    })
  );
}

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
    const example = responseExample("accepted_bounded_event");
    const response = await invokeResponseExample(example);

    const metricsResponse = await GET();
    const body = await metricsResponse.text();

    expect(response.status).toBe(example.expectedStatus);
    await expect(response.json()).resolves.toStrictEqual(example.response);
    expect(body).toContain("performance-advisor-brief-review-action");
    expect(body).toContain("performance.workspace.advisor-brief.review-action");
    expect(body).not.toContain("PB_SG_GLOBAL_BAL_001");
    expect(body).not.toContain("advisor_1");
    resetAnalyticsUiMetricEvents();
  });

  it("rejects client-side metric events with forbidden labels", async () => {
    resetAnalyticsUiMetricEvents();
    const example = responseExample("rejected_forbidden_label");
    const response = await invokeResponseExample(example);

    const metricsResponse = await GET();
    const body = await metricsResponse.text();

    expect(response.status).toBe(example.expectedStatus);
    await expect(response.json()).resolves.toStrictEqual(example.response);
    expect(body).not.toContain("performance-advisor-brief-review-action");
    expect(body).not.toContain("must-not-be-recorded");
  });

  it("keeps the authored response evidence bound to the intended route", () => {
    expect(metricsEventResponseExamples.schemaVersion).toBe(
      "lotus-workbench.metrics-event-response-examples.v1"
    );
    expect(metricsEventResponseExamples.endpoint).toStrictEqual({
      method: "POST",
      path: "/api/metrics/events",
    });
    expect(metricsEventResponseExamples.cases.map((example) => example.id)).toStrictEqual([
      "accepted_bounded_event",
      "rejected_forbidden_label",
    ]);
  });
});
