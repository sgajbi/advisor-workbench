import { describe, expect, it } from "vitest";

import type { PerformanceWorkspaceCapabilities } from "../../src/apps/performance/capabilities";
import {
  getPerformanceContributorsPresentation,
  getPerformanceHorizonContextPresentation,
} from "../../src/apps/performance/components/performance-summary-driver-helpers";
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

function buildContributorProps(
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

describe("performance summary driver helpers", () => {
  it("builds supported contributor ranking rows for summary-mode cards", () => {
    const presentation = getPerformanceContributorsPresentation(buildContributorProps());

    expect(presentation.mode).toBe("supported");
    if (presentation.mode !== "supported") {
      throw new Error("expected supported presentation");
    }
    expect(presentation.title).toBe("Top contributors and detractors");
    expect(presentation.subtitle).toBe("YTD position ranking");
    expect(presentation.positiveRows[0]).toMatchObject({
      title: "AAPL",
      subtitle: "Avg. Weight 24.00%",
      value: "1.50%",
      tone: "positive",
    });
    expect(presentation.negativeRows[0]).toMatchObject({
      title: "TLT",
      subtitle: "Avg. Weight 8.00%",
      value: "-0.20%",
      tone: "negative",
    });
  });

  it("builds a loading contributor presentation while detailed support is pending", () => {
    const presentation = getPerformanceContributorsPresentation(
      buildContributorProps({
        capabilities: {
          ...supportedCapabilities,
          contributionRanking: {
            state: "partial",
            reason: "Contribution exists, but only aggregate rows are available.",
          },
        },
        isDetailsPending: true,
        positivePositionContributors: [],
        negativePositionContributors: [],
      })
    );

    expect(presentation).toMatchObject({
      mode: "loading",
      body: "Loading contributor ranking for the selected analytical slice.",
    });
  });

  it("builds a capability notice presentation for partial or unavailable contributor ranking", () => {
    const presentation = getPerformanceContributorsPresentation(
      buildContributorProps({
        capabilities: {
          ...supportedCapabilities,
          contributionRanking: {
            state: "partial",
            reason: "Contribution exists, but only aggregate rows are available.",
          },
        },
        positivePositionContributors: [],
        negativePositionContributors: [],
      })
    );

    expect(presentation).toMatchObject({
      mode: "notice",
      noticeTitle: "Contributor ranking is partial",
      noticeBody: "Contribution exists, but only aggregate rows are available.",
    });
  });

  it("builds honest horizon context labels for supported and unavailable active return states", () => {
    expect(
      getPerformanceHorizonContextPresentation({
        period: "YTD",
        benchmarkLabel: "Global Balanced 60/40",
        selectedPeriodRow: {
          period: "YTD",
          portfolio_return_pct: 5.4,
          benchmark_return_pct: 4.9,
          active_return_pct: 0.5,
          annualized_return_pct: 5.4,
        },
      })
    ).toMatchObject({
      selectedPeriodLabel: "YTD",
      activeReturnLabel: "0.50%",
      benchmarkLabel: "Global Balanced 60/40",
    });

    expect(
      getPerformanceHorizonContextPresentation({
        period: "YTD",
        benchmarkLabel: "Benchmark",
        selectedPeriodRow: {
          period: "YTD",
          portfolio_return_pct: 5.4,
          benchmark_return_pct: null,
          active_return_pct: null,
          annualized_return_pct: 5.4,
        },
      })
    ).toMatchObject({
      selectedPeriodLabel: "YTD",
      activeReturnLabel: "Unavailable",
      benchmarkLabel: "Benchmark",
    });
  });
});
