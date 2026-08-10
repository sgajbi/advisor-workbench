import { afterEach, describe, expect, it } from "vitest";

import {
  appendAnalyticsUiMetricEvent,
  getAnalyticsUiDroppedSeriesCount,
  getAnalyticsUiMetricEvents,
  getAnalyticsUiMetricSamples,
  incrementAnalyticsUiPanelFailure,
  rememberAnalyticsUiAttentionKey,
  resetAnalyticsUiMetricEvents,
} from "@/features/analytics-observability/metric-store";

describe("analytics UI metric store", () => {
  afterEach(() => {
    resetAnalyticsUiMetricEvents();
  });

  it("caps aggregate series and diagnostic events without disrupting callers", () => {
    for (let index = 0; index < 4_097; index += 1) {
      appendAnalyticsUiMetricEvent({
        event_name: "workbench.analytics.panel_state",
        metric_name: "lotus_workbench_panel_state_total",
        value: 1,
        labels: {
          route: "workbench.performance",
          panel: `bounded-test-${index}`,
          operation: "performance.workspace.summary",
          state: "ready",
        },
        recorded_at: "2026-08-10T00:00:00.000Z",
      });
    }

    expect(getAnalyticsUiMetricSamples()).toHaveLength(4_096);
    expect(getAnalyticsUiMetricEvents()).toHaveLength(1_024);
    expect(getAnalyticsUiDroppedSeriesCount()).toBe(1);
  });

  it("bounds attention dedupe and panel failure tracking", () => {
    for (let index = 0; index < 513; index += 1) {
      expect(rememberAnalyticsUiAttentionKey(`attention-${index}`)).toBe(true);
      expect(incrementAnalyticsUiPanelFailure(`panel-${index}`)).toBe(1);
    }

    expect(rememberAnalyticsUiAttentionKey("attention-0")).toBe(true);
    expect(incrementAnalyticsUiPanelFailure("panel-0")).toBe(1);
  });
});
