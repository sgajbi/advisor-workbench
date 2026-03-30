import { describe, expect, it } from "vitest";

import {
  buildPerformanceHorizonTableModel,
  buildPerformanceReturnPathTableModel,
} from "../../src/apps/performance/components/performance-analytics-table-models";
import {
  buildPerformanceHorizonComparison,
  buildSupportedPerformanceScenario,
} from "../fixtures/performance-workspace-fixtures";

describe("performance analytics table models", () => {
  it("builds a relative-only return path table when the chart is in relative mode", () => {
    const scenario = buildSupportedPerformanceScenario();
    const model = buildPerformanceReturnPathTableModel({
      points: scenario.workspace.net_chart,
      viewMode: "relative",
      includeBenchmarkSeries: true,
      includeActiveSeries: true,
    });

    expect(model.columns.map((column) => column.label)).toEqual([
      "Period",
      "Window",
      "Active",
      "Cum Active",
    ]);
    expect(model.rows[0]?.cells).toEqual([
      "2026-01",
      "01 Jan 2026 - 31 Jan 2026",
      "0.30%",
      "0.30%",
    ]);
  });

  it("builds a horizon table with basis-specific cumulative columns", () => {
    const comparison = buildPerformanceHorizonComparison();
    const model = buildPerformanceHorizonTableModel({
      rows: comparison.rows,
      reportingCurrency: comparison.reporting_currency ?? "USD",
      tableView: "returns",
      basisView: "both",
      selectedPeriodLabel: "YTD",
    });

    expect(model.columns.map((column) => column.label)).toEqual([
      "Period",
      "Window",
      "Net",
      "Gross",
      "Fee Drag",
      "Cum Net",
      "Cum Gross",
      "Ann. Net",
      "Ann. Gross",
      "Benchmark",
      "Active",
      "Cum Benchmark",
      "Cum Active",
    ]);
    expect(model.rows.find((row) => row.key === "YTD")?.className).toBe(
      "performance-horizon-table-row-selected"
    );
    expect(model.rows.find((row) => row.key === "YTD")?.cells).toContain("5.42%");
    expect(model.rows.find((row) => row.key === "YTD")?.cells).toContain("5.88%");
    expect(model.rows.find((row) => row.key === "YTD")?.cells).toContain("4.91%");
    expect(model.rows.find((row) => row.key === "YTD")?.cells).toContain("0.51%");
  });
});
