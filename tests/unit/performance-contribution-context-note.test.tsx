import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import PerformanceContributionContextNote from "@/apps/performance/components/performance-contribution-context-note";
import type { ContributionSummaryView } from "@/features/workbench/types";

function buildContribution(
  overrides: Partial<ContributionSummaryView> = {},
): ContributionSummaryView {
  return {
    metric_basis: "NET",
    weighting_scheme: "AVERAGE_WEIGHT",
    portfolio_contribution_pct: 5.42,
    total_portfolio_return_pct: 5.42,
    coverage_mv_pct: 98.7,
    portfolio_local_contribution_pct: 4.8,
    portfolio_fx_contribution_pct: 0.62,
    position_rows: [],
    levels: [],
    smoothing_evidence: {
      status: "APPLIED",
      reason_codes: ["CARINO_FACTOR_APPLIED", "SMOOTHED_CONTRIBUTION_RECONCILES"],
      raw_contribution_pct: 5.31,
      final_contribution_pct: 5.42,
      linked_return_pct: 5.42,
      smoothing_residual_pct: 0,
    },
    source_economics_evidence: {
      status: "SOURCE_LIMITED",
      reason_codes: [
        "LOTUS_CORE_ANALYTICS_INPUTS_USED",
        "COMPONENT_PNL_NOT_SOURCE_AUTHORED",
      ],
      source_contracts: ["PortfolioTimeseriesInput:v1", "PositionTimeseriesInput:v1"],
      available_economics: ["portfolio_market_values", "position_market_values"],
      unsupported_economics: ["income_pnl", "tax_pnl"],
      degraded_economics: [],
      source_snapshot_count: 2,
    },
    ...overrides,
  };
}

function openCalculationEvidence() {
  fireEvent.click(screen.getByText("Calculation evidence"));
  return screen.getByLabelText("Contribution calculation evidence");
}

describe("PerformanceContributionContextNote", () => {
  it("leads with a confirmed advisor posture and keeps exact source evidence secondary", () => {
    render(
      <PerformanceContributionContextNote
        contribution={buildContribution({
          coverage_mv_pct: 100,
          source_economics_evidence: {
            status: "SOURCE_BACKED",
            reason_codes: [
              "LOTUS_CORE_ANALYTICS_INPUTS_USED",
              "UPSTREAM_SNAPSHOT_LINEAGE_AVAILABLE",
            ],
            source_contracts: ["PortfolioTimeseriesInput:v1", "PositionTimeseriesInput:v1"],
            available_economics: ["portfolio_market_values", "position_market_values"],
            unsupported_economics: [],
            degraded_economics: [],
            source_snapshot_count: 2,
          },
        })}
      />,
    );

    const note = screen.getByTestId("performance-contribution-evidence");
    expect(note).toHaveAttribute("data-tone", "confirmed");
    expect(note).toHaveTextContent("Contribution coverage is confirmed");
    expect(note).toHaveTextContent("100.00% of market value covered");
    expect(note).toHaveTextContent("Reconciles to return");
    expect(screen.getByText("Calculation evidence").closest("details")).not.toHaveAttribute("open");

    const evidence = openCalculationEvidence();
    expect(within(evidence).getByText("SOURCE_BACKED")).toBeInTheDocument();
    expect(
      within(evidence).getByText("UPSTREAM_SNAPSHOT_LINEAGE_AVAILABLE", { exact: false }),
    ).toBeInTheDocument();
    expect(
      within(evidence).getByText("PortfolioTimeseriesInput:v1, PositionTimeseriesInput:v1"),
    ).toBeInTheDocument();
  });

  it("translates source-limited economics into client-use guidance without hiding exact codes", () => {
    render(<PerformanceContributionContextNote contribution={buildContribution()} />);

    const note = screen.getByTestId("performance-contribution-evidence");
    expect(note).toHaveAttribute("data-tone", "limited");
    expect(note).toHaveTextContent("Contribution coverage is limited");
    expect(note).toHaveTextContent(
      "Review the stated exclusions before using the explanation with a client.",
    );
    expect(note).toHaveTextContent("Not source-authored: income effects and tax effects.");
    expect(note).toHaveTextContent("98.70% of market value covered");
    expect(note).toHaveTextContent("Average-weight basis");

    const evidence = openCalculationEvidence();
    expect(within(evidence).getByText("SOURCE_LIMITED")).toBeInTheDocument();
    expect(
      within(evidence).getByText(
        "LOTUS_CORE_ANALYTICS_INPUTS_USED, COMPONENT_PNL_NOT_SOURCE_AUTHORED",
      ),
    ).toBeInTheDocument();
    expect(within(evidence).getByText("income_pnl, tax_pnl")).toBeInTheDocument();
    expect(within(evidence).getByText("APPLIED")).toBeInTheDocument();
  });

  it("fails closed when a future reason code is not recognized and preserves it verbatim", () => {
    const contribution = buildContribution();
    render(
      <PerformanceContributionContextNote
        contribution={{
          ...contribution,
          source_economics_evidence: {
            ...contribution.source_economics_evidence!,
            reason_codes: ["FUTURE_SOURCE_EVIDENCE_CODE"],
          },
        }}
      />,
    );

    const note = screen.getByTestId("performance-contribution-evidence");
    expect(note).toHaveAttribute("data-tone", "review");
    expect(note).toHaveTextContent("Contribution evidence needs review");
    expect(note).toHaveTextContent(
      "Some published evidence is not recognized by this Workbench version.",
    );

    expect(
      within(openCalculationEvidence()).getByText("FUTURE_SOURCE_EVIDENCE_CODE"),
    ).toBeInTheDocument();
  });

  it("keeps missing evidence explicit instead of implying source completeness", () => {
    render(
      <PerformanceContributionContextNote
        contribution={buildContribution({
          smoothing_evidence: null,
          source_economics_evidence: null,
        })}
      />,
    );

    const note = screen.getByTestId("performance-contribution-evidence");
    expect(note).toHaveAttribute("data-tone", "review");
    expect(note).toHaveTextContent("Contribution coverage cannot be confirmed");
    expect(note).toHaveTextContent("Lotus did not receive source-economics evidence");

    const evidence = openCalculationEvidence();
    expect(within(evidence).getAllByText("Not published").length).toBeGreaterThanOrEqual(3);
    expect(within(evidence).getAllByText("None published").length).toBeGreaterThanOrEqual(4);
  });

  it("promotes a source-confirmed smoothing fallback into the advisor limitation", () => {
    const contribution = buildContribution();
    render(
      <PerformanceContributionContextNote
        contribution={{
          ...contribution,
          smoothing_evidence: {
            ...contribution.smoothing_evidence!,
            status: "INVALID_DOMAIN_FALLBACK",
            reason_codes: ["CARINO_INVALID_DAILY_LOG_DOMAIN"],
          },
        }}
      />,
    );

    const note = screen.getByTestId("performance-contribution-evidence");
    expect(note).toHaveAttribute("data-tone", "limited");
    expect(note).toHaveTextContent("Contribution evidence has a methodology limitation");
    expect(note).toHaveTextContent("standard multi-period smoothing method could not be applied");

    const evidence = openCalculationEvidence();
    expect(within(evidence).getByText("INVALID_DOMAIN_FALLBACK")).toBeInTheDocument();
    expect(within(evidence).getByText("CARINO_INVALID_DAILY_LOG_DOMAIN")).toBeInTheDocument();
  });
});
