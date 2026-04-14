import React from "react";
import { fireEvent, render, screen, within } from "@testing-library/react";
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

    expect(screen.getByText("Performance Drivers")).toBeInTheDocument();
    expect(screen.getByText("YTD Contribution Ranking")).toBeInTheDocument();
    expect(document.querySelector(".performance-summary-driver-module.workbench-chart-shell")).toBeTruthy();
    expect(document.querySelector(".performance-contributors-compare-grid")).toBeTruthy();
    expect(screen.getByLabelText("Top Contributors impact bars")).toHaveTextContent("AAPL");
    expect(screen.getByLabelText("Top Detractors impact bars")).toHaveTextContent("TLT");
    expect(screen.queryAllByText("Contribution to active return")).toHaveLength(0);
    expect(screen.getByText("Instrument detail")).toBeInTheDocument();
    expect(screen.queryByText(/positions/i)).not.toBeInTheDocument();
    expect(
      screen.queryByText("Open the full instrument-level contribution breakdown in one ranked table.")
    ).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Contributor driver strip")).not.toBeInTheDocument();
    expect(screen.queryByRole("note")).not.toBeInTheDocument();
    expect(screen.queryByText("Avg. Weight 24.00%")).not.toBeInTheDocument();
    expect(screen.queryByText("Avg. Weight 8.00%")).not.toBeInTheDocument();

    fireEvent.click(screen.getByText("Instrument detail"));

    const contributorsTable = screen.getByLabelText("Contributor instrument detail table");
    expect(contributorsTable).toBeInTheDocument();
    expect(
      contributorsTable.closest(".performance-contributors-table.performance-chart-observation-table")
    ).toBeTruthy();
    expect(within(contributorsTable).getByText("Direction")).toBeInTheDocument();
    expect(within(contributorsTable).getByText("Instrument")).toBeInTheDocument();
    expect(within(contributorsTable).getByText("Contribution")).toBeInTheDocument();
    expect(within(contributorsTable).getByText("Weight")).toBeInTheDocument();
    expect(within(contributorsTable).getByText("Return")).toBeInTheDocument();
    expect(within(contributorsTable).getByText("Contributor")).toBeInTheDocument();
    expect(within(contributorsTable).getByText("Detractor")).toBeInTheDocument();
    expect(within(contributorsTable).getByText("AAPL")).toBeInTheDocument();
    expect(within(contributorsTable).getByText("TLT")).toBeInTheDocument();
    expect(within(contributorsTable).getByText("1.50%")).toBeInTheDocument();
    expect(within(contributorsTable).getByText("24.00%")).toBeInTheDocument();
    expect(within(contributorsTable).getAllByText("8.00%")).toHaveLength(2);
    expect(within(contributorsTable).getByText("-0.20%")).toBeInTheDocument();
    expect(within(contributorsTable).getByText("-2.00%")).toBeInTheDocument();
  });

  it("rebalances the ranked contributor grid when only contributors are populated", () => {
    render(
      <PerformanceSummaryContributorsSection
        {...buildProps({
          negativePositionContributors: [],
        })}
      />
    );

    const compareGrid = document.querySelector(".performance-contributors-compare-grid");
    expect(compareGrid).toHaveClass("performance-contributors-compare-grid-right-empty");

    const cards = Array.from(document.querySelectorAll(".performance-contributors-ranked-card"));
    expect(cards[0]).toHaveClass("performance-contributors-ranked-card-populated");
    expect(cards[1]).toHaveClass("performance-contributors-ranked-card-empty");
    expect(screen.getByText("No detracting positions are exposed for the selected period.")).toBeInTheDocument();
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
    expect(screen.getByLabelText("Contributor ranking unavailable state")).toBeInTheDocument();
    expect(screen.getAllByText("Still available").length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText("Needs source support")).toBeInTheDocument();
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
    expect(screen.getByLabelText("Contributor ranking partial state")).toBeInTheDocument();
    const note = screen.getByRole("note");
    expect(note).toHaveTextContent("High coverage");
    expect(note).toHaveTextContent("Reconciles to return");
    expect(screen.queryByLabelText("Contributor driver strip")).not.toBeInTheDocument();
    const aggregateTable = screen.getByLabelText("Aggregate contributor summary");
    expect(aggregateTable).toBeInTheDocument();
    expect(
      aggregateTable.closest(".performance-contributors-table.performance-chart-observation-table")
    ).toBeTruthy();
    expect(within(aggregateTable).getByText("Equity")).toBeInTheDocument();
    expect(within(aggregateTable).getByText("Total")).toBeInTheDocument();
    expect(within(aggregateTable).getAllByText("5.42%")).toHaveLength(2);
    expect(screen.queryByText("AAPL")).not.toBeInTheDocument();
  });

  it("renders a structured loading state while contributor details are still resolving", () => {
    render(
      <PerformanceSummaryContributorsSection
        {...buildProps({
          isDetailsPending: true,
          capabilities: {
            ...supportedCapabilities,
            contributionRanking: {
              state: "unavailable",
              reason: "Contribution ranking is still loading.",
            },
          },
          positivePositionContributors: [],
          negativePositionContributors: [],
          topContributors: [],
          bottomContributors: [],
        })}
      />
    );

    const loadingState = screen.getByRole("status");
    expect(loadingState).toHaveTextContent("Loading performance drivers");
    expect(loadingState).toHaveTextContent("Loading contribution ranking.");
  });
});
