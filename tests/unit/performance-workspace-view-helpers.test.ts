import { describe, expect, it } from "vitest";

import type { PerformanceWorkspaceCapabilities } from "../../src/apps/performance/capabilities";
import {
  getPerformanceExecutiveReturnPresentation,
  getPerformanceSummaryFirstPaintPresentation,
  getPerformanceSummaryHeaderPresentation,
  getPerformanceTrustStripPresentation,
} from "../../src/apps/performance/components/performance-workspace-view-helpers";
import type { WorkbenchPerformanceWorkspace } from "../../src/features/workbench/types";

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
      begin_market_value: 950000,
      end_market_value: 1000000,
      net_cash_flow: 20000,
    },
    gross_performance: {
      metric_basis: "GROSS",
      portfolio_return_pct: 1.4,
      benchmark_return_pct: 1,
      active_return_pct: 0.4,
      annualized_return_pct: 1.4,
      benchmark_id: "BMK_1",
      benchmark_return_source: "calculated",
      begin_market_value: 950000,
      end_market_value: 1000000,
      net_cash_flow: 20000,
    },
    money_weighted_return: {
      money_weighted_return_pct: 1.1,
      annualized_return_pct: 1.1,
      method: "XIRR",
      start_date: "2026-01-01",
      end_date: "2026-03-29",
      notes: [],
    },
    net_chart: [
      {
        label: "2026-01",
        frequency: "monthly",
        period_start: "2026-01-01",
        period_end: "2026-01-31",
        portfolio_return_pct: 1,
        benchmark_return_pct: 0.8,
        active_return_pct: 0.2,
        cumulative_portfolio_return_pct: 1,
        cumulative_benchmark_return_pct: 0.8,
        cumulative_active_return_pct: 0.2,
      },
    ],
    gross_chart: [],
    contribution: null,
    attribution: null,
    warnings: [],
    partial_failures: [],
  } as WorkbenchPerformanceWorkspace;
}

describe("getPerformanceSummaryHeaderPresentation", () => {
  it("builds benchmark-unassigned presentation honestly when relative analytics are unavailable", () => {
    const workspace = buildWorkspace();
    workspace.benchmark_code = null;
    workspace.money_weighted_return = null;
    workspace.net_chart = [];

    const presentation = getPerformanceSummaryHeaderPresentation({
      workspace,
      detailBasis: "NET",
      capabilities: {
        ...supportedCapabilities,
        returnPath: { state: "unavailable", reason: "Return observations unavailable." },
        benchmarkComparison: {
          state: "unavailable",
          reason: "No benchmark is assigned to this mandate.",
        },
      },
      selectedBenchmarkCode: undefined,
      selectedBenchmarkLabel: null,
      selectedPerformance: {
        ...workspace.net_performance,
        portfolio_return_pct: null,
        benchmark_return_pct: null,
        active_return_pct: null,
        annualized_return_pct: null,
        benchmark_id: null,
        benchmark_return_source: null,
        begin_market_value: null,
        end_market_value: null,
        net_cash_flow: null,
      },
      hasMoneyWeightedReturn: false,
      suspiciousMoneyWeightedReturn: false,
    });

    expect(presentation.hasBenchmark).toBe(false);
    expect(presentation.hasHistory).toBe(false);
    expect(presentation.benchmarkValue).toBe("Unassigned");
    expect(presentation.benchmarkHint).toBe("Assign a benchmark to enable relative analytics.");
    expect(presentation.primaryReturnCard.value).toBe("Unavailable");
    expect(presentation.benchmarkCard.unavailable).toBe(true);
    expect(presentation.activeCard.support).toBe("No benchmark is assigned to this mandate.");
    expect(presentation.moneyWeightedCard.value).toBe("Unavailable");
    expect(presentation.contextCards.find((card) => card.label === "Benchmark")?.value).toBe("Unassigned");
    expect(presentation.observationItems[2]).toMatchObject({
      value: "Limited history",
      tone: "warn",
    });
    expect(presentation.observationItems[3]).toMatchObject({
      value: "No benchmark assigned",
      tone: "warn",
    });
  });

  it("builds relative performance presentation when benchmark analytics are supported", () => {
    const workspace = buildWorkspace();

    const presentation = getPerformanceSummaryHeaderPresentation({
      workspace,
      detailBasis: "NET",
      capabilities: supportedCapabilities,
      selectedBenchmarkCode: "BMK_1",
      selectedBenchmarkLabel: "Global Balanced 60/40",
      selectedPerformance: workspace.net_performance,
      hasMoneyWeightedReturn: true,
      suspiciousMoneyWeightedReturn: false,
    });

    expect(presentation.hasBenchmark).toBe(true);
    expect(presentation.benchmarkValue).toBe("Global Balanced 60/40");
    expect(presentation.primaryReturnCard.support).toContain("Active 0.25%");
    expect(presentation.benchmarkCard.value).toBe("1.00%");
    expect(presentation.activeCard.value).toBe("0.25%");
    expect(presentation.moneyWeightedCard.support).toContain("Annualized 1.10%");
    expect(presentation.contextCards.find((card) => card.label === "Period")?.value).toBe("YTD");
    expect(presentation.observationItems[2]).toMatchObject({
      value: "1 observations",
      tone: "success",
    });
    expect(presentation.observationItems[3]).toMatchObject({
      value: "Relative measurement",
      tone: "success",
    });
  });

  it("builds executive return strip metrics for front-office first paint", () => {
    const workspace = buildWorkspace();

    const presentation = getPerformanceExecutiveReturnPresentation({
      workspace,
      detailBasis: "NET",
      selectedPerformance: workspace.net_performance,
      selectedBenchmarkLabel: "Global Balanced 60/40",
      capabilities: supportedCapabilities,
    });

    expect(presentation.cards.map((card) => card.label)).toEqual([
      "Portfolio Return",
      "Benchmark Return",
      "Active Return",
      "Basis",
      "Period",
      "Benchmark",
    ]);
    expect(presentation.cards.find((card) => card.label === "Benchmark")?.value).toBe(
      "Global Balanced 60/40"
    );
  });

  it("builds compact trust-strip statuses from workspace capabilities", () => {
    const presentation = getPerformanceTrustStripPresentation({
      capabilities: {
        ...supportedCapabilities,
        contributionDetail: {
          state: "partial",
          reason: "Contribution exists, but only aggregate rows are available.",
        },
      },
    });

    expect(presentation.items.find((item) => item.label === "Benchmark")?.value).toBe("Assigned");
    expect(presentation.items.find((item) => item.label === "Contribution")?.value).toBe("Partial");
    expect(presentation.items.find((item) => item.label === "Evidence")?.value).toBe("Pending");
  });

  it("maps unavailable and pending trust states with explicit tones", () => {
    const presentation = getPerformanceTrustStripPresentation({
      capabilities: {
        ...supportedCapabilities,
        benchmarkComparison: {
          state: "unavailable",
          reason: "No benchmark is assigned to this mandate.",
        },
        returnPath: {
          state: "partial",
          reason: "Return observations are only partially published.",
        },
        attributionDetail: {
          state: "unavailable",
          reason: "Attribution detail is not available.",
        },
        evidence: {
          state: "unavailable",
          reason: "Evidence contract unavailable.",
        },
      },
    });

    expect(presentation.items.find((item) => item.label === "Benchmark")).toMatchObject({
      value: "Unassigned",
      tone: "danger",
    });
    expect(presentation.items.find((item) => item.label === "Return History")).toMatchObject({
      value: "Partial",
      tone: "warn",
    });
    expect(presentation.items.find((item) => item.label === "Attribution")).toMatchObject({
      value: "Unavailable",
      tone: "danger",
    });
    expect(presentation.items.find((item) => item.label === "Evidence")).toMatchObject({
      value: "Pending",
      tone: "default",
    });
  });

  it.each([
    {
      name: "supported benchmark and history",
      capabilities: supportedCapabilities,
      workspace: buildWorkspace(),
      selectedBenchmarkCode: "BMK_1",
      selectedBenchmarkLabel: "Global Balanced 60/40",
      selectedPerformance: buildWorkspace().net_performance,
      hasMoneyWeightedReturn: true,
      expectedObservation: { value: "Relative measurement", tone: "success" },
      expectedTrust: {
        benchmark: { value: "Assigned", tone: "success" },
        history: { value: "Ready", tone: "success" },
        attribution: { value: "Ready", tone: "success" },
        evidence: { value: "Pending", tone: "default" },
      },
    },
    {
      name: "partial relative analytics with limited attribution",
      capabilities: {
        ...supportedCapabilities,
        benchmarkComparison: {
          state: "partial" as const,
          reason: "A benchmark is assigned, but benchmark-relative returns are incomplete.",
        },
        attributionDetail: {
          state: "unavailable" as const,
          reason: "Attribution detail is not available for the current selection.",
        },
      },
      workspace: buildWorkspace(),
      selectedBenchmarkCode: "BMK_1",
      selectedBenchmarkLabel: "Global Balanced 60/40",
      selectedPerformance: {
        ...buildWorkspace().net_performance,
        benchmark_return_pct: null,
        active_return_pct: null,
      },
      hasMoneyWeightedReturn: true,
      expectedObservation: { value: "Relative measurement", tone: "success" },
      expectedTrust: {
        benchmark: { value: "Partial", tone: "warn" },
        history: { value: "Ready", tone: "success" },
        attribution: { value: "Unavailable", tone: "danger" },
        evidence: { value: "Pending", tone: "default" },
      },
    },
    {
      name: "unassigned benchmark and missing history",
      capabilities: {
        ...supportedCapabilities,
        benchmarkComparison: {
          state: "unavailable" as const,
          reason: "No benchmark is assigned to this mandate.",
        },
        returnPath: {
          state: "unavailable" as const,
          reason: "Return observations unavailable.",
        },
      },
      workspace: {
        ...buildWorkspace(),
        benchmark_code: null,
        net_chart: [],
        money_weighted_return: null,
      },
      selectedBenchmarkCode: undefined,
      selectedBenchmarkLabel: null,
      selectedPerformance: {
        ...buildWorkspace().net_performance,
        portfolio_return_pct: null,
        benchmark_return_pct: null,
        active_return_pct: null,
        annualized_return_pct: null,
        benchmark_id: null,
        benchmark_return_source: null,
        begin_market_value: null,
        end_market_value: null,
        net_cash_flow: null,
      },
      hasMoneyWeightedReturn: false,
      expectedObservation: { value: "No benchmark assigned", tone: "warn" },
      expectedTrust: {
        benchmark: { value: "Unassigned", tone: "danger" },
        history: { value: "Unavailable", tone: "danger" },
        attribution: { value: "Ready", tone: "success" },
        evidence: { value: "Pending", tone: "default" },
      },
    },
  ])(
    "builds a consistent first-paint contract for $name",
    ({
      capabilities,
      workspace,
      selectedBenchmarkCode,
      selectedBenchmarkLabel,
      selectedPerformance,
      hasMoneyWeightedReturn,
      expectedObservation,
      expectedTrust,
    }) => {
      const presentation = getPerformanceSummaryFirstPaintPresentation({
        workspace,
        detailBasis: "NET",
        capabilities,
        selectedBenchmarkCode,
        selectedBenchmarkLabel,
        selectedPerformance,
        hasMoneyWeightedReturn,
        suspiciousMoneyWeightedReturn: false,
      });

      expect(presentation.header.observationItems.at(-1)).toMatchObject(expectedObservation);
      expect(presentation.trust.items.find((item) => item.label === "Benchmark")).toMatchObject(
        expectedTrust.benchmark
      );
      expect(presentation.trust.items.find((item) => item.label === "Return History")).toMatchObject(
        expectedTrust.history
      );
      expect(presentation.trust.items.find((item) => item.label === "Attribution")).toMatchObject(
        expectedTrust.attribution
      );
      expect(presentation.trust.items.find((item) => item.label === "Evidence")).toMatchObject(
        expectedTrust.evidence
      );
      expect(presentation.executive.cards).toHaveLength(6);
    }
  );
});
