import { describe, expect, it } from "vitest";

import {
  getAttributionDetailContextItems,
  getAttributionDetailSummaryItems,
  getAttributionTrendContextItems,
  getAttributionTrendSummaryItems,
} from "../../src/apps/performance/components/performance-attribution-presentations";
import {
  buildPartialAttributionPerformanceScenario,
  buildPerformanceAttributionTrend,
  buildSupportedPerformanceScenario,
} from "../fixtures/performance-workspace-fixtures";

describe("performance attribution presentations", () => {
  it("builds detail context and summary items from the attribution contract", () => {
    const scenario = buildSupportedPerformanceScenario();
    const contextItems = getAttributionDetailContextItems(scenario.workspace.attribution);
    const summaryItems = getAttributionDetailSummaryItems(scenario.workspace.attribution);

    expect(contextItems).toEqual([
      { label: "Benchmark", value: "BMK GLOBAL BALANCED 60 40" },
      { label: "Source", value: "Calculated" },
      { label: "Model", value: "BF" },
      { label: "Linking", value: "Carino" },
    ]);
    expect(summaryItems.map((item) => item.label)).toEqual([
      "Benchmark",
      "Active Return",
      "Effects Sum",
      "Residual",
    ]);
  });

  it("builds trend context and latest-row summary from the trend contract", () => {
    const trend = buildPerformanceAttributionTrend();
    const contextItems = getAttributionTrendContextItems({
      trend,
      detailBasis: "NET",
      attributionDimension: "asset_class",
      benchmark: "BMK_GLOBAL_BALANCED_60_40",
      period: "YTD",
    });
    const summaryItems = getAttributionTrendSummaryItems(trend);

    expect(contextItems).toEqual([
      { label: "Resolved window", value: "01 Jan 2026 - 24 Feb 2026" },
      { label: "Basis", value: "NET" },
      { label: "Benchmark", value: "BMK GLOBAL BALANCED 60 40" },
      { label: "Segment", value: "Asset Class" },
    ]);
    expect(summaryItems.map((item) => item.label)).toEqual([
      "Latest Total Effect",
      "Latest Active Return",
      "Cumulative Total",
      "Residual",
    ]);
  });

  it("keeps summary-only attribution honest without inventing missing values", () => {
    const scenario = buildPartialAttributionPerformanceScenario();
    const contextItems = getAttributionDetailContextItems(scenario.workspace.attribution);
    const summaryItems = getAttributionDetailSummaryItems(scenario.workspace.attribution);

    expect(contextItems[0]).toEqual({
      label: "Benchmark",
      value: "BMK GLOBAL BALANCED 60 40",
    });
    expect(summaryItems).toHaveLength(4);
    expect(summaryItems.find((item) => item.label === "Residual")?.value).toBe("0.02%");
  });
});
