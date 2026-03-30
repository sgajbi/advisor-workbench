import React from "react";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import PerformanceSummaryContributorsSection from "../../src/apps/performance/components/performance-summary-contributors-section";
import type { PerformanceSummaryContributorsSectionProps } from "../../src/apps/performance/components/performance-workspace-types";
import {
  buildPerformanceCapabilities,
  buildPerformanceWorkspace,
} from "../fixtures/performance-workspace-fixtures";

const supportedCapabilities = buildPerformanceCapabilities();

function buildProps(
  overrides: Partial<PerformanceSummaryContributorsSectionProps> = {}
): PerformanceSummaryContributorsSectionProps {
  const workspace = buildPerformanceWorkspace();
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
    isDetailsPending: false,
    ...overrides,
  };
}

describe("PerformanceSummaryContributorsSection", () => {
  it("renders positive and negative ranked contributors when position ranking exists", () => {
    render(<PerformanceSummaryContributorsSection {...buildProps()} />);

    expect(screen.getByText("Top contributors and detractors")).toBeInTheDocument();
    expect(screen.getByText("Top contributors")).toBeInTheDocument();
    expect(screen.getByText("Top detractors")).toBeInTheDocument();
    expect(document.querySelectorAll(".workbench-summary-visual-card")).toHaveLength(2);
    expect(document.querySelector(".workbench-summary-visual-heading")).toBeTruthy();
    expect(document.querySelector(".workbench-summary-visual-label")).toBeTruthy();
    expect(document.querySelector(".workbench-summary-visual-value")).toBeTruthy();
    expect(document.querySelector(".workbench-summary-visual-meta")).toBeTruthy();
    expect(screen.getByText("AAPL")).toBeInTheDocument();
    expect(screen.getByText("TLT")).toBeInTheDocument();
    expect(screen.getByText("Avg. Weight 24.00%")).toBeInTheDocument();
    expect(screen.getByText("Avg. Weight 8.00%")).toBeInTheDocument();
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
  });

  it("renders a partial-state panel when only aggregate contributor support exists", () => {
    render(
      <PerformanceSummaryContributorsSection
        {...buildProps({
          capabilities: {
            ...supportedCapabilities,
            contributionRanking: {
              state: "partial",
              reason: "Contribution exists, but only aggregate rows are available.",
            },
          },
          positivePositionContributors: [],
          negativePositionContributors: [],
        })}
      />
    );

    expect(screen.getByText("Contributor ranking is partial")).toBeInTheDocument();
    expect(screen.getByText("Contribution exists, but only aggregate rows are available.")).toBeInTheDocument();
  });
});
