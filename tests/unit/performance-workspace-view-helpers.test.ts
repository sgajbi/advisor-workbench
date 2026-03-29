import { describe, expect, it } from "vitest";

import type { WorkbenchPerformanceWorkspace } from "../../src/features/workbench/types";
import {
  getAttributionTotals,
  getBenchmarkLabel,
  getContributionTotals,
  shouldShowContributionLocalFx,
} from "../../src/apps/performance/components/performance-workspace-view-helpers";

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
            {
              key_label: "Fixed Income",
              contribution_pct: 1.62,
              weight_avg_pct: 39,
              total_return_pct: 2.1,
              local_contribution_pct: 1.4,
              fx_contribution_pct: 0.22,
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
      benchmark_id: "BMK_1",
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
            {
              key_label: "Fixed Income",
              portfolio_weight_avg_pct: 39,
              benchmark_weight_avg_pct: 42,
              portfolio_return_pct: 2.1,
              benchmark_return_pct: 2.4,
              allocation_pct: -0.06,
              selection_pct: 0.02,
              interaction_pct: 0.01,
              total_effect_pct: -0.03,
            },
          ],
        },
      ],
    },
    warnings: [],
    partial_failures: [],
  } as WorkbenchPerformanceWorkspace;
}

describe("performance workspace view helpers", () => {
  it("prefers the configured benchmark option label and falls back to formatted code", () => {
    const workspace = buildWorkspace();

    expect(getBenchmarkLabel(workspace, "BMK_1")).toBe("Model 60/40");
    expect(getBenchmarkLabel(workspace, "CUSTOM_BENCHMARK")).toBe("CUSTOM BENCHMARK");
    expect(getBenchmarkLabel(workspace)).toBeNull();
  });

  it("detects when contribution detail should show local and FX columns", () => {
    const workspace = buildWorkspace();
    const level = workspace.contribution!.levels[0];

    expect(shouldShowContributionLocalFx(level, workspace)).toBe(true);

    const withoutLocalFx = {
      ...workspace,
      contribution: {
        ...workspace.contribution!,
        portfolio_local_contribution_pct: null,
        portfolio_fx_contribution_pct: null,
        levels: [
          {
            ...level,
            rows: level.rows.map((row) => ({
              ...row,
              local_contribution_pct: null,
              fx_contribution_pct: null,
            })),
          },
        ],
      },
    } as WorkbenchPerformanceWorkspace;

    expect(
      shouldShowContributionLocalFx(withoutLocalFx.contribution!.levels[0], withoutLocalFx)
    ).toBe(false);
  });

  it("aggregates contribution and attribution totals from workspace detail rows", () => {
    const workspace = buildWorkspace();
    const contributionTotals = getContributionTotals(workspace, workspace.contribution!.levels[0]);
    const attributionTotals = getAttributionTotals(workspace.attribution!.levels[0]);

    expect(contributionTotals).toEqual({
      portfolioContributionPct: 5.42,
      weightAvgPct: 100,
      localContributionPct: 4.8,
      fxContributionPct: 0.62,
    });
    expect(attributionTotals).toEqual({
      portfolioWeightAvgPct: 100,
      benchmarkWeightAvgPct: 100,
      portfolioReturnPct: null,
      benchmarkReturnPct: null,
      allocationPct: 0.12,
      selectionPct: 0.26,
      interactionPct: 0.04,
      totalEffectPct: 0.45,
    });
  });
});
