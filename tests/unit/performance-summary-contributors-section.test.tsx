import React from "react";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import type { PerformanceWorkspaceCapabilities } from "../../src/apps/performance/capabilities";
import PerformanceSummaryContributorsSection from "../../src/apps/performance/components/performance-summary-contributors-section";
import type { PerformanceSummaryContributorsSectionProps } from "../../src/apps/performance/components/performance-workspace-types";

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

function buildProps(
  overrides: Partial<PerformanceSummaryContributorsSectionProps> = {}
): PerformanceSummaryContributorsSectionProps {
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
        benchmark_return_pct: 1,
        active_return_pct: 0.25,
        annualized_return_pct: 1.25,
        benchmark_id: "BMK_1",
        benchmark_return_source: "calculated",
      },
      gross_performance: {
        metric_basis: "GROSS",
        portfolio_return_pct: 1.4,
        benchmark_return_pct: 1,
        active_return_pct: 0.4,
        annualized_return_pct: 1.4,
        benchmark_id: "BMK_1",
        benchmark_return_source: "calculated",
      },
      money_weighted_return: null,
      net_chart: [],
      gross_chart: [],
      contribution: null,
      attribution: null,
      warnings: [],
      partial_failures: [],
    },
    capabilities: supportedCapabilities,
    contributorScale: 1.5,
    positivePositionContributors: [
      {
        position_id: "AAPL",
        contribution_pct: 1.5,
        weight_avg_pct: 24,
        total_return_pct: 8,
        local_contribution_pct: 1.1,
        fx_contribution_pct: 0.4,
      },
    ],
    negativePositionContributors: [
      {
        position_id: "TLT",
        contribution_pct: -0.2,
        weight_avg_pct: 8,
        total_return_pct: -2,
        local_contribution_pct: -0.2,
        fx_contribution_pct: 0,
      },
    ],
    isDetailsPending: false,
    ...overrides,
  };
}

describe("PerformanceSummaryContributorsSection", () => {
  it("renders positive and negative ranked contributors when position ranking exists", () => {
    render(<PerformanceSummaryContributorsSection {...buildProps()} />);

    expect(screen.getByText("Top / Bottom Contributors")).toBeInTheDocument();
    expect(screen.getByText("Highest")).toBeInTheDocument();
    expect(screen.getByText("Lowest")).toBeInTheDocument();
    expect(document.querySelectorAll(".workbench-summary-visual-card")).toHaveLength(2);
    expect(document.querySelector(".workbench-summary-visual-heading")).toBeTruthy();
    expect(document.querySelector(".workbench-summary-visual-label")).toBeTruthy();
    expect(document.querySelector(".workbench-summary-visual-value")).toBeTruthy();
    expect(document.querySelector(".workbench-summary-visual-meta")).toBeTruthy();
    expect(screen.getByText("AAPL")).toBeInTheDocument();
    expect(screen.getByText("TLT")).toBeInTheDocument();
    expect(screen.getByText("Avg. Weight 24.00%")).toBeInTheDocument();
    expect(screen.getByText("Avg. Weight 8.00%")).toBeInTheDocument();
  });

  it("renders a useful fallback when contribution detail is unavailable", () => {
    render(
      <PerformanceSummaryContributorsSection
        {...buildProps({
          capabilities: {
            ...supportedCapabilities,
            contributionRanking: {
              state: "unavailable",
              reason: "Contributor ranking is not available for the current selection.",
            },
          },
          positivePositionContributors: [],
          negativePositionContributors: [],
        })}
      />
    );

    expect(
      screen.getByText("Contributor ranking is not available for the current selection.")
    ).toBeInTheDocument();
  });
});
