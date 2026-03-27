import React from "react";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import PerformanceChartPanel from "../../src/apps/performance/components/performance-chart-panel";

vi.mock("echarts-for-react", () => ({
  default: ({ style }: { style?: React.CSSProperties }) => (
    <div data-testid="performance-echart" style={style} />
  ),
}));

describe("PerformanceChartPanel", () => {
  it("falls back to chart point dates when report dates are missing", () => {
    render(
      <PerformanceChartPanel
        title="Net Return Path"
        points={[
          {
            label: "2026-01",
            frequency: "monthly",
            period_start: "2026-01-01",
            period_end: "2026-01-31",
            portfolio_return_pct: 1.2,
            benchmark_return_pct: 0.8,
            active_return_pct: 0.4,
            cumulative_portfolio_return_pct: 1.2,
            cumulative_benchmark_return_pct: 0.8,
            cumulative_active_return_pct: 0.4,
          },
          {
            label: "2026-02",
            frequency: "monthly",
            period_start: "2026-02-01",
            period_end: "2026-02-28",
            portfolio_return_pct: 2.1,
            benchmark_return_pct: 1.7,
            active_return_pct: 0.4,
            cumulative_portfolio_return_pct: 3.3,
            cumulative_benchmark_return_pct: 2.5,
            cumulative_active_return_pct: 0.8,
          },
        ]}
        summary={{
          portfolio_return_pct: 3.3,
          benchmark_return_pct: 2.5,
          active_return_pct: 0.8,
        }}
        portfolioId="DEMO_ADV_USD_001"
        period="YTD"
        detailBasis="NET"
        contributionDimension="asset_class"
        attributionDimension="asset_class"
        chartFrequency="monthly"
        benchmark="BMK_GLOBAL_BALANCED_60_40"
        reportStartDate=""
        reportEndDate=""
        onRequestChange={vi.fn()}
      />
    );

    expect(screen.getByText("2026-01-01 - 2026-02-28")).toBeInTheDocument();
    expect(screen.getByLabelText("From")).toHaveValue("2026-01-01");
    expect(screen.getByLabelText("To")).toHaveValue("2026-02-28");
  });

  it("uses benchmark options from the workspace contract for selector labels", () => {
    render(
      <PerformanceChartPanel
        title="Net Return Path"
        points={[
          {
            label: "2026-03",
            frequency: "monthly",
            period_start: "2026-03-01",
            period_end: "2026-03-27",
            portfolio_return_pct: 1.4,
            benchmark_return_pct: 1.1,
            active_return_pct: 0.3,
            cumulative_portfolio_return_pct: 6.2,
            cumulative_benchmark_return_pct: 5.8,
            cumulative_active_return_pct: 0.4,
          },
        ]}
        summary={{
          portfolio_return_pct: 6.2,
          benchmark_return_pct: 5.8,
          active_return_pct: 0.4,
        }}
        portfolioId="DEMO_ADV_USD_001"
        period="YTD"
        detailBasis="NET"
        contributionDimension="asset_class"
        attributionDimension="asset_class"
        chartFrequency="monthly"
        benchmark="BMK_GLOBAL_GROWTH_80_20"
        benchmarkOptions={[
          {
            benchmark_code: "BMK_GLOBAL_BALANCED_60_40",
            benchmark_name: "Global Balanced 60/40",
            is_assigned: false,
          },
          {
            benchmark_code: "BMK_GLOBAL_GROWTH_80_20",
            benchmark_name: "Global Growth 80/20",
            is_assigned: true,
          },
        ]}
        reportStartDate="2026-01-01"
        reportEndDate="2026-03-27"
        onRequestChange={vi.fn()}
      />
    );

    expect(screen.getByLabelText("Compared To")).toHaveDisplayValue("Global Growth 80/20");
    expect(screen.getAllByText("Global Growth 80/20").length).toBeGreaterThan(1);
  });
});
