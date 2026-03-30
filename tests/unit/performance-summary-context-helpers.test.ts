import { describe, expect, it } from "vitest";

import { getPerformanceReturnPathPresentation } from "../../src/apps/performance/components/performance-summary-context-helpers";
import {
  buildBenchmarkUnassignedPerformanceScenario,
  buildPartialBenchmarkPerformanceScenario,
  buildSupportedPerformanceScenario,
} from "../fixtures/performance-workspace-fixtures";

describe("performance summary context helpers", () => {
  it("builds a supported return-path presentation from summary data", () => {
    const scenario = buildSupportedPerformanceScenario();

    const presentation = getPerformanceReturnPathPresentation({
      summary: {
        portfolio_return_pct: scenario.workspace.net_performance.portfolio_return_pct,
        benchmark_return_pct: scenario.workspace.net_performance.benchmark_return_pct,
        active_return_pct: scenario.workspace.net_performance.active_return_pct,
      },
      points: scenario.workspace.net_chart,
      benchmark: scenario.workspace.benchmark_code ?? undefined,
      benchmarkOptions: scenario.workspace.benchmark_options ?? [],
      capabilities: scenario.capabilities,
    });

    expect(presentation).toMatchObject({
      benchmarkAssigned: true,
      benchmarkLabel: "Global Balanced 60/40",
      activeReturnValue: "0.52%",
      relativeContextStatus: "available",
      benchmarkStateBody: null,
    });
    expect(presentation.metrics).toEqual([
      { label: "Portfolio Return", value: "5.42%", unavailable: false },
      { label: "Benchmark Return", value: "4.91%", unavailable: false },
      { label: "Active Return", value: "0.52%", unavailable: false },
      { label: "Observations", value: 1, unavailable: false },
    ]);
  });

  it("keeps an assigned benchmark visible when relative comparison is partial", () => {
    const scenario = buildPartialBenchmarkPerformanceScenario();

    const presentation = getPerformanceReturnPathPresentation({
      summary: {
        portfolio_return_pct: scenario.workspace.net_performance.portfolio_return_pct,
        benchmark_return_pct: scenario.workspace.net_performance.benchmark_return_pct,
        active_return_pct: scenario.workspace.net_performance.active_return_pct,
      },
      points: scenario.workspace.net_chart,
      benchmark: scenario.workspace.benchmark_code ?? undefined,
      benchmarkOptions: scenario.workspace.benchmark_options ?? [],
      capabilities: scenario.capabilities,
    });

    expect(presentation).toMatchObject({
      benchmarkAssigned: true,
      benchmarkLabel: "Global Balanced 60/40",
      activeReturnValue: "Unavailable",
      relativeContextStatus: "partial",
      benchmarkStateBody: null,
    });
    expect(presentation.metrics[1]).toMatchObject({
      label: "Benchmark Return",
      value: "Unavailable",
      unavailable: true,
    });
    expect(presentation.metrics[2]).toMatchObject({
      label: "Active Return",
      value: "Unavailable",
      unavailable: true,
    });
  });

  it("builds an honest benchmark-unassigned presentation without fake comparison values", () => {
    const scenario = buildBenchmarkUnassignedPerformanceScenario();

    const presentation = getPerformanceReturnPathPresentation({
      summary: {
        portfolio_return_pct: 6.2,
        benchmark_return_pct: null,
        active_return_pct: null,
      },
      points: [
        {
          label: "2026-03",
          frequency: "monthly",
          period_start: "2026-03-01",
          period_end: "2026-03-27",
          portfolio_return_pct: 1.4,
          benchmark_return_pct: null,
          active_return_pct: null,
          cumulative_portfolio_return_pct: 6.2,
          cumulative_benchmark_return_pct: null,
          cumulative_active_return_pct: null,
        },
      ],
      capabilities: {
        ...scenario.capabilities,
        returnPath: { state: "supported" },
      },
    });

    expect(presentation).toMatchObject({
      benchmarkAssigned: false,
      benchmarkLabel: "Benchmark",
      activeReturnValue: "Unavailable",
      relativeContextStatus: "unavailable",
      benchmarkStateBody: "No benchmark is assigned to this mandate.",
    });
    expect(presentation.metrics[1]).toMatchObject({
      label: "Benchmark Return",
      value: "Unavailable",
      unavailable: true,
    });
  });
});
