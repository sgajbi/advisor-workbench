import { describe, expect, it } from "vitest";

import type { WorkbenchPerformanceWorkspace } from "../../src/features/workbench/types";
import { getPerformanceWorkspaceCapabilities } from "../../src/apps/performance/capabilities";
import {
  getBottomContributionRows,
  getBottomPositionContributionRows,
  getCoverageLabel,
  getNegativePositionContributionRows,
  getPerformanceWorkspacePresentation,
  getPrimaryContributionRow,
  getPositivePositionContributionRows,
  getTopAttributionEffectRows,
  getTopContributionRows,
  getTopPositionContributionRows,
  hasBenchmarkContext,
  hasDistinctGrossPerformance,
  hasMeaningfulHistory,
  hasPositionContributionRanking,
  isMoneyWeightedReturnSuspicious,
} from "../../src/apps/performance/view-model";

function buildWorkspace(overrides: Partial<WorkbenchPerformanceWorkspace> = {}): WorkbenchPerformanceWorkspace {
  return {
    correlation_id: "corr",
    contract_version: "v1",
    portfolio_id: "PF_1",
    as_of_date: "2026-03-26",
    requested_as_of_date: null,
    effective_as_of_date: "2026-03-26",
    requested_reporting_currency: null,
    effective_reporting_currency: "USD",
    reporting_currency_state: "accepted_unverified",
    period: "YTD",
    report_start_date: "2026-01-01",
    report_end_date: "2026-03-26",
    chart_frequency: "monthly",
    contribution_dimension: "asset_class",
    attribution_dimension: "asset_class",
    detail_basis: "NET",
    benchmark_code: null,
    portfolio: {
      portfolio_id: "PF_1",
      client_id: "CIF_1",
      base_currency: "USD",
      booking_center_code: "SG",
    },
    overview: {
      market_value_base: 1000000,
      cash_weight_pct: 10,
      position_count: 12,
    },
    net_performance: {
      metric_basis: "NET",
      portfolio_return_pct: 5,
      benchmark_return_pct: null,
      active_return_pct: null,
      annualized_return_pct: 5,
      benchmark_id: null,
      benchmark_return_source: null,
    },
    gross_performance: {
      metric_basis: "GROSS",
      portfolio_return_pct: 5,
      benchmark_return_pct: null,
      active_return_pct: null,
      annualized_return_pct: 5,
      benchmark_id: null,
      benchmark_return_source: null,
    },
    money_weighted_return: {
      money_weighted_return_pct: 4,
      annualized_return_pct: 4,
      method: "XIRR",
      start_date: "2026-01-01",
      end_date: "2026-03-26",
      notes: [],
    },
    net_chart: [
      {
        label: "2026-01",
        frequency: "monthly",
        period_start: "2026-01-01",
        period_end: "2026-01-31",
        portfolio_return_pct: 2,
        benchmark_return_pct: null,
        active_return_pct: null,
        cumulative_portfolio_return_pct: 2,
        cumulative_benchmark_return_pct: null,
        cumulative_active_return_pct: null,
      },
      {
        label: "2026-02",
        frequency: "monthly",
        period_start: "2026-02-01",
        period_end: "2026-02-28",
        portfolio_return_pct: 3,
        benchmark_return_pct: null,
        active_return_pct: null,
        cumulative_portfolio_return_pct: 5,
        cumulative_benchmark_return_pct: null,
        cumulative_active_return_pct: null,
      },
    ],
    gross_chart: [
      {
        label: "2026-01",
        frequency: "monthly",
        period_start: "2026-01-01",
        period_end: "2026-01-31",
        portfolio_return_pct: 2,
        benchmark_return_pct: null,
        active_return_pct: null,
        cumulative_portfolio_return_pct: 2,
        cumulative_benchmark_return_pct: null,
        cumulative_active_return_pct: null,
      },
      {
        label: "2026-02",
        frequency: "monthly",
        period_start: "2026-02-01",
        period_end: "2026-02-28",
        portfolio_return_pct: 3,
        benchmark_return_pct: null,
        active_return_pct: null,
        cumulative_portfolio_return_pct: 5,
        cumulative_benchmark_return_pct: null,
        cumulative_active_return_pct: null,
      },
    ],
    contribution: {
      metric_basis: "NET",
      weighting_scheme: "BOD",
      portfolio_contribution_pct: 5,
      total_portfolio_return_pct: 5,
      coverage_mv_pct: 100,
      portfolio_local_contribution_pct: 4.6,
      portfolio_fx_contribution_pct: 0.4,
      position_rows: [
        {
          position_id: "AAPL",
          contribution_pct: 1.5,
          weight_avg_pct: 24,
          total_return_pct: 8,
          local_contribution_pct: 1.1,
          fx_contribution_pct: 0.4,
        },
        {
          position_id: "TLT",
          contribution_pct: -0.2,
          weight_avg_pct: 8,
          total_return_pct: -2,
          local_contribution_pct: -0.2,
          fx_contribution_pct: 0,
        },
      ],
      levels: [
        {
          level: 1,
          name: "asset_class",
          total_contribution_pct: 5,
          rows: [
            {
              key_label: "Equity",
              contribution_pct: 3.5,
              weight_avg_pct: 55,
              local_contribution_pct: 3.1,
              fx_contribution_pct: 0.4,
              is_other: false,
            },
            {
              key_label: "Fixed Income",
              contribution_pct: 1.2,
              weight_avg_pct: 30,
              local_contribution_pct: 1.2,
              fx_contribution_pct: 0,
              is_other: false,
            },
          ],
        },
      ],
    },
    attribution: {
      metric_basis: "NET",
      model: "BF",
      linking: "carino",
      benchmark_id: "BMK_GLOBAL_BALANCED_60_40",
      benchmark_return_source: "calculated",
      active_return_pct: 0.5,
      sum_of_effects_pct: 0.45,
      residual_pct: 0.05,
      levels: [
        {
          dimension: "asset_class",
          total_effect_pct: 0.45,
          rows: [
            {
              key_label: "Equity",
              portfolio_weight_avg_pct: 55,
              benchmark_weight_avg_pct: 48,
              portfolio_return_pct: 7.8,
              benchmark_return_pct: 6.9,
              allocation_pct: 0.15,
              selection_pct: 0.22,
              interaction_pct: 0.03,
              total_effect_pct: 0.4,
            },
            {
              key_label: "Fixed Income",
              portfolio_weight_avg_pct: 30,
              benchmark_weight_avg_pct: 37,
              portfolio_return_pct: 2.1,
              benchmark_return_pct: 2.8,
              allocation_pct: -0.08,
              selection_pct: 0.02,
              interaction_pct: 0.01,
              total_effect_pct: -0.05,
            },
          ],
        },
      ],
    },
    warnings: [],
    partial_failures: [],
    ...overrides,
  };
}

describe("performance view model", () => {
  it("detects benchmark context only when benchmark data exists", () => {
    expect(
      hasBenchmarkContext(
        buildWorkspace({
          attribution: null,
        })
      )
    ).toBe(false);
    expect(
      hasBenchmarkContext(
        buildWorkspace({
          net_performance: {
            ...buildWorkspace().net_performance,
            benchmark_return_pct: 4.2,
          },
        })
      )
    ).toBe(true);
  });

  it("treats identical gross and net series as not distinct", () => {
    expect(hasDistinctGrossPerformance(buildWorkspace())).toBe(false);
    expect(
      hasDistinctGrossPerformance(
        buildWorkspace({
          gross_performance: {
            ...buildWorkspace().gross_performance,
            portfolio_return_pct: 5.4,
          },
        })
      )
    ).toBe(true);
  });

  it("flags suspicious money-weighted returns and derives primary contribution row", () => {
    const suspicious = buildWorkspace({
      money_weighted_return: {
        ...buildWorkspace().money_weighted_return!,
        money_weighted_return_pct: -99,
      },
    });

    expect(isMoneyWeightedReturnSuspicious(suspicious)).toBe(true);
    expect(getPrimaryContributionRow(buildWorkspace())?.key_label).toBe("Equity");
  });

  it("summarizes coverage and history", () => {
    expect(getCoverageLabel(buildWorkspace())).toBe("Full coverage");
    expect(hasMeaningfulHistory(buildWorkspace().net_chart)).toBe(true);
    expect(hasMeaningfulHistory(buildWorkspace({ net_chart: [buildWorkspace().net_chart[0]] }).net_chart)).toBe(false);
  });

  it("prefers position-level contribution rankings when available", () => {
    const workspace = buildWorkspace();
    expect(hasPositionContributionRanking(workspace)).toBe(true);
    expect(getTopPositionContributionRows(workspace)[0]?.position_id).toBe("AAPL");
    expect(getBottomPositionContributionRows(workspace)[0]?.position_id).toBe("TLT");
    expect(getPositivePositionContributionRows(workspace)[0]?.position_id).toBe("AAPL");
    expect(getNegativePositionContributionRows(workspace)[0]?.position_id).toBe("TLT");
    expect(
      getNegativePositionContributionRows(
        buildWorkspace({
          contribution: {
            ...buildWorkspace().contribution!,
            position_rows: [
              {
                position_id: "AAPL",
                contribution_pct: 0,
                weight_avg_pct: 24,
                total_return_pct: 8,
                local_contribution_pct: 0,
                fx_contribution_pct: 0,
              },
            ],
          },
        })
      )
    ).toEqual([]);
  });

  it("ranks attribution effects by absolute magnitude", () => {
    const workspace = buildWorkspace();
    expect(getTopAttributionEffectRows(workspace)[0]?.key_label).toBe("Equity");
  });

  it("builds a consolidated workspace presentation for summary and analysis modes", () => {
    const workspace = buildWorkspace();
    const presentation = getPerformanceWorkspacePresentation(workspace);

    expect(presentation).toMatchObject({
      hasBenchmark: true,
      hasAttribution: true,
      hasContribution: true,
      hasHistory: true,
      hasPositionRanking: true,
      hasMoneyWeightedReturn: true,
      suspiciousMoneyWeightedReturn: false,
      contributorScale: 1.5,
    });
    expect(presentation.primaryDriver?.key_label).toBe(getPrimaryContributionRow(workspace)?.key_label);
    expect(presentation.positivePositionContributors).toEqual(
      getPositivePositionContributionRows(workspace)
    );
    expect(presentation.negativePositionContributors).toEqual(
      getNegativePositionContributionRows(workspace)
    );
    expect(presentation.topContributors).toEqual(getTopContributionRows(workspace));
    expect(presentation.bottomContributors).toEqual(getBottomContributionRows(workspace));
  });

  it("falls back to contribution-row ranking scale when no position ranking exists", () => {
    const workspace = buildWorkspace({
      contribution: {
        ...buildWorkspace().contribution!,
        position_rows: [],
      },
    });

    const presentation = getPerformanceWorkspacePresentation(workspace);

    expect(presentation.hasPositionRanking).toBe(false);
    expect(presentation.positivePositionContributors).toEqual([]);
    expect(presentation.negativePositionContributors).toEqual([]);
    expect(presentation.topContributors).toEqual(getTopContributionRows(workspace));
    expect(presentation.bottomContributors).toEqual(getBottomContributionRows(workspace));
    expect(presentation.contributorScale).toBe(3.5);
  });

  it("builds explicit performance workspace capabilities for supported, partial, and unavailable features", () => {
    const supportedCapabilities = getPerformanceWorkspaceCapabilities(buildWorkspace());

    expect(supportedCapabilities.summaryKpis.state).toBe("supported");
    expect(supportedCapabilities.returnPath.state).toBe("supported");
    expect(supportedCapabilities.benchmarkComparison.state).toBe("partial");
    expect(supportedCapabilities.multiHorizonReturns.state).toBe("supported");
    expect(supportedCapabilities.contributionRanking.state).toBe("supported");
    expect(supportedCapabilities.attributionDetail.state).toBe("supported");
    expect(supportedCapabilities.contributionDetail.state).toBe("supported");
    expect(supportedCapabilities.evidence.state).toBe("unavailable");

    const partialCapabilities = getPerformanceWorkspaceCapabilities(
      buildWorkspace({
        net_chart: [buildWorkspace().net_chart[0]],
        contribution: {
          ...buildWorkspace().contribution!,
          position_rows: [],
        },
        net_performance: {
          ...buildWorkspace().net_performance,
          benchmark_return_pct: null,
          active_return_pct: null,
        },
      })
    );

    expect(partialCapabilities.returnPath.state).toBe("supported");
    expect(partialCapabilities.benchmarkComparison.state).toBe("partial");
    expect(partialCapabilities.contributionRanking.state).toBe("partial");
  });

  it("prefers backend-owned capability metadata when the contract provides it", () => {
    const capabilities = getPerformanceWorkspaceCapabilities(
      buildWorkspace({
        capabilities: {
          summary_kpis: { state: "supported", reason: "Summary supported." },
          return_path: {
            state: "unavailable",
            reason: "No published return history.",
            supported_frequencies: ["monthly", "quarterly"],
          },
          benchmark_comparison: { state: "partial", reason: "Benchmark-relative returns incomplete." },
          multi_horizon_returns: { state: "supported", reason: "Horizon comparison available." },
          contribution_ranking: {
            state: "partial",
            reason: "Only aggregate contribution rows are available.",
            supported_dimensions: ["asset_class", "sector", "country"],
          },
          attribution_detail: {
            state: "unavailable",
            reason: "Attribution detail unavailable.",
            supported_dimensions: ["asset_class", "sector", "country", "currency"],
            supported_frequencies: ["monthly", "quarterly"],
          },
          contribution_detail: {
            state: "partial",
            reason: "Contribution detail is aggregate-only.",
            supported_dimensions: ["asset_class", "sector", "country"],
          },
          evidence: { state: "unavailable", reason: "Evidence contract unavailable." },
        },
      })
    );

    expect(capabilities.returnPath).toMatchObject({
      state: "unavailable",
      reason: "No published return history.",
    });
    expect(capabilities.benchmarkComparison).toMatchObject({
      state: "partial",
      reason: "Benchmark-relative returns incomplete.",
    });
    expect(capabilities.contributionRanking).toMatchObject({
      state: "partial",
      reason: "Only aggregate contribution rows are available.",
    });
    expect(capabilities.attributionDetail).toMatchObject({
      state: "unavailable",
      reason: "Attribution detail unavailable.",
    });
    expect(capabilities.contributionRanking.supportedDimensions).toEqual([
      "asset_class",
      "sector",
      "country",
    ]);
    expect(capabilities.attributionDetail.supportedDimensions).toEqual([
      "asset_class",
      "sector",
      "country",
      "currency",
    ]);
    expect(capabilities.attributionDetail.supportedFrequencies).toEqual([
      "monthly",
      "quarterly",
    ]);
  });
});
