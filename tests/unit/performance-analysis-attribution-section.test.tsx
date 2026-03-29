import React from "react";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import type { PerformanceWorkspaceCapabilities } from "../../src/apps/performance/capabilities";
import PerformanceAnalysisAttributionSection from "../../src/apps/performance/components/performance-analysis-attribution-section";
import type { PerformanceAnalysisAttributionSectionProps } from "../../src/apps/performance/components/performance-workspace-types";

vi.mock("../../src/apps/performance/components/performance-relative-segment-panel", () => ({
  default: () => <div>Relative Segment Panel</div>,
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

function buildProps(
  overrides: Partial<PerformanceAnalysisAttributionSectionProps> = {}
): PerformanceAnalysisAttributionSectionProps {
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
      attribution: {
        metric_basis: "NET",
        model: "BF",
        linking: "carino",
        benchmark_id: "BMK_GLOBAL_BALANCED_60_40",
        benchmark_return_source: "calculated",
        active_return_pct: 0.52,
        sum_of_effects_pct: 0.5,
        residual_pct: 0.02,
        levels: [
          {
            dimension: "asset_class",
            allocation_total_pct: 0.18,
            selection_total_pct: 0.24,
            interaction_total_pct: 0.03,
            total_effect_pct: 0.45,
            rows: [
              {
                key_label: "Equity",
                portfolio_weight_avg_pct: 61,
                benchmark_weight_avg_pct: 58,
                portfolio_return_pct: 7.4,
                benchmark_return_pct: 6.8,
                allocation_pct: 0.18,
                selection_pct: 0.24,
                interaction_pct: 0.03,
                total_effect_pct: 0.45,
              },
            ],
          },
        ],
      },
      warnings: [],
      partial_failures: [],
    },
    attributionDimension: "asset_class",
    onRequestChange: vi.fn(),
    isUpdating: false,
    isDetailsPending: false,
    capabilities: supportedCapabilities,
    relativeSegmentRows: [
      {
        key_label: "Equity",
        portfolio_weight_avg_pct: 61,
        benchmark_weight_avg_pct: 58,
        portfolio_return_pct: 7.4,
        benchmark_return_pct: 6.8,
        allocation_pct: 0.18,
        selection_pct: 0.24,
        interaction_pct: 0.03,
        total_effect_pct: 0.45,
        active_weight_pct: 3,
        active_return_pct: 0.6,
      },
    ],
    topAttributionEffectRows: [
      {
        key_label: "Equity",
        portfolio_weight_avg_pct: 61,
        benchmark_weight_avg_pct: 58,
        portfolio_return_pct: 7.4,
        benchmark_return_pct: 6.8,
        allocation_pct: 0.18,
        selection_pct: 0.24,
        interaction_pct: 0.03,
        total_effect_pct: 0.45,
      },
    ],
    attributionEffectScale: 0.45,
    ...overrides,
  };
}

describe("PerformanceAnalysisAttributionSection", () => {
  it("renders benchmark-relative attribution detail and effect ranking", () => {
    render(<PerformanceAnalysisAttributionSection {...buildProps()} />);

    expect(screen.getByText("Attribution Detail")).toBeInTheDocument();
    expect(screen.getByText("Relative Segment Panel")).toBeInTheDocument();
    expect(screen.getByText("Total Effect Ranking")).toBeInTheDocument();
    expect(screen.getAllByText("BMK GLOBAL BALANCED 60 40").length).toBeGreaterThan(0);
    expect(screen.getByLabelText("Asset Class attribution table")).toBeInTheDocument();
    expect(screen.getByLabelText("Attribution effect legend")).toBeInTheDocument();
  });

  it("renders an actionable fallback when attribution detail is unavailable", () => {
    render(
      <PerformanceAnalysisAttributionSection
        {...buildProps({
          capabilities: {
            ...supportedCapabilities,
            attributionDetail: {
              state: "unavailable",
              reason: "Attribution detail is not available for the current selection.",
            },
          },
          relativeSegmentRows: [],
          topAttributionEffectRows: [],
        })}
      />
    );

    expect(screen.getByText("Attribution detail unavailable")).toBeInTheDocument();
    expect(screen.getByText("Attribution detail is not available for the current selection.")).toBeInTheDocument();
  });

  it("renders a partial-state panel when attribution coverage is incomplete", () => {
    render(
      <PerformanceAnalysisAttributionSection
        {...buildProps({
          capabilities: {
            ...supportedCapabilities,
            attributionDetail: {
              state: "partial",
              reason: "Benchmark-relative attribution is incomplete for the current selection.",
            },
          },
          relativeSegmentRows: [],
          topAttributionEffectRows: [],
        })}
      />
    );

    expect(screen.getByText("Attribution detail is partial")).toBeInTheDocument();
    expect(screen.getByText("Benchmark-relative attribution is incomplete for the current selection.")).toBeInTheDocument();
  });
});
