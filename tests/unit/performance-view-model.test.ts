import { describe, expect, it } from "vitest";

import type { WorkbenchPerformanceWorkspace } from "../../src/features/workbench/types";
import {
  getBottomPositionContributionRows,
  getCoverageLabel,
  getPrimaryContributionRow,
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
    attribution: null,
    warnings: [],
    partial_failures: [],
    ...overrides,
  };
}

describe("performance view model", () => {
  it("detects benchmark context only when benchmark data exists", () => {
    expect(hasBenchmarkContext(buildWorkspace())).toBe(false);
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
  });
});
