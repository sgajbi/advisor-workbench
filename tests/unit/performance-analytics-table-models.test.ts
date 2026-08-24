import { describe, expect, it } from "vitest";

import {
  buildPerformanceContributionTableModel,
  buildPerformanceContributionLevelTableModel,
  buildPerformancePositionContributionTableModel,
  buildPerformanceAttributionTrendTableModel,
  buildPerformanceHorizonVisualModel,
  buildPerformanceHorizonTableModel,
  buildPerformanceReturnPathTableModel,
} from "../../src/apps/performance/components/performance-analytics-table-models";
import {
  buildPerformanceAttributionTrend,
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
      "Active return",
      "Cumulative active return",
    ]);
    expect(model.rows[0]?.cells).toEqual([
      "2026-01",
      "01-31 Jan 2026",
      "0.30%",
      "0.30%",
    ]);
  });

  it("builds a horizon table with basis-specific cumulative columns", () => {
    const comparison = buildPerformanceHorizonComparison();
    const model = buildPerformanceHorizonTableModel({
      rows: comparison.rows,
      reportingCurrency: comparison.reporting_currency ?? "USD",
      tableView: "combined",
      basisView: "both",
      selectedPeriodLabel: "YTD",
    });

    expect(model.columns.map((column) => column.label)).toEqual([
      "Period",
      "Window",
      "Opening market value",
      "Opening cash flow",
      "Ending market value",
      "Closing cash flow",
      "Flow-adjusted market value",
      "Net cash flow",
      "Fees",
      "Net TWR",
      "Gross TWR",
      "Fee drag",
      "Cumulative net TWR",
      "Cumulative gross TWR",
      "Annualised net TWR",
      "Annualised gross TWR",
      "Benchmark TWR",
      "Active return",
      "Cumulative benchmark TWR",
      "Cumulative active return",
    ]);
    expect(model.rows.find((row) => row.key === "YTD")?.className).toBe(
      "performance-horizon-table-row-selected"
    );
    expect(model.rows.find((row) => row.key === "YTD")?.cells).toContain("$26,000");
    expect(model.rows.find((row) => row.key === "YTD")?.cells).toContain("-$3,500");
    expect(model.rows.find((row) => row.key === "YTD")?.cells).toContain("$486,370");
    expect(model.rows.find((row) => row.key === "YTD")?.cells).toContain("5.42%");
    expect(model.rows.find((row) => row.key === "YTD")?.cells).toContain("5.88%");
    expect(model.rows.find((row) => row.key === "YTD")?.cells).toContain("4.91%");
    expect(model.rows.find((row) => row.key === "YTD")?.cells).toContain("0.51%");
  });

  it("builds horizon visual cards for relative and basis views from contract-backed rows", () => {
    const comparison = buildPerformanceHorizonComparison();

    const relativeModel = buildPerformanceHorizonVisualModel({
      rows: comparison.rows,
      basisView: "both",
      visualMode: "relative",
    });
    expect(relativeModel[0]).toMatchObject({
      label: "MTD",
      leftBarLabel: "Active",
      rightBarLabel: "Cumulative",
    });

    const basisModel = buildPerformanceHorizonVisualModel({
      rows: comparison.rows,
      basisView: "gross",
      visualMode: "basis",
    });
    expect(basisModel[2]).toMatchObject({
      label: "YTD",
      leftBarLabel: "Net",
      rightBarLabel: "Gross",
    });
  });

  it("builds an attribution trend table from the deferred trend contract", () => {
    const trend = buildPerformanceAttributionTrend();
    const model = buildPerformanceAttributionTrendTableModel({ rows: trend.rows });

    expect(model.columns.map((column) => column.label)).toEqual([
      "Period",
      "Period range",
      "Allocation",
      "Selection",
      "Interaction",
      "Effect total",
      "Cumulative effect",
      "Active return",
      "Residual",
    ]);
    expect(model.rows[0]?.cells).toEqual([
      "2026-01",
      "01 Jan 2026 - 31 Jan 2026",
      "0.12%",
      "0.08%",
      "0.02%",
      "0.22%",
      "0.22%",
      "0.22%",
      "0.00%",
    ]);
  });

  it("builds a contribution table from aggregate contribution rows", () => {
    const scenario = buildSupportedPerformanceScenario();
    const contribution = scenario.workspace.contribution;
    const rows = scenario.workspace.contribution?.levels?.[0]?.rows ?? [];
    const model = buildPerformanceContributionTableModel({ rows });

    expect(model.columns.map((column) => column.label)).toEqual([
      "Segment",
      "Contribution",
      "Average weight",
      "TWR",
      "Local",
      "FX",
    ]);
    expect(model.rows[0]?.cells).toEqual([
      "Equity",
      "3.80%",
      "61.00%",
      "7.40%",
      "3.40%",
      "0.40%",
    ]);
    const footerModel = buildPerformanceContributionTableModel({
      rows,
      contribution,
      level: contribution?.levels?.[0] ?? null,
    });
    expect(footerModel.footer).toEqual([
      "Total",
      "5.42%",
      "100.00%",
      "5.42%",
      "4.80%",
      "0.62%",
    ]);
  });

  it("builds a shared aggregate level table model for analysis contribution tables", () => {
    const scenario = buildSupportedPerformanceScenario();
    const contribution = scenario.workspace.contribution;
    const level = contribution?.levels?.[0] ?? null;
    const model = buildPerformanceContributionLevelTableModel({
      rows: level?.rows ?? [],
      contribution,
      level,
    });

    expect(model.columns.map((column) => column.label)).toEqual([
      "Segment",
      "Contribution",
      "Average weight",
      "TWR",
      "Local",
      "FX",
    ]);
    expect(model.rows[0]?.cells).toEqual([
      "Equity",
      "3.80%",
      "61.00%",
      "7.40%",
      "3.40%",
      "0.40%",
    ]);
    expect(model.footer).toEqual([
      "Total",
      "5.42%",
      "100.00%",
      "5.42%",
      "4.80%",
      "0.62%",
    ]);
  });

  it("builds a position contribution table from workspace position rows", () => {
    const scenario = buildSupportedPerformanceScenario();
    const rows = scenario.workspace.contribution?.position_rows ?? [];
    const model = buildPerformancePositionContributionTableModel({ rows });

    expect(model.columns.map((column) => column.label)).toEqual([
      "Position",
      "Contribution",
      "Average weight",
      "TWR",
      "Local",
      "FX",
    ]);
    expect(model.rows[0]?.cells).toEqual([
      "AAPL",
      "1.55%",
      "24.10%",
      "8.20%",
      "1.18%",
      "0.37%",
    ]);
  });

  it("keeps Local and FX together when the live contract emits an FX leg and zero Local contribution", () => {
    const model = buildPerformancePositionContributionTableModel({
      rows: [
        {
          position_id: "PB_SG_GLOBAL_BAL_001:FO_EQ_AAPL_US",
          contribution_pct: 0.29551,
          weight_avg_pct: 7.444525,
          total_return_pct: 0,
          local_contribution_pct: 0,
          fx_contribution_pct: 0.29551,
        },
        {
          position_id: "PB_SG_GLOBAL_BAL_001:FO_EQ_MSFT_US",
          contribution_pct: 0.173727,
          weight_avg_pct: 10.268896,
          total_return_pct: 0,
          local_contribution_pct: 0,
          fx_contribution_pct: 0.173727,
        },
      ],
    });

    expect(model.columns.map((column) => column.label)).toEqual([
      "Position",
      "Contribution",
      "Average weight",
      "Local",
      "FX",
    ]);
    expect(model.rows[0]?.cells).toEqual([
      "AAPL US",
      "0.30%",
      "7.44%",
      "0.00%",
      "0.30%",
    ]);
  });

  it("keeps the position return column when upstream emits meaningful total returns", () => {
    const model = buildPerformancePositionContributionTableModel({
      rows: [
        {
          position_id: "PB_SG_GLOBAL_BAL_001:FO_EQ_AAPL_US",
          contribution_pct: 0.29551,
          weight_avg_pct: 7.444525,
          total_return_pct: 4.8123,
          local_contribution_pct: 0,
          fx_contribution_pct: 0.29551,
        },
        {
          position_id: "PB_SG_GLOBAL_BAL_001:FO_EQ_MSFT_US",
          contribution_pct: 0.173727,
          weight_avg_pct: 10.268896,
          total_return_pct: 2.1044,
          local_contribution_pct: 0,
          fx_contribution_pct: 0.173727,
        },
      ],
    });

    expect(model.columns.map((column) => column.label)).toEqual([
      "Position",
      "Contribution",
      "Average weight",
      "TWR",
      "Local",
      "FX",
    ]);
    expect(model.rows[0]?.cells).toEqual([
      "AAPL US",
      "0.30%",
      "7.44%",
      "4.81%",
      "0.00%",
      "0.30%",
    ]);
  });
});
