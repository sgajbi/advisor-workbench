import React from "react";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import PerformanceSummaryHeaderSection from "../../src/apps/performance/components/performance-summary-header-section";
import type { PerformanceSummaryHeaderSectionProps } from "../../src/apps/performance/components/performance-workspace-types";
import {
  buildPerformancePresentationScenario,
} from "../fixtures/performance-workspace-fixtures";

function buildProps(
  overrides: Partial<PerformanceSummaryHeaderSectionProps> = {}
): PerformanceSummaryHeaderSectionProps {
  const scenario = buildPerformancePresentationScenario();
  return {
    workspace: scenario.workspace,
    detailBasis: "NET",
    capabilities: scenario.capabilities,
    selectedBenchmarkCode: scenario.selectedBenchmarkCode,
    selectedBenchmarkLabel: scenario.selectedBenchmarkLabel,
    selectedPerformance: scenario.selectedPerformance,
    hasMoneyWeightedReturn: scenario.hasMoneyWeightedReturn,
    suspiciousMoneyWeightedReturn: scenario.suspiciousMoneyWeightedReturn,
    ...overrides,
  };
}

describe("PerformanceSummaryHeaderSection", () => {
  it("renders the first-paint executive strip and trust strip", () => {
    render(<PerformanceSummaryHeaderSection {...buildProps()} />);

    expect(
      document.querySelector(".performance-summary-stage")
    ).toBeTruthy();
    expect(screen.getByLabelText("Executive return strip")).toBeInTheDocument();
    expect(screen.getByLabelText("Trust and completeness strip")).toBeInTheDocument();
    expect(screen.getByText("Portfolio Return")).toBeInTheDocument();
    expect(screen.getByText("Benchmark Return")).toBeInTheDocument();
    expect(screen.getByText("Active Return")).toBeInTheDocument();
    expect(screen.getByText("Money-Weighted Return")).toBeInTheDocument();
    expect(screen.getByText("Basis")).toBeInTheDocument();
    expect(screen.getByText("Period")).toBeInTheDocument();
    expect(screen.getByText("Assigned")).toBeInTheDocument();
    expect(screen.getAllByText("Ready").length).toBeGreaterThanOrEqual(2);
    expect(document.querySelector(".performance-summary-kpi-card-primary")).toBeTruthy();
    expect(document.querySelectorAll(".performance-trust-item")).toHaveLength(5);
    expect(screen.queryByRole("group", { name: "Performance summary observations" })).not.toBeInTheDocument();
  });

  it("renders a compact benchmark-unassigned trust state without fake placeholders", () => {
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

    render(
      <PerformanceSummaryHeaderSection
        {...buildProps({
          workspace: scenario.workspace,
          capabilities: scenario.capabilities,
          selectedBenchmarkCode: scenario.selectedBenchmarkCode,
          selectedBenchmarkLabel: scenario.selectedBenchmarkLabel,
          selectedPerformance: scenario.selectedPerformance,
          hasMoneyWeightedReturn: scenario.hasMoneyWeightedReturn,
          suspiciousMoneyWeightedReturn: scenario.suspiciousMoneyWeightedReturn,
        })}
      />
    );

    expect(screen.getByLabelText("Executive return strip")).toBeInTheDocument();
    expect(screen.getByLabelText("Trust and completeness strip")).toBeInTheDocument();
    expect(screen.getAllByText("Unassigned").length).toBeGreaterThanOrEqual(1);
    expect(
      screen.getAllByText("No benchmark is assigned to this mandate.").length
    ).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("Unavailable").length).toBeGreaterThanOrEqual(3);
    expect(screen.getAllByText("No benchmark is assigned to this mandate.").length).toBeGreaterThanOrEqual(1);
    expect(screen.queryByText("N/A")).not.toBeInTheDocument();
    expect(screen.getByText("Pending")).toBeInTheDocument();
    expect(screen.queryByRole("group", { name: "Performance summary observations" })).not.toBeInTheDocument();
  });
});
