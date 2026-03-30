import { describe, expect, it } from "vitest";

import {
  getPerformanceExecutiveReturnPresentation,
  getPerformanceSummaryFirstPaintPresentation,
  getPerformanceTrustStripPresentation,
} from "../../src/apps/performance/components/performance-workspace-view-helpers";
import {
  buildBenchmarkUnassignedPerformanceScenario,
  buildCombinedPartialPerformanceScenario,
  buildPartialBenchmarkPerformanceScenario,
  buildPerformancePresentationScenario,
} from "../fixtures/performance-workspace-fixtures";

describe("performance first-paint helper contracts", () => {
  it("builds the executive return strip with the front-office metric set", () => {
    const scenario = buildPerformancePresentationScenario();

    const presentation = getPerformanceExecutiveReturnPresentation({
      workspace: scenario.workspace,
      detailBasis: "NET",
      selectedPerformance: scenario.selectedPerformance,
      capabilities: scenario.capabilities,
      hasMoneyWeightedReturn: scenario.hasMoneyWeightedReturn,
      suspiciousMoneyWeightedReturn: scenario.suspiciousMoneyWeightedReturn,
    });

    expect(presentation.cards.map((card) => card.label)).toEqual([
      "Portfolio Return",
      "Benchmark Return",
      "Active Return",
      "Money-Weighted Return",
      "Basis",
      "Period",
    ]);
    expect(
      presentation.cards.find((card) => card.label === "Money-Weighted Return")
    ).toMatchObject({
      value: "5.12%",
    });
    expect(presentation.cards.find((card) => card.label === "Period")).toMatchObject({
      value: "YTD",
    });
  });

  it("builds an honest executive strip when benchmark analytics are unassigned and money-weighted return is unavailable", () => {
    const scenario = buildBenchmarkUnassignedPerformanceScenario();

    const presentation = getPerformanceExecutiveReturnPresentation({
      workspace: scenario.workspace,
      detailBasis: "NET",
      selectedPerformance: scenario.selectedPerformance,
      capabilities: scenario.capabilities,
      hasMoneyWeightedReturn: scenario.hasMoneyWeightedReturn,
      suspiciousMoneyWeightedReturn: scenario.suspiciousMoneyWeightedReturn,
    });

    expect(presentation.cards.find((card) => card.label === "Portfolio Return")).toMatchObject({
      value: "Unavailable",
      unavailable: true,
    });
    expect(presentation.cards.find((card) => card.label === "Benchmark Return")).toMatchObject({
      value: "Unavailable",
      support: "Benchmark not assigned",
      unavailable: true,
    });
    expect(presentation.cards.find((card) => card.label === "Active Return")).toMatchObject({
      value: "Unavailable",
      support: "Benchmark not assigned",
      unavailable: true,
    });
    expect(
      presentation.cards.find((card) => card.label === "Money-Weighted Return")
    ).toMatchObject({
      value: "Unavailable",
      unavailable: true,
    });
    expect(presentation.cards.find((card) => card.label === "Period")).toMatchObject({
      value: "YTD",
    });
  });

  it("uses business-friendly period wording for explicit windows", () => {
    const scenario = buildPerformancePresentationScenario({
      workspaceOverrides: {
        period: "EXPLICIT",
      },
    });

    const presentation = getPerformanceExecutiveReturnPresentation({
      workspace: scenario.workspace,
      detailBasis: "NET",
      selectedPerformance: scenario.selectedPerformance,
      capabilities: scenario.capabilities,
      hasMoneyWeightedReturn: scenario.hasMoneyWeightedReturn,
      suspiciousMoneyWeightedReturn: scenario.suspiciousMoneyWeightedReturn,
    });

    expect(presentation.cards.find((card) => card.label === "Period")).toMatchObject({
      value: "Explicit window",
    });
  });

  it("maps compact trust-strip statuses from backend-backed capabilities", () => {
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

    expect(presentation.items.find((item) => item.label === "Benchmark")).toMatchObject({
      value: "Assigned",
      tone: "success",
      support: "Benchmark context ready",
    });
    expect(presentation.items.find((item) => item.label === "Contribution")).toMatchObject({
      value: "Partial",
      tone: "warn",
      support: "Only aggregate contribution available",
    });
    expect(presentation.items.find((item) => item.label === "Evidence")).toMatchObject({
      value: "Pending",
      tone: "default",
      support: "Evidence not exposed by contract",
    });
  });

  it.each([
    {
      name: "supported state",
      scenario: buildPerformancePresentationScenario(),
      expectedBenchmark: { value: "Assigned", tone: "success" },
      expectedHistory: { value: "Ready", tone: "success" },
      expectedAttribution: { value: "Ready", tone: "success" },
    },
    {
      name: "partial benchmark comparison",
      scenario: buildPartialBenchmarkPerformanceScenario(),
      expectedBenchmark: { value: "Partial", tone: "warn" },
      expectedHistory: { value: "Ready", tone: "success" },
      expectedAttribution: { value: "Ready", tone: "success" },
    },
    {
      name: "combined support gaps",
      scenario: buildCombinedPartialPerformanceScenario(),
      expectedBenchmark: { value: "Partial", tone: "warn" },
      expectedHistory: { value: "Ready", tone: "success" },
      expectedAttribution: { value: "Unavailable", tone: "danger" },
    },
    {
      name: "benchmark unassigned and history unavailable",
      scenario: buildBenchmarkUnassignedPerformanceScenario(),
      expectedBenchmark: { value: "Unassigned", tone: "danger" },
      expectedHistory: { value: "Unavailable", tone: "danger" },
      expectedAttribution: { value: "Ready", tone: "success" },
    },
  ])("builds a consistent first-paint contract for $name", ({ scenario, expectedBenchmark, expectedHistory, expectedAttribution }) => {
    const presentation = getPerformanceSummaryFirstPaintPresentation({
      workspace: scenario.workspace,
      detailBasis: "NET",
      capabilities: scenario.capabilities,
      selectedPerformance: scenario.selectedPerformance,
      hasMoneyWeightedReturn: scenario.hasMoneyWeightedReturn,
      suspiciousMoneyWeightedReturn: scenario.suspiciousMoneyWeightedReturn,
    });

    expect(presentation.executive.cards).toHaveLength(6);
    expect(
      presentation.trust.items.find((item) => item.label === "Benchmark")
    ).toMatchObject(expectedBenchmark);
    expect(
      presentation.trust.items.find((item) => item.label === "Return History")
    ).toMatchObject(expectedHistory);
    expect(
      presentation.trust.items.find((item) => item.label === "Attribution")
    ).toMatchObject(expectedAttribution);
    expect(presentation.trust.items.find((item) => item.label === "Evidence")).toMatchObject({
      value: "Pending",
      tone: "default",
    });
  });
});
