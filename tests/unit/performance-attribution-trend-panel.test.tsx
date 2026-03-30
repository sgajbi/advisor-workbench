import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import PerformanceAttributionTrendPanel from "../../src/apps/performance/components/performance-attribution-trend-panel";

const getTrendMock = vi.fn();

vi.mock("echarts-for-react", () => ({
  default: ({ style }: { style?: React.CSSProperties }) => (
    <div data-testid="performance-attribution-trend-chart" style={style} />
  ),
}));

vi.mock("../../src/features/workbench/api", () => ({
  getWorkbenchPerformanceAttributionTrendClient: (...args: unknown[]) => getTrendMock(...args),
}));

describe("PerformanceAttributionTrendPanel", () => {
  afterEach(() => {
    getTrendMock.mockReset();
  });

  it("renders the attribution-over-time chart from the dedicated trend contract", async () => {
    getTrendMock.mockResolvedValue({
      correlation_id: "corr-performance",
      contract_version: "v1",
      portfolio_id: "PF_1001",
      as_of_date: "2026-03-27",
      period: "YTD",
      report_start_date: "2026-01-01",
      report_end_date: "2026-03-27",
      chart_frequency: "monthly",
      detail_basis: "NET",
      attribution_dimension: "asset_class",
      benchmark_code: "BMK_GLOBAL_BALANCED_60_40",
      rows: [
        {
          period_label: "2026-01",
          period_start: "2026-01-01",
          period_end: "2026-01-31",
          frequency: "monthly",
          allocation_pct: 0.12,
          selection_pct: 0.08,
          interaction_pct: 0.02,
          total_effect_pct: 0.22,
          cumulative_total_effect_pct: 0.22,
          active_return_pct: 0.22,
          residual_pct: 0,
        },
      ],
      warnings: [],
      partial_failures: [],
    });

    render(
      <PerformanceAttributionTrendPanel
        portfolioId="PF_1001"
        period="YTD"
        chartFrequency="monthly"
        attributionDimension="asset_class"
        detailBasis="NET"
        benchmark="BMK_GLOBAL_BALANCED_60_40"
        reportStartDate="2026-01-01"
        reportEndDate="2026-03-27"
      />
    );

    expect(screen.getByText("Loading attribution effect trend.")).toBeInTheDocument();
    expect(
      document.querySelector(".performance-analysis-state-panel-loading .module-state-panel")
    ).toBeTruthy();

    await waitFor(() => {
      expect(screen.getByRole("img", { name: "Attribution over time chart" })).toBeInTheDocument();
    });

    expect(document.querySelector(".performance-analysis-trend-shell.workbench-chart-shell")).toBeTruthy();
    expect(screen.getByLabelText("Attribution trend context")).toBeInTheDocument();
    expect(screen.getByLabelText("Attribution trend summary strip")).toBeInTheDocument();
    expect(screen.getByText("Latest Active Return")).toBeInTheDocument();
    expect(screen.getByText("Cumulative Total")).toBeInTheDocument();
    expect(screen.getByText("Residual")).toBeInTheDocument();
    expect(screen.getByTestId("performance-attribution-trend-chart")).toBeInTheDocument();
    expect(getTrendMock).toHaveBeenCalledWith("PF_1001", {
      period: "YTD",
      chartFrequency: "monthly",
      attributionDimension: "asset_class",
      detailBasis: "NET",
      benchmark: "BMK_GLOBAL_BALANCED_60_40",
      reportStartDate: "2026-01-01",
      reportEndDate: "2026-03-27",
    });
  });

  it("renders a shared unavailable panel when the trend contract returns no rows", async () => {
    getTrendMock.mockResolvedValue({
      correlation_id: "corr-performance",
      contract_version: "v1",
      portfolio_id: "PF_1001",
      as_of_date: "2026-03-27",
      period: "YTD",
      report_start_date: "2026-01-01",
      report_end_date: "2026-03-27",
      chart_frequency: "monthly",
      detail_basis: "NET",
      attribution_dimension: "asset_class",
      benchmark_code: null,
      rows: [],
      warnings: [],
      partial_failures: [],
    });

    render(
      <PerformanceAttributionTrendPanel
        portfolioId="PF_1001"
        period="YTD"
        chartFrequency="monthly"
        attributionDimension="asset_class"
        detailBasis="NET"
      />
    );

    await waitFor(() => {
      expect(screen.getByText("Attribution trend unavailable")).toBeInTheDocument();
    });

    expect(
      screen.getByText("Attribution trend is not available for the current selection.")
    ).toBeInTheDocument();
    expect(
      document.querySelector(".performance-analysis-state-panel-unavailable .module-state-panel")
    ).toBeTruthy();
  });
});
