import { describe, expect, it } from "vitest";

import type {
  PerformanceBenchmarkOptionView,
  PerformanceChartPoint,
} from "../../src/features/workbench/types";
import {
  buildChartLegendItems,
  buildObservationCountLabel,
  buildResolvedBenchmarkOptions,
  buildReturnDecisionItems,
  buildSingleObservationPresentation,
  hasActiveReturnSeries,
  hasBenchmarkReturnSeries,
  resolveWindowAndBasisLabels,
} from "../../src/apps/performance/components/performance-chart-panel-helpers";
import type { PerformanceReturnPathPresentation } from "../../src/apps/performance/components/performance-summary-context-helpers";

function buildPresentation(
  overrides: Partial<PerformanceReturnPathPresentation> = {}
): PerformanceReturnPathPresentation {
  return {
    benchmarkAssigned: true,
    benchmarkLabel: "Private Banking Global Balanced 60/40",
    benchmarkSourceLabel: "Calculated",
    benchmarkContextValue: "Private Banking Global Balanced 60/40 • USD",
    portfolioReturnValue: "16.19%",
    benchmarkReturnValue: "5.53%",
    activeReturnValue: "10.66%",
    relativeContextStatus: "available",
    benchmarkStateBody: null,
    metrics: [
      { key: "portfolio-return", label: "Portfolio Return", value: "16.19%" },
      { key: "benchmark-return", label: "Benchmark Return", value: "5.53%" },
      { key: "active-return", label: "Active Return", value: "10.66%" },
      {
        key: "mwrr",
        label: "Money-Weighted Return",
        value: "-30.04%",
        definition: "Annualized money-weighted return.",
      },
      { key: "opening-mv", label: "Opening MV", value: "$1,291,570" },
      { key: "net-flow", label: "Net Flow", value: "$14,725" },
    ],
    ...overrides,
  };
}

function buildPoint(overrides: Partial<PerformanceChartPoint> = {}): PerformanceChartPoint {
  return {
    label: "Apr '26",
    frequency: "monthly",
    period_start: "2026-04-01",
    period_end: "2026-04-30",
    portfolio_return_pct: 1.4,
    benchmark_return_pct: 0.9,
    active_return_pct: 0.5,
    cumulative_portfolio_return_pct: 16.19,
    cumulative_benchmark_return_pct: 5.53,
    cumulative_active_return_pct: 10.66,
    ...overrides,
  };
}

describe("performance-chart-panel-helpers", () => {
  it("keeps existing benchmark options and synthesizes a fallback assigned benchmark when needed", () => {
    const explicitOptions: PerformanceBenchmarkOptionView[] = [
      {
        benchmark_code: "BMK_60_40",
        benchmark_name: "Private Banking Global Balanced 60/40",
        benchmark_currency: "USD",
        is_assigned: true,
      },
    ];

    expect(
      buildResolvedBenchmarkOptions({
        benchmark: "BMK_60_40",
        benchmarkOptions: explicitOptions,
      })
    ).toEqual(explicitOptions);

    expect(
      buildResolvedBenchmarkOptions({
        benchmark: "BMK_SYNTHETIC",
        benchmarkOptions: [],
      })
    ).toEqual([
      {
        benchmark_code: "BMK_SYNTHETIC",
        benchmark_name: "BMK_SYNTHETIC",
        is_assigned: true,
      },
    ]);

    expect(
      buildResolvedBenchmarkOptions({
        benchmark: undefined,
        benchmarkOptions: [],
      })
    ).toEqual([]);
  });

  it("moves return headline metrics into the summary row when the chart is renderable", () => {
    const presentation = buildPresentation();

    const renderable = buildReturnDecisionItems(presentation, true);
    expect(renderable.summaryItems.map((item) => item.key)).toEqual([
      "active-return",
      "money-weighted-return",
      "portfolio-return",
      "benchmark-return",
    ]);
    expect(renderable.outcomeItems.map((item) => item.key)).toEqual(["opening-mv", "net-flow"]);

    const fallback = buildReturnDecisionItems(presentation, false);
    expect(fallback.outcomeItems.map((item) => item.key)).toEqual([
      "mwrr",
      "opening-mv",
      "net-flow",
    ]);
  });

  it("builds single-observation comparison rows with stable axis geometry", () => {
    const observation = buildSingleObservationPresentation({
      points: [buildPoint()],
      chartViewMode: "combined",
      hasBenchmarkSeries: true,
    });

    expect(observation).not.toBeNull();
    expect(observation?.observationLabel).toBe("Apr '26");
    expect(observation?.axisMinLabel).toMatch(/^-?\d+(\.\d+)?%$/);
    expect(observation?.axisMaxLabel).toMatch(/^[+]?\d+(\.\d+)?%$/);
    expect(observation?.rows.map((row) => row.key)).toEqual([
      "portfolio",
      "benchmark",
      "active",
    ]);

    for (const row of observation?.rows ?? []) {
      expect(row.markerPct).toBeGreaterThanOrEqual(0);
      expect(row.markerPct).toBeLessThanOrEqual(100);
      expect(row.startPct).toBeGreaterThanOrEqual(0);
      expect(row.startPct).toBeLessThanOrEqual(100);
      expect(row.widthPct).toBeGreaterThan(0);
    }

    expect(
      buildSingleObservationPresentation({
        points: [buildPoint(), buildPoint({ label: "May '26" })],
        chartViewMode: "combined",
        hasBenchmarkSeries: true,
      })
    ).toBeNull();
  });

  it("derives benchmark and active series availability from the resolved point data", () => {
    expect(
      hasBenchmarkReturnSeries([
        buildPoint({
          benchmark_return_pct: null,
          cumulative_benchmark_return_pct: null,
        }),
      ])
    ).toBe(false);

    expect(
      hasActiveReturnSeries([
        buildPoint({
          active_return_pct: null,
          cumulative_active_return_pct: null,
          portfolio_return_pct: 2.1,
          benchmark_return_pct: 1.3,
          cumulative_portfolio_return_pct: 4.5,
          cumulative_benchmark_return_pct: 2.7,
        }),
      ])
    ).toBe(true);
  });

  it("resolves review window, basis, legend, and observation copy through shared helpers", () => {
    expect(
      resolveWindowAndBasisLabels({
        period: "YTD",
        detailBasis: "NET",
        startDate: "2026-01-01",
        endDate: "2026-04-14",
      })
    ).toEqual({
      resolvedWindowLabel: "01 Jan 2026 - 14 Apr 2026",
      resolvedBasisLabel: "Net",
    });

    expect(buildObservationCountLabel(3)).toBe("3 published observations remain visible.");
    expect(buildObservationCountLabel(0)).toBe(
      "No published return observations are exposed for this resolved window."
    );

    expect(
      buildChartLegendItems({
        hasBenchmarkSeries: true,
        hasActiveSeries: true,
      }).map((item) => item.label)
    ).toEqual(["Portfolio", "Benchmark", "Active"]);
  });
});
