import React from "react";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import type { PerformanceWorkspaceCapabilities } from "../../src/apps/performance/capabilities";
import type { WorkbenchPerformanceWorkspace } from "../../src/features/workbench/types";
import PerformanceAnalysisMode from "../../src/apps/performance/components/performance-analysis-mode";

vi.mock("../../src/apps/performance/components/performance-attribution-trend-panel", () => ({
  default: () => <div data-testid="attribution-trend">Attribution Trend Panel</div>,
}));

vi.mock("../../src/apps/performance/components/performance-analysis-attribution-section", () => ({
  default: () => <div data-testid="attribution-section">Attribution Detail Section</div>,
}));

const supportedCapabilities: PerformanceWorkspaceCapabilities = {
  summaryKpis: { state: "supported" },
  returnPath: { state: "supported" },
  benchmarkComparison: { state: "supported" },
  multiHorizonReturns: { state: "supported" },
  contributionRanking: { state: "supported" },
  attributionDetail: { state: "supported" },
  contributionDetail: { state: "supported" },
  evidence: { state: "unavailable", reason: "Evidence contract unavailable." },
};

function buildWorkspace(): WorkbenchPerformanceWorkspace {
  return {
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
      market_value_base: 1_000_000,
      cash_weight_pct: 5,
      position_count: 3,
    },
    net_performance: {
      metric_basis: "NET",
      portfolio_return_pct: 1.2,
      benchmark_return_pct: 1,
      active_return_pct: 0.2,
      annualized_return_pct: 1.2,
      benchmark_id: "BMK_1",
      benchmark_return_source: "calculated",
    },
    gross_performance: {
      metric_basis: "GROSS",
      portfolio_return_pct: 1.4,
      benchmark_return_pct: 1.1,
      active_return_pct: 0.3,
      annualized_return_pct: 1.4,
      benchmark_id: "BMK_1",
      benchmark_return_source: "calculated",
    },
    money_weighted_return: null,
    net_chart: [],
    gross_chart: [],
    contribution: {
      metric_basis: "NET",
      weighting_scheme: "average_weight",
      portfolio_contribution_pct: 5.42,
      total_portfolio_return_pct: 5.42,
      coverage_mv_pct: 98.7,
      portfolio_local_contribution_pct: 4.8,
      portfolio_fx_contribution_pct: 0.62,
      position_rows: [],
      levels: [
        {
          level: 1,
          name: "asset_class",
          total_contribution_pct: 5.42,
          total_weight_avg_pct: 100,
          total_portfolio_return_pct: 5.42,
          rows: [
            {
              key_label: "Equity",
              contribution_pct: 3.8,
              weight_avg_pct: 61,
              total_return_pct: 7.4,
              local_contribution_pct: 3.4,
              fx_contribution_pct: 0.4,
              is_other: false,
            },
          ],
        },
      ],
    },
    attribution: null,
    warnings: [],
    partial_failures: [],
  } as WorkbenchPerformanceWorkspace;
}

describe("PerformanceAnalysisMode", () => {
  it("renders analysis modules and contribution detail with local and FX columns", () => {
    render(
      <PerformanceAnalysisMode
        workspace={buildWorkspace()}
        period="YTD"
        detailBasis="NET"
        contributionDimension="asset_class"
        attributionDimension="asset_class"
        chartFrequency="monthly"
        benchmark="BMK_1"
        capabilities={supportedCapabilities}
        relativeSegmentRows={[]}
        topAttributionEffectRows={[]}
        attributionEffectScale={0.01}
        isUpdating={false}
        isDetailsPending={false}
      />
    );

    expect(screen.getByTestId("attribution-trend")).toBeInTheDocument();
    expect(screen.getByTestId("attribution-section")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Contribution Detail" })).toBeInTheDocument();
    expect(screen.getByLabelText("Asset Class contribution table")).toBeInTheDocument();
    expect(screen.getByText("Local")).toBeInTheDocument();
    expect(screen.getByText("FX")).toBeInTheDocument();
    expect(screen.getByText("Total")).toBeInTheDocument();
    expect(screen.getByText("Equity")).toBeInTheDocument();
  });

  it("shows the contribution loading message when analysis detail is still pending", () => {
    render(
      <PerformanceAnalysisMode
        workspace={{ ...buildWorkspace(), contribution: null }}
        period="YTD"
        detailBasis="NET"
        contributionDimension="asset_class"
        attributionDimension="asset_class"
        chartFrequency="monthly"
        benchmark="BMK_1"
        capabilities={{
          ...supportedCapabilities,
          contributionDetail: {
            state: "unavailable",
            reason: "Contribution detail is not available for the current selection.",
          },
          attributionDetail: {
            state: "unavailable",
            reason: "Attribution detail is not available for the current selection.",
          },
        }}
        relativeSegmentRows={[]}
        topAttributionEffectRows={[]}
        attributionEffectScale={0.01}
        isUpdating={false}
        isDetailsPending
      />
    );

    expect(
      screen.getByText("Loading contribution detail for the selected segment and horizon.")
    ).toBeInTheDocument();
  });

  it("renders a shared capability notice when contribution detail is unavailable", () => {
    render(
      <PerformanceAnalysisMode
        workspace={{ ...buildWorkspace(), contribution: null }}
        period="YTD"
        detailBasis="NET"
        contributionDimension="asset_class"
        attributionDimension="asset_class"
        chartFrequency="monthly"
        benchmark="BMK_1"
        capabilities={{
          ...supportedCapabilities,
          contributionDetail: {
            state: "unavailable",
            reason: "Contribution detail is not available for the current selection.",
          },
          attributionDetail: {
            state: "supported",
          },
        }}
        relativeSegmentRows={[]}
        topAttributionEffectRows={[]}
        attributionEffectScale={0.01}
        isUpdating={false}
        isDetailsPending={false}
      />
    );

    expect(screen.getByText("Contribution detail unavailable")).toBeInTheDocument();
    expect(screen.getByText("Contribution detail is not available for the current selection.")).toBeInTheDocument();
  });
});
