import React from "react";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import PerformanceSummaryHeaderSection from "../../src/apps/performance/components/performance-summary-header-section";
import type { PerformanceSummaryHeaderSectionProps } from "../../src/apps/performance/components/performance-workspace-types";

function buildProps(
  overrides: Partial<PerformanceSummaryHeaderSectionProps> = {}
): PerformanceSummaryHeaderSectionProps {
  return {
    workspace: {
      correlation_id: "corr",
      contract_version: "v1",
      portfolio_id: "PF_1001",
      as_of_date: "2026-03-29",
      period: "YTD",
      report_start_date: "2026-01-01",
      report_end_date: "2026-03-29",
      chart_frequency: "monthly",
      contribution_dimension: "asset_class",
      attribution_dimension: "asset_class",
      detail_basis: "NET",
      segment: "asset_class",
      benchmark_code: "BMK_1",
      benchmark_options: [],
      portfolio: {
        portfolio_id: "PF_1001",
        client_id: "CIF_1",
        base_currency: "USD",
        booking_center_code: "SG",
      },
      overview: {
        market_value_base: 1000000,
        cash_weight_pct: 5,
        position_count: 3,
      },
      net_performance: {
        metric_basis: "NET",
        portfolio_return_pct: 1.25,
        benchmark_return_pct: 1.0,
        active_return_pct: 0.25,
        annualized_return_pct: 1.25,
        benchmark_id: "BMK_1",
        benchmark_return_source: "calculated",
        begin_market_value: 950000,
        end_market_value: 1000000,
        net_cash_flow: 20000,
      },
      gross_performance: {
        metric_basis: "GROSS",
        portfolio_return_pct: 1.4,
        benchmark_return_pct: 1.0,
        active_return_pct: 0.4,
        annualized_return_pct: 1.4,
        benchmark_id: "BMK_1",
        benchmark_return_source: "calculated",
        begin_market_value: 950000,
        end_market_value: 1000000,
        net_cash_flow: 20000,
      },
      money_weighted_return: {
        money_weighted_return_pct: 1.1,
        annualized_return_pct: 1.1,
        method: "XIRR",
        start_date: "2026-01-01",
        end_date: "2026-03-29",
        notes: [],
      },
      net_chart: [
        {
          label: "2026-01",
          frequency: "monthly",
          period_start: "2026-01-01",
          period_end: "2026-01-31",
          portfolio_return_pct: 1,
          benchmark_return_pct: 0.8,
          active_return_pct: 0.2,
          cumulative_portfolio_return_pct: 1,
          cumulative_benchmark_return_pct: 0.8,
          cumulative_active_return_pct: 0.2,
        },
        {
          label: "2026-02",
          frequency: "monthly",
          period_start: "2026-02-01",
          period_end: "2026-02-28",
          portfolio_return_pct: 0.25,
          benchmark_return_pct: 0.2,
          active_return_pct: 0.05,
          cumulative_portfolio_return_pct: 1.25,
          cumulative_benchmark_return_pct: 1,
          cumulative_active_return_pct: 0.25,
        },
      ],
      gross_chart: [],
      contribution: null,
      attribution: null,
      warnings: [],
      partial_failures: [],
    },
    detailBasis: "NET",
    hasBenchmark: true,
    hasHistory: true,
    selectedBenchmarkCode: "BMK_1",
    selectedBenchmarkLabel: "Global Balanced 60/40",
    selectedPerformance: {
      metric_basis: "NET",
      portfolio_return_pct: 1.25,
      benchmark_return_pct: 1.0,
      active_return_pct: 0.25,
      annualized_return_pct: 1.25,
      benchmark_id: "BMK_1",
      benchmark_return_source: "calculated",
      begin_market_value: 950000,
      end_market_value: 1000000,
      net_cash_flow: 20000,
    },
    primaryDriver: {
      key_label: "Equity",
      contribution_pct: 0.9,
      weight_avg_pct: 55,
      local_contribution_pct: 0.8,
      fx_contribution_pct: 0.1,
      is_other: false,
    },
    hasMoneyWeightedReturn: true,
    suspiciousMoneyWeightedReturn: false,
    ...overrides,
  };
}

describe("PerformanceSummaryHeaderSection", () => {
  it("renders the first-paint performance summary context and mandate stats", () => {
    render(<PerformanceSummaryHeaderSection {...buildProps()} />);

    expect(screen.getByRole("heading", { name: "PF_1001" })).toBeInTheDocument();
    expect(screen.getAllByText("Benchmark").length).toBeGreaterThan(0);
    expect(screen.getByText("Global Balanced 60/40")).toBeInTheDocument();
    expect(screen.getByText("Primary Contributor")).toBeInTheDocument();
    expect(screen.getByText("Equity")).toBeInTheDocument();
    expect(screen.getByText("2 observations")).toBeInTheDocument();
    expect(screen.getByText("Relative measurement")).toBeInTheDocument();
    expect(screen.getByText("Benchmark Comparison")).toBeInTheDocument();
    expect(screen.getByText("Economic Context")).toBeInTheDocument();
    expect(screen.getByText("Mandate Context")).toBeInTheDocument();
    expect(screen.getByText("MWR annualized 1.10%")).toBeInTheDocument();
  });
});
