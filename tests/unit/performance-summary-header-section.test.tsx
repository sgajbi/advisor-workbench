import React from "react";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import PerformanceSummaryHeaderSection from "../../src/apps/performance/components/performance-summary-header-section";
import type { PerformanceSummaryHeaderSectionProps } from "../../src/apps/performance/components/performance-workspace-types";
import {
  buildPerformanceCapabilities,
  buildPerformanceWorkspace,
} from "../fixtures/performance-workspace-fixtures";

const supportedCapabilities = buildPerformanceCapabilities();

function buildProps(
  overrides: Partial<PerformanceSummaryHeaderSectionProps> = {}
): PerformanceSummaryHeaderSectionProps {
  const workspace = buildPerformanceWorkspace();
  return {
    workspace,
    detailBasis: "NET",
    capabilities: supportedCapabilities,
    selectedBenchmarkCode: workspace.benchmark_code ?? undefined,
    selectedBenchmarkLabel: "Global Balanced 60/40",
    selectedPerformance: workspace.net_performance,
    hasMoneyWeightedReturn: true,
    suspiciousMoneyWeightedReturn: false,
    ...overrides,
  };
}

describe("PerformanceSummaryHeaderSection", () => {
  it("renders the first-paint executive strip and trust strip", () => {
    render(<PerformanceSummaryHeaderSection {...buildProps()} />);

    expect(
      document.querySelector(".performance-summary-stage")
    ).toBeTruthy();
    expect(screen.getByRole("heading", { name: "PF_1001" })).toBeInTheDocument();
    expect(screen.getByLabelText("Executive return strip")).toBeInTheDocument();
    expect(screen.getByLabelText("Trust and completeness strip")).toBeInTheDocument();
    expect(screen.getByText("Portfolio Return")).toBeInTheDocument();
    expect(screen.getByText("Benchmark Return")).toBeInTheDocument();
    expect(screen.getByText("Active Return")).toBeInTheDocument();
    expect(screen.getByText("Basis")).toBeInTheDocument();
    expect(screen.getByText("Period")).toBeInTheDocument();
    expect(screen.getByText("Global Balanced 60/40")).toBeInTheDocument();
    expect(screen.getByText("Assigned")).toBeInTheDocument();
    expect(screen.getAllByText("Ready").length).toBeGreaterThanOrEqual(2);
    expect(screen.getByRole("group", { name: "Performance summary observations" })).toBeInTheDocument();
    expect(screen.getByText("1 observations")).toBeInTheDocument();
    expect(screen.getByText("Relative measurement")).toBeInTheDocument();
  });

  it("renders a compact benchmark-unassigned trust state without fake placeholders", () => {
    render(
      <PerformanceSummaryHeaderSection
        {...buildProps({
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
            metric_basis: "NET",
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
          workspace: {
            ...buildProps().workspace,
            benchmark_code: null,
            money_weighted_return: null,
            net_chart: [],
          },
        })}
      />
    );

    expect(screen.getByLabelText("Executive return strip")).toBeInTheDocument();
    expect(screen.getByLabelText("Trust and completeness strip")).toBeInTheDocument();
    expect(screen.getAllByText("Unassigned").length).toBeGreaterThanOrEqual(2);
    expect(
      screen.getByText("Assign a benchmark to enable relative analytics.")
    ).toBeInTheDocument();
    expect(screen.getAllByText("Unavailable").length).toBeGreaterThanOrEqual(3);
    expect(screen.getAllByText("No benchmark is assigned to this mandate.").length).toBeGreaterThanOrEqual(1);
    expect(screen.queryByText("N/A")).not.toBeInTheDocument();
    expect(screen.getByText("Pending")).toBeInTheDocument();
  });
});
