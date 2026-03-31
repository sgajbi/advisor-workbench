import React from "react";
import { render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import PerformanceAttributionTrendPanel from "../../src/apps/performance/components/performance-attribution-trend-panel";

const getTrendMock = vi.fn();

function compactPattern(text: string) {
  return new RegExp(text.replaceAll(" ", "\\s*"));
}

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
        benchmarkOptions={[
          {
            benchmark_code: "BMK_GLOBAL_BALANCED_60_40",
            benchmark_name: "Global Balanced 60/40",
            benchmark_provider: "LOTUS_DEMO",
            is_assigned: true,
          },
        ]}
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
    expect(screen.getByLabelText("Attribution trend context")).toHaveTextContent(
      compactPattern("Resolved window 01 Jan 2026 - 27 Mar 2026")
    );
    expect(screen.getByLabelText("Attribution trend context")).toHaveTextContent(
      compactPattern("Benchmark Global Balanced 60/40 • Lotus Demo")
    );
    expect(
      document.querySelectorAll(
        ".performance-analysis-context-row .workbench-chart-context-row-item"
      )
    ).toHaveLength(4);
    expect(screen.getByLabelText("Attribution trend summary strip")).toBeInTheDocument();
    expect(screen.getByText("Latest Total Effect")).toBeInTheDocument();
    expect(screen.getByText("Latest Active Return")).toBeInTheDocument();
    expect(screen.getByText("Cumulative Total")).toBeInTheDocument();
    expect(
      within(screen.getByLabelText("Attribution trend summary strip")).getByText("Residual")
    ).toBeInTheDocument();
    expect(screen.getByTestId("performance-attribution-trend-chart")).toBeInTheDocument();
    const trendTable = screen.getByLabelText("Attribution trend table");
    expect(within(trendTable).getByText("Allocation")).toBeInTheDocument();
    expect(within(trendTable).getByText("Selection")).toBeInTheDocument();
    expect(within(trendTable).getByText("Interaction")).toBeInTheDocument();
    expect(within(trendTable).getByText("Cum Total")).toBeInTheDocument();
    expect(within(trendTable).getByText("Residual")).toBeInTheDocument();
    expect(within(trendTable).getByText("2026-01")).toBeInTheDocument();
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

  it("shows a normalization notice when the trend endpoint adjusts unsupported controls", async () => {
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
      requested_chart_frequency_supported: false,
      requested_attribution_dimension_supported: false,
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
      warnings: [
        "PERFORMANCE_ATTRIBUTION_TREND_CHART_FREQUENCY_NORMALIZED",
        "PERFORMANCE_ATTRIBUTION_TREND_DIMENSION_NORMALIZED",
      ],
      partial_failures: [],
    });

    render(
      <PerformanceAttributionTrendPanel
        portfolioId="PF_1001"
        period="YTD"
        chartFrequency="weekly"
        attributionDimension="issuer"
        detailBasis="NET"
        benchmark="BMK_GLOBAL_BALANCED_60_40"
        benchmarkOptions={[
          {
            benchmark_code: "BMK_GLOBAL_BALANCED_60_40",
            benchmark_name: "Global Balanced 60/40",
            is_assigned: true,
          },
        ]}
        reportStartDate="2026-01-01"
        reportEndDate="2026-03-27"
      />
    );

    const notice = await screen.findByRole("status", {
      name: "Attribution trend normalization",
    });
    expect(notice).toHaveTextContent("Selection adjusted");
    expect(notice).toHaveTextContent("frequency reset to Monthly");
    expect(notice).toHaveTextContent("segment reset to Asset Class");
  });

  it("pushes resolved trend controls back through the shared request handler", async () => {
    const onRequestChange = vi.fn();
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
      requested_chart_frequency_supported: false,
      requested_attribution_dimension_supported: false,
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
        chartFrequency="weekly"
        attributionDimension="issuer"
        detailBasis="NET"
        benchmark="BMK_GLOBAL_BALANCED_60_40"
        benchmarkOptions={[
          {
            benchmark_code: "BMK_GLOBAL_BALANCED_60_40",
            benchmark_name: "Global Balanced 60/40",
            is_assigned: true,
          },
        ]}
        reportStartDate="2026-01-01"
        reportEndDate="2026-03-27"
        onRequestChange={onRequestChange}
      />
    );

    await waitFor(() => {
      expect(onRequestChange).toHaveBeenCalledWith({
        chartFrequency: "monthly",
        attributionDimension: "asset_class",
      });
    });
  });
});
