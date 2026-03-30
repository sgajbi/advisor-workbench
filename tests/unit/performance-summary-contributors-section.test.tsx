import React from "react";
import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import PerformanceSummaryContributorsSection from "../../src/apps/performance/components/performance-summary-contributors-section";
import type { PerformanceSummaryContributorsSectionProps } from "../../src/apps/performance/components/performance-workspace-types";
import {
  buildAggregateContributionPerformanceScenario,
  buildPerformanceCapabilities,
  buildSupportedPerformanceScenario,
} from "../fixtures/performance-workspace-fixtures";

const supportedCapabilities = buildPerformanceCapabilities();

function buildProps(
  overrides: Partial<PerformanceSummaryContributorsSectionProps> = {}
): PerformanceSummaryContributorsSectionProps {
  const workspace = buildSupportedPerformanceScenario().workspace;
  return {
    workspace,
    capabilities: supportedCapabilities,
    contributorScale: 1.5,
    positivePositionContributors: [
      {
        position_id: "AAPL",
        contribution_pct: 1.5,
        weight_avg_pct: 24,
        total_return_pct: 8,
        local_contribution_pct: 1.1,
        fx_contribution_pct: 0.4,
      },
    ],
    negativePositionContributors: [
      {
        position_id: "TLT",
        contribution_pct: -0.2,
        weight_avg_pct: 8,
        total_return_pct: -2,
        local_contribution_pct: -0.2,
        fx_contribution_pct: 0,
      },
    ],
    topContributors: [
      {
        key_label: "Equity",
        contribution_pct: 3.8,
        weight_avg_pct: 61,
        total_return_pct: 7.4,
        local_contribution_pct: 3.4,
        fx_contribution_pct: 0.4,
        is_other: false,
      },
    ],
    bottomContributors: [
      {
        key_label: "Rates",
        contribution_pct: -0.6,
        weight_avg_pct: 18,
        total_return_pct: -1.9,
        local_contribution_pct: -0.5,
        fx_contribution_pct: -0.1,
        is_other: false,
      },
    ],
    isDetailsPending: false,
    ...overrides,
  };
}

describe("PerformanceSummaryContributorsSection", () => {
  it("renders positive and negative ranked contributors when position ranking exists", () => {
    render(<PerformanceSummaryContributorsSection {...buildProps()} />);

    expect(screen.getByText("What drove the result?")).toBeInTheDocument();
    expect(screen.getByText("YTD contributor ranking")).toBeInTheDocument();
    expect(screen.getByText("Top contributors")).toBeInTheDocument();
    expect(screen.getByText("Top detractors")).toBeInTheDocument();
    expect(document.querySelector(".performance-summary-driver-module.workbench-chart-shell")).toBeTruthy();
    expect(document.querySelectorAll(".workbench-summary-visual-card")).toHaveLength(2);
    expect(document.querySelector(".workbench-summary-visual-heading")).toBeTruthy();
    expect(document.querySelector(".workbench-summary-visual-label")).toBeTruthy();
    expect(document.querySelector(".workbench-summary-visual-value")).toBeTruthy();
    expect(document.querySelector(".workbench-summary-visual-meta")).toBeTruthy();
    expect(document.querySelectorAll(".workbench-ranked-bar-list")).toHaveLength(2);
    expect(document.querySelectorAll(".workbench-ranked-bar-row")).toHaveLength(2);
    expect(screen.getByLabelText("Contributor summary")).toBeInTheDocument();
    expect(document.querySelector(".performance-contributors-table.analytics-table-frame-dense")).toBeTruthy();
    expect(screen.getByText("Bucket")).toBeInTheDocument();
    expect(screen.getByText("Equity")).toBeInTheDocument();
    expect(screen.getByText("AAPL")).toBeInTheDocument();
    expect(screen.getByText("TLT")).toBeInTheDocument();
    expect(screen.getByText("Avg. Weight 24.00%")).toBeInTheDocument();
    expect(screen.getByText("Avg. Weight 8.00%")).toBeInTheDocument();
    const rankedLists = document.querySelectorAll(".workbench-ranked-bar-list");
    expect(rankedLists).toHaveLength(2);
    expect(within(rankedLists[0] as HTMLElement).getByText("AAPL")).toBeInTheDocument();
    expect(within(rankedLists[0] as HTMLElement).queryByText("Equity")).not.toBeInTheDocument();
    expect(within(rankedLists[1] as HTMLElement).getByText("TLT")).toBeInTheDocument();
    expect(within(rankedLists[1] as HTMLElement).queryByText("Rates")).not.toBeInTheDocument();
  });

  it("renders a useful fallback when contribution detail is unavailable", () => {
    render(
      <PerformanceSummaryContributorsSection
        {...buildProps({
          capabilities: {
            ...supportedCapabilities,
            contributionRanking: {
              state: "unavailable",
              reason: "Contributor ranking is not available for the current selection.",
            },
          },
          positivePositionContributors: [],
          negativePositionContributors: [],
        })}
      />
    );

    expect(screen.getByText("Contributor ranking unavailable")).toBeInTheDocument();
    expect(screen.getByText("Contributor ranking is not available for the current selection.")).toBeInTheDocument();
    expect(screen.queryByLabelText("Aggregate contributor summary")).not.toBeInTheDocument();
  });

  it("renders a partial-state panel with an aggregate table when only aggregate contributor support exists", () => {
    const scenario = buildAggregateContributionPerformanceScenario();

    render(
      <PerformanceSummaryContributorsSection
        {...buildProps({
          capabilities: scenario.capabilities,
          positivePositionContributors: [],
          negativePositionContributors: [],
          topContributors: scenario.workspace.contribution?.levels?.[0]?.rows ?? [],
          bottomContributors: [],
        })}
      />
    );

    expect(screen.getByText("Contributor ranking is partial")).toBeInTheDocument();
    expect(screen.getByText("Contribution exists, but only aggregate rows are available.")).toBeInTheDocument();
    expect(
      screen.getByText("Aggregate contribution remains available even when position-level ranking is absent.")
    ).toBeInTheDocument();
    expect(screen.getByLabelText("Aggregate contributor summary")).toBeInTheDocument();
    expect(screen.getByText("Equity")).toBeInTheDocument();
    expect(screen.queryByText("AAPL")).not.toBeInTheDocument();
  });
});
