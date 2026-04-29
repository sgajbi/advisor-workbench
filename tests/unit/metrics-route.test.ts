import { describe, expect, it } from "vitest";

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
    expect(body).toContain(
      'lotus_workbench_panel_state_total{route="workbench.risk",panel="risk-summary"'
    );
    expect(body).not.toContain("portfolio_id");
    expect(body).not.toContain("client_name");
    resetAnalyticsUiMetricEvents();
  });
});
