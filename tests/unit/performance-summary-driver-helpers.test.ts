import { describe, expect, it } from "vitest";

import {
  getPerformanceContributorsPresentation,
  getPerformanceHorizonContextPresentation,
} from "../../src/apps/performance/components/performance-summary-driver-helpers";
import type { PerformanceSummaryContributorsSectionProps } from "../../src/apps/performance/components/performance-workspace-types";
import {
  buildPerformanceCapabilities,
  buildPerformanceWorkspace,
} from "../fixtures/performance-workspace-fixtures";

const supportedCapabilities = buildPerformanceCapabilities();

function buildContributorProps(
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

describe("performance summary driver helpers", () => {
  it("builds supported contributor ranking rows for summary-mode cards", () => {
    const presentation = getPerformanceContributorsPresentation(buildContributorProps());

    expect(presentation.mode).toBe("supported");
    if (presentation.mode !== "supported") {
      throw new Error("expected supported presentation");
    }
    expect(presentation.title).toBe("Top contributors and detractors");
    expect(presentation.subtitle).toBe("YTD position ranking");
    expect(presentation.positiveRows[0]).toMatchObject({
      title: "AAPL",
      subtitle: "Avg. Weight 24.00%",
      value: "1.50%",
      tone: "positive",
    });
    expect(presentation.negativeRows[0]).toMatchObject({
      title: "TLT",
      subtitle: "Avg. Weight 8.00%",
      value: "-0.20%",
      tone: "negative",
    });
  });

  it("builds a loading contributor presentation while detailed support is pending", () => {
    const presentation = getPerformanceContributorsPresentation(
      buildContributorProps({
        capabilities: {
          ...supportedCapabilities,
          contributionRanking: {
            state: "partial",
            reason: "Contribution exists, but only aggregate rows are available.",
          },
        },
        isDetailsPending: true,
        positivePositionContributors: [],
        negativePositionContributors: [],
      })
    );

    expect(presentation).toMatchObject({
      mode: "loading",
      body: "Loading contributor ranking for the selected analytical slice.",
    });
  });

  it("builds a capability notice presentation for partial or unavailable contributor ranking", () => {
    const presentation = getPerformanceContributorsPresentation(
      buildContributorProps({
        capabilities: {
          ...supportedCapabilities,
          contributionRanking: {
            state: "partial",
            reason: "Contribution exists, but only aggregate rows are available.",
          },
        },
        positivePositionContributors: [],
        negativePositionContributors: [],
      })
    );

    expect(presentation).toMatchObject({
      mode: "notice",
      noticeTitle: "Contributor ranking is partial",
      noticeBody: "Contribution exists, but only aggregate rows are available.",
    });
  });

  it("builds honest horizon context labels for supported and unavailable active return states", () => {
    expect(
      getPerformanceHorizonContextPresentation({
        period: "YTD",
        benchmarkLabel: "Global Balanced 60/40",
        selectedPeriodRow: {
          period: "YTD",
          portfolio_return_pct: 5.4,
          benchmark_return_pct: 4.9,
          active_return_pct: 0.5,
          annualized_return_pct: 5.4,
        },
      })
    ).toMatchObject({
      selectedPeriodLabel: "YTD",
      activeReturnLabel: "0.50%",
      benchmarkLabel: "Global Balanced 60/40",
    });

    expect(
      getPerformanceHorizonContextPresentation({
        period: "YTD",
        benchmarkLabel: "Benchmark",
        selectedPeriodRow: {
          period: "YTD",
          portfolio_return_pct: 5.4,
          benchmark_return_pct: null,
          active_return_pct: null,
          annualized_return_pct: 5.4,
        },
      })
    ).toMatchObject({
      selectedPeriodLabel: "YTD",
      activeReturnLabel: "Unavailable",
      benchmarkLabel: "Benchmark",
    });
  });
});
