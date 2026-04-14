import { describe, expect, it } from "vitest";

import {
  getAttributionDetailContextItems,
  getAttributionReconciliationText,
  getAttributionTrendUnavailableBody,
  getAttributionTrendSummaryItems,
} from "../../src/apps/performance/components/performance-attribution-presentations";
import {
  buildPartialAttributionPerformanceScenario,
  buildPerformanceAttributionTrend,
  buildSupportedPerformanceScenario,
} from "../fixtures/performance-workspace-fixtures";

describe("performance attribution presentations", () => {
  it("builds detail context from the attribution contract", () => {
    const scenario = buildSupportedPerformanceScenario();
    const contextItems = getAttributionDetailContextItems(
      scenario.workspace.attribution,
      scenario.workspace.benchmark_options ?? []
    );

    expect(contextItems).toEqual([
      { label: "Benchmark", value: "Global Balanced 60/40 • USD" },
    ]);
  });

  it("builds latest-row summary from the trend contract", () => {
    const trend = buildPerformanceAttributionTrend();
    const summaryItems = getAttributionTrendSummaryItems(trend);

    expect(summaryItems.map((item) => item.label)).toEqual([
      "Total Effect",
      "Cumulative Total",
    ]);
    expect(summaryItems.find((item) => item.label === "Total Effect")?.support).toBe(
      "Active 0.22%"
    );
  });

  it("keeps summary-only attribution honest without inventing missing values", () => {
    const scenario = buildPartialAttributionPerformanceScenario();
    const contextItems = getAttributionDetailContextItems(
      scenario.workspace.attribution,
      scenario.workspace.benchmark_options ?? []
    );

    expect(contextItems[0]).toEqual({
      label: "Benchmark",
      value: "Global Balanced 60/40 • USD",
    });
  });

  it("builds attribution reconciliation text from summary values", () => {
    const scenario = buildSupportedPerformanceScenario();

    expect(getAttributionReconciliationText(scenario.workspace.attribution!)).toEqual({
      headline: "Residual remains after effects",
      detail: "Active return 0.52% • effects sum 0.50% • residual 0.02%",
    });
  });

  it("explains missing benchmark classification when attribution trend is unavailable", () => {
    const trend = buildPerformanceAttributionTrend({
      attribution_dimension: "sector",
      rows: [],
      partial_failures: [
        {
          source_service: "lotus-performance",
          error_code: "HTTP_422",
          detail:
            "Benchmark component IDX_GLOBAL_BOND_TR missing classification label for sector.",
        },
      ],
    });

    expect(getAttributionTrendUnavailableBody(trend)).toBe(
      "Sector attribution trend is unavailable because the selected benchmark does not expose complete sector classification for every component."
    );
  });

  it("falls back to the generic attribution trend unavailable copy", () => {
    const trend = buildPerformanceAttributionTrend({ rows: [] });

    expect(getAttributionTrendUnavailableBody(trend)).toBe(
      "Attribution trend is not available for the current selection."
    );
  });
});
