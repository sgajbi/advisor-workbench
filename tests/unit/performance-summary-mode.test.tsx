import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import type { WorkbenchPerformanceWorkspace } from "../../src/features/workbench/types";
import PerformanceSummaryMode from "../../src/apps/performance/components/performance-summary-mode";

vi.mock("next/dynamic", () => ({
  default: (loader: () => Promise<unknown>) => {
    const React = require("react");
    return function MockDynamicComponent(props: Record<string, unknown>) {
      const [Component, setComponent] = React.useState(
        null as React.ComponentType<Record<string, unknown>> | null
      );
      React.useEffect(() => {
        loader().then((mod: unknown) => {
          const resolved =
            typeof mod === "function"
              ? (mod as React.ComponentType<Record<string, unknown>>)
              : (mod as { default?: React.ComponentType<Record<string, unknown>> }).default;
          setComponent(() => resolved ?? null);
        });
      }, []);
      return Component ? React.createElement(Component, props) : null;
    };
  },
}));

vi.mock("../../src/apps/performance/components/performance-chart-panel", () => ({
  default: ({ title, id }: { title: string; id?: string }) => (
    <div data-testid="chart-panel">
      {title}
      {id ? `:${id}` : ""}
    </div>
  ),
}));

vi.mock("../../src/apps/performance/components/performance-multi-horizon-panel", () => ({
  default: ({
    portfolioId,
    detailBasis,
    benchmark,
  }: {
    portfolioId: string;
    detailBasis: string;
    benchmark?: string;
  }) => (
    <div data-testid="multi-horizon-panel">
      {portfolioId}:{detailBasis}:{benchmark ?? "none"}
    </div>
  ),
}));

vi.mock("../../src/apps/performance/components/performance-summary-header-section", () => ({
  default: ({ selectedBenchmarkLabel }: { selectedBenchmarkLabel?: string | null }) => (
    <div data-testid="summary-header">{selectedBenchmarkLabel ?? "no benchmark"}</div>
  ),
}));

vi.mock("../../src/apps/performance/components/performance-summary-contributors-section", () => ({
  default: ({
    positivePositionContributors,
    negativePositionContributors,
  }: {
    positivePositionContributors: Array<{ position_id: string }>;
    negativePositionContributors: Array<{ position_id: string }>;
  }) => (
    <div data-testid="contributors-section">
      {positivePositionContributors.map((row) => row.position_id).join(",")}|
      {negativePositionContributors.map((row) => row.position_id).join(",")}
    </div>
  ),
}));

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
    benchmark_options: [
      {
        benchmark_code: "BMK_1",
        benchmark_name: "Model 60/40",
        is_assigned: true,
      },
    ],
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
    contribution: null,
    attribution: null,
    warnings: [],
    partial_failures: [],
  } as WorkbenchPerformanceWorkspace;
}

describe("PerformanceSummaryMode", () => {
  it("wires deferred summary modules for the selected basis and contributor inputs", async () => {
    render(
      <PerformanceSummaryMode
        workspace={buildWorkspace()}
        period="YTD"
        detailBasis="GROSS"
        contributionDimension="asset_class"
        attributionDimension="asset_class"
        chartFrequency="monthly"
        benchmark="BMK_OVERRIDE"
        hasBenchmark
        hasHistory
        selectedBenchmarkCode="BMK_1"
        selectedBenchmarkLabel="Model 60/40"
        selectedPerformance={buildWorkspace().gross_performance}
        primaryDriver={null}
        hasMoneyWeightedReturn={false}
        suspiciousMoneyWeightedReturn={false}
        hasContribution
        hasPositionRanking
        contributorScale={1}
        positivePositionContributors={[
          {
            position_id: "AAPL",
            contribution_pct: 1.5,
            weight_avg_pct: 24,
            total_return_pct: 8,
            local_contribution_pct: 1.1,
            fx_contribution_pct: 0.4,
          },
        ]}
        negativePositionContributors={[
          {
            position_id: "TLT",
            contribution_pct: -0.2,
            weight_avg_pct: 8,
            total_return_pct: -2,
            local_contribution_pct: -0.2,
            fx_contribution_pct: 0,
          },
        ]}
        isUpdating={false}
        isDetailsPending={false}
      />
    );

    expect(screen.getByTestId("summary-header")).toHaveTextContent("Model 60/40");
    expect(screen.queryByTestId("chart-panel")).not.toBeInTheDocument();
    expect(screen.queryByTestId("multi-horizon-panel")).not.toBeInTheDocument();
    expect(screen.queryByTestId("contributors-section")).not.toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByTestId("chart-panel")).toHaveTextContent(
        "Gross Return Path:performance-trend"
      );
      expect(screen.getByTestId("multi-horizon-panel")).toHaveTextContent("PF_1001:GROSS:BMK_1");
      expect(screen.getByTestId("contributors-section")).toHaveTextContent("AAPL|TLT");
    });
  });
});
