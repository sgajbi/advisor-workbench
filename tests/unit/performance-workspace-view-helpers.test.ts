import { describe, expect, it } from "vitest";

import {
  getPerformanceExecutiveReturnPresentation,
  getPerformanceSummaryFirstPaintPresentation,
  getPerformanceSummaryHeaderPresentation,
  getPerformanceTrustStripPresentation,
} from "../../src/apps/performance/components/performance-workspace-view-helpers";
import {
  buildBenchmarkUnassignedPerformanceScenario,
  buildPartialBenchmarkPerformanceScenario,
  buildPerformancePresentationScenario,
} from "../fixtures/performance-workspace-fixtures";

describe("getPerformanceSummaryHeaderPresentation", () => {
  it("builds benchmark-unassigned presentation honestly when relative analytics are unavailable", () => {
    const scenario = buildPerformancePresentationScenario({
      fixtureOptions: {
        unassignedBenchmark: true,
        unavailableSummarySeries: true,
      },
      capabilityOverrides: {
        returnPath: { state: "unavailable", reason: "Return observations unavailable." },
        benchmarkComparison: {
          state: "unavailable",
          reason: "No benchmark is assigned to this mandate.",
        },
      },
      workspaceOverrides: {
        money_weighted_return: null,
      },
      selectedPerformanceOverrides: {
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
      selectedBenchmarkCode: undefined,
      selectedBenchmarkLabel: null,
      hasMoneyWeightedReturn: false,
    });

    const presentation = getPerformanceSummaryHeaderPresentation({
      workspace: scenario.workspace,
      detailBasis: "NET",
      capabilities: scenario.capabilities,
      selectedBenchmarkCode: scenario.selectedBenchmarkCode,
      selectedBenchmarkLabel: scenario.selectedBenchmarkLabel,
      selectedPerformance: scenario.selectedPerformance,
      hasMoneyWeightedReturn: scenario.hasMoneyWeightedReturn,
      suspiciousMoneyWeightedReturn: scenario.suspiciousMoneyWeightedReturn,
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
    const scenario = buildPerformancePresentationScenario();

    const presentation = getPerformanceSummaryHeaderPresentation({
      workspace: scenario.workspace,
      detailBasis: "NET",
      capabilities: scenario.capabilities,
      selectedBenchmarkCode: scenario.selectedBenchmarkCode,
      selectedBenchmarkLabel: scenario.selectedBenchmarkLabel,
      selectedPerformance: scenario.selectedPerformance,
      hasMoneyWeightedReturn: scenario.hasMoneyWeightedReturn,
      suspiciousMoneyWeightedReturn: scenario.suspiciousMoneyWeightedReturn,
    });

    expect(presentation.hasBenchmark).toBe(true);
    expect(presentation.benchmarkValue).toBe("Global Balanced 60/40");
    expect(presentation.primaryReturnCard.support).toContain("Active 0.52%");
    expect(presentation.benchmarkCard.value).toBe("4.91%");
    expect(presentation.activeCard.value).toBe("0.52%");
    expect(presentation.moneyWeightedCard.support).toContain("Annualized 5.12%");
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
    const scenario = buildPerformancePresentationScenario();

    const presentation = getPerformanceExecutiveReturnPresentation({
      workspace: scenario.workspace,
      detailBasis: "NET",
      selectedPerformance: scenario.selectedPerformance,
      selectedBenchmarkLabel: scenario.selectedBenchmarkLabel,
      capabilities: scenario.capabilities,
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
    const scenario = buildPerformancePresentationScenario({
      capabilityOverrides: {
        contributionDetail: {
          state: "partial",
          reason: "Contribution exists, but only aggregate rows are available.",
        },
      },
    });

    const presentation = getPerformanceTrustStripPresentation({
      capabilities: scenario.capabilities,
    });

    expect(presentation.items.find((item) => item.label === "Benchmark")?.value).toBe("Assigned");
    expect(presentation.items.find((item) => item.label === "Contribution")?.value).toBe("Partial");
    expect(presentation.items.find((item) => item.label === "Evidence")?.value).toBe("Pending");
  });

  it("maps unavailable and pending trust states with explicit tones", () => {
    const scenario = buildPerformancePresentationScenario({
      capabilityOverrides: {
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

    const presentation = getPerformanceTrustStripPresentation({
      capabilities: scenario.capabilities,
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
      scenario: buildPerformancePresentationScenario(),
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
      scenario: buildPartialBenchmarkPerformanceScenario(),
      expectedObservation: { value: "Relative measurement", tone: "success" },
      expectedTrust: {
        benchmark: { value: "Partial", tone: "warn" },
        history: { value: "Ready", tone: "success" },
        attribution: { value: "Ready", tone: "success" },
        evidence: { value: "Pending", tone: "default" },
      },
    },
    {
      name: "unassigned benchmark and missing history",
      scenario: buildBenchmarkUnassignedPerformanceScenario(),
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
      scenario,
      expectedObservation,
      expectedTrust,
    }) => {
      const presentation = getPerformanceSummaryFirstPaintPresentation({
        workspace: scenario.workspace,
        detailBasis: "NET",
        capabilities: scenario.capabilities,
        selectedBenchmarkCode: scenario.selectedBenchmarkCode,
        selectedBenchmarkLabel: scenario.selectedBenchmarkLabel,
        selectedPerformance: scenario.selectedPerformance,
        hasMoneyWeightedReturn: scenario.hasMoneyWeightedReturn,
        suspiciousMoneyWeightedReturn: scenario.suspiciousMoneyWeightedReturn,
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
