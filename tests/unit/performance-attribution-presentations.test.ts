import { describe, expect, it } from "vitest";

import {
  getAttributionDetailContextItems,
  getAttributionReconciliationText,
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
    const contextItems = getAttributionDetailContextItems(
      scenario.workspace.attribution,
      scenario.workspace.benchmark_options ?? []
    );
    const summaryItems = getAttributionDetailSummaryItems(
      scenario.workspace.attribution,
      scenario.workspace.benchmark_options ?? []
    );

    expect(contextItems).toEqual([
      { label: "Benchmark", value: "Global Balanced 60/40 • USD" },
      { label: "Benchmark Source", value: "Calculated" },
      { label: "Attribution Model", value: "Brinson-Fachler" },
      { label: "Linking Method", value: "Carino" },
    ]);
    expect(summaryItems.map((item) => item.label)).toEqual([
      "Active Return",
      "Effects Sum",
      "Residual",
    ]);
    expect(summaryItems.find((item) => item.label === "Active Return")?.support).toBeUndefined();
    expect(summaryItems.find((item) => item.label === "Effects Sum")?.support).toBeUndefined();
    expect(summaryItems.find((item) => item.label === "Residual")?.support).toBeUndefined();
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
      { label: "Period Range", value: "01 Jan 2026 - 24 Feb 2026" },
      { label: "Basis", value: "NET" },
      { label: "Benchmark", value: "BMK GLOBAL BALANCED 60 40" },
      { label: "Segment", value: "Asset Class" },
    ]);
    expect(summaryItems.map((item) => item.label)).toEqual([
      "Total Effect",
      "Active Return",
      "Cumulative Total",
      "Residual",
    ]);
    expect(summaryItems.find((item) => item.label === "Total Effect")?.support).toBe(
      "Residual de minimis • Active 0.22%"
    );
    expect(summaryItems.find((item) => item.label === "Active Return")?.support).toBe(
      "Effects 0.22% + Residual 0.00%"
    );
  });

  it("keeps summary-only attribution honest without inventing missing values", () => {
    const scenario = buildPartialAttributionPerformanceScenario();
    const contextItems = getAttributionDetailContextItems(
      scenario.workspace.attribution,
      scenario.workspace.benchmark_options ?? []
    );
    const summaryItems = getAttributionDetailSummaryItems(
      scenario.workspace.attribution,
      scenario.workspace.benchmark_options ?? []
    );

    expect(contextItems[0]).toEqual({
      label: "Benchmark",
      value: "Global Balanced 60/40 • USD",
    });
    expect(summaryItems).toHaveLength(3);
    expect(summaryItems.find((item) => item.label === "Residual")?.value).toBe("0.02%");
    expect(summaryItems.find((item) => item.label === "Residual")?.support).toBeUndefined();
  });

  it("uses benchmark option labels when trend context receives them", () => {
    const trend = buildPerformanceAttributionTrend();
    const contextItems = getAttributionTrendContextItems({
      trend,
      detailBasis: "NET",
      attributionDimension: "asset_class",
      benchmark: "BMK_GLOBAL_BALANCED_60_40",
      benchmarkOptions: [
        {
          benchmark_code: "BMK_GLOBAL_BALANCED_60_40",
          benchmark_name: "Global Balanced 60/40",
          is_assigned: true,
        },
      ],
      period: "YTD",
    });

    expect(contextItems[2]).toEqual({
      label: "Benchmark",
      value: "Global Balanced 60/40",
    });
  });

  it("builds attribution reconciliation text from summary values", () => {
    const scenario = buildSupportedPerformanceScenario();

    expect(getAttributionReconciliationText(scenario.workspace.attribution!)).toEqual({
      headline: "Residual remains after effects",
      detail: "Active return 0.52% • effects sum 0.50% • residual 0.02%",
    });
  });

  it("includes benchmark provider provenance in trend context when option metadata is available", () => {
    const trend = buildPerformanceAttributionTrend();
    const contextItems = getAttributionTrendContextItems({
      trend,
      detailBasis: "NET",
      attributionDimension: "asset_class",
      benchmark: "BMK_GLOBAL_BALANCED_60_40",
      benchmarkOptions: [
        {
          benchmark_code: "BMK_GLOBAL_BALANCED_60_40",
          benchmark_name: "Global Balanced 60/40",
          benchmark_provider: "LOTUS_DEMO",
          is_assigned: true,
        },
      ],
      period: "YTD",
    });

    expect(contextItems[2]).toEqual({
      label: "Benchmark",
      value: "Global Balanced 60/40",
    });
  });
});
