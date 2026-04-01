import { describe, expect, it } from "vitest";

import {
  getPerformanceTrustStripPresentation,
} from "../../src/apps/performance/components/performance-workspace-view-helpers";
import {
  buildBenchmarkUnassignedPerformanceScenario,
  buildCombinedPartialPerformanceScenario,
  buildPartialBenchmarkPerformanceScenario,
  buildPerformancePresentationScenario,
} from "../fixtures/performance-workspace-fixtures";

describe("performance first-paint helper contracts", () => {
  it("maps compact trust-strip statuses from backend-backed capabilities", () => {
    const scenario = buildPerformancePresentationScenario({
      capabilityOverrides: {
        contributionDetail: {
          state: "partial",
          reason: "Contribution exists, but only aggregate rows are available.",
          coverageLevel: "aggregate",
          fallbackAvailable: true,
        },
      },
    });

    const presentation = getPerformanceTrustStripPresentation({
      capabilities: scenario.capabilities,
    });

    expect(presentation.items.find((item) => item.label === "Benchmark")).toMatchObject({
      value: "Assigned",
      tone: "default",
      support: "Benchmark context through 24 Feb 2026",
    });
    expect(presentation.items.find((item) => item.label === "Contribution")).toMatchObject({
      value: "Partial",
      tone: "warn",
      support: "Aggregate fallback ready",
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
      expectedBenchmark: { value: "Assigned", tone: "default" },
      expectedHistory: { value: "Ready", tone: "default" },
      expectedAttribution: { value: "Ready", tone: "default" },
    },
    {
      name: "partial benchmark comparison",
      scenario: buildPartialBenchmarkPerformanceScenario(),
      expectedBenchmark: { value: "Partial", tone: "warn" },
      expectedHistory: { value: "Ready", tone: "default" },
      expectedAttribution: { value: "Ready", tone: "default" },
    },
    {
      name: "combined support gaps",
      scenario: buildCombinedPartialPerformanceScenario(),
      expectedBenchmark: { value: "Partial", tone: "warn" },
      expectedHistory: { value: "Ready", tone: "default" },
      expectedAttribution: { value: "Unavailable", tone: "danger" },
    },
    {
      name: "benchmark unassigned and history unavailable",
      scenario: buildBenchmarkUnassignedPerformanceScenario(),
      expectedBenchmark: { value: "Unassigned", tone: "danger" },
      expectedHistory: { value: "Unavailable", tone: "danger" },
      expectedAttribution: { value: "Ready", tone: "default" },
    },
  ])("builds a consistent first-paint contract for $name", ({ scenario, expectedBenchmark, expectedHistory, expectedAttribution }) => {
    const presentation = getPerformanceTrustStripPresentation({
      capabilities: scenario.capabilities,
    });

    expect(
      presentation.items.find((item) => item.label === "Benchmark")
    ).toMatchObject(expectedBenchmark);
    expect(
      presentation.items.find((item) => item.label === "Return History")
    ).toMatchObject(expectedHistory);
    if (expectedHistory.value === "Ready") {
      expect(
        presentation.items.find((item) => item.label === "Return History")
      ).toMatchObject({
        support: "Published through 24 Feb 2026",
      });
    }
    expect(
      presentation.items.find((item) => item.label === "Attribution")
    ).toMatchObject(expectedAttribution);
    expect(presentation.items.find((item) => item.label === "Evidence")).toMatchObject({
      value: "Pending",
      tone: "default",
    });
  });
});
