import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import RiskMandateComparison from "../../src/apps/performance/components/risk/risk-mandate-comparison";
import { buildRiskMandateComparisonViewModel } from "../../src/apps/performance/risk-mandate-comparison-view-model";
import type { WorkbenchMandateComparison } from "../../src/features/workbench/types";
import { buildMandateComparisonFixture } from "../fixtures/risk-mandate-comparison-fixtures";

describe("RiskMandateComparison", () => {
  it("renders additive-field absence as an explicit unavailable boundary", () => {
    render(
      <RiskMandateComparison
        comparison={buildRiskMandateComparisonViewModel({
          portfolioRisk: null,
          concentrationRisk: undefined,
        })}
      />,
    );

    const surface = screen.getByRole("region", { name: "Mandate comparison" });
    expect(surface).toHaveAttribute(
      "data-mandate-availability",
      "not_supplied",
    );
    expect(surface).toHaveTextContent("Not supplied");
    expect(surface).toHaveTextContent("no breach or all-clear is shown");
    expect(screen.queryByRole("table")).not.toBeInTheDocument();
  });

  it("renders source states, exact facts, review timing, and progressive lineage", () => {
    render(
      <RiskMandateComparison
        comparison={buildRiskMandateComparisonViewModel({
          portfolioRisk: buildMandateComparisonFixture({
            review_policy: {
              review_frequency: "QUARTERLY",
              last_review_date: "2025-12-31",
              next_review_due_date: "2026-02-20",
              state: "overdue",
            },
            constraints: [
              {
                key: "cash_band",
                label: "Cash allocation",
                limit: {
                  minimum: 0.02,
                  maximum: 0.1,
                  unit: "ratio",
                  source_service: "lotus-manage",
                },
                measure: {
                  value: 0.0859,
                  unit: "ratio",
                  basis: "total_market_value_base",
                  as_of_date: "2026-02-24",
                  source_service: "lotus-core",
                  source_metric: "cash_weight",
                },
                headroom: 0.0141,
                state: "within",
                reason: "Cash allocation is within the approved mandate band.",
              },
              {
                key: "tracking_error",
                label: "Tracking error",
                limit: null,
                measure: {
                  value: 0.04,
                  unit: "ratio",
                  basis: null,
                  as_of_date: "2026-02-24",
                  source_service: "lotus-risk",
                  source_metric: "TRACKING_ERROR",
                },
                headroom: null,
                state: "not_defined",
                reason: "The mandate does not define a tracking error limit.",
              },
            ],
          }),
          concentrationRisk: buildMandateComparisonFixture({
            constraints: [
              {
                key: "issuer_max_weight",
                label: "Largest issuer exposure",
                limit: {
                  maximum: 0.2,
                  unit: "ratio",
                  source_service: "lotus-manage",
                },
                measure: {
                  value: 0.2107,
                  unit: "ratio",
                  basis: "total_market_value_base",
                  as_of_date: "2026-02-24",
                  source_service: "lotus-risk",
                  source_metric: "top_issuer_weight_current",
                },
                headroom: -0.0107,
                state: "breach",
                reason:
                  "Largest issuer exposure exceeds the approved mandate limit.",
              },
              {
                key: "single_position_max_weight",
                label: "Largest position exposure",
                limit: {
                  maximum: 0.2,
                  unit: "ratio",
                  source_service: "lotus-manage",
                },
                measure: null,
                headroom: null,
                state: "measure_unavailable",
                reason:
                  "The position measure is not available for the selected date.",
              },
            ],
          }),
        })}
      />,
    );

    const surface = screen.getByTestId("risk-mandate-comparison");
    expect(surface).toHaveAttribute("data-mandate-availability", "supplied");
    expect(surface).toHaveAttribute("data-mandate-context-posture", "aligned");
    expect(surface).toHaveTextContent("MANDATE_PB_SG_GLOBAL_BAL_001");
    expect(surface).toHaveTextContent("Balanced");
    expect(surface).toHaveTextContent("Review overdue");

    const portfolioTable = screen.getByRole("table", {
      name: "Portfolio risk constraints",
    });
    expect(portfolioTable).toHaveTextContent("Within mandate");
    expect(portfolioTable).toHaveTextContent("Limit not defined");
    expect(portfolioTable).toHaveTextContent("8.59%");
    expect(portfolioTable).toHaveTextContent("2.00%–10.00%");
    expect(portfolioTable).toHaveTextContent("+1.41 pp");

    const concentrationTable = screen.getByRole("table", {
      name: "Concentration constraints",
    });
    expect(concentrationTable).toHaveTextContent("Outside mandate");
    expect(concentrationTable).toHaveTextContent("Measure unavailable");
    expect(concentrationTable).toHaveTextContent("−1.07 pp");
    expect(within(concentrationTable).getAllByRole("row")[1]).toHaveAttribute(
      "data-mandate-state",
      "breach",
    );
    expect(within(concentrationTable).getAllByRole("row")[1]).toHaveAttribute(
      "data-mandate-constraint",
      "issuer_max_weight",
    );
    expect(surface).not.toHaveTextContent("All clear");

    const disclosures = screen.getAllByText("Source evidence and lineage");
    fireEvent.click(disclosures[0]);
    expect(surface).toHaveTextContent("DiscretionaryMandateBinding v1");
    expect(surface).toHaveTextContent("cash_weight");
    expect(surface).toHaveTextContent("24 Feb 2026, 01:00 UTC");
  });

  it("renders different and insufficient mandate contexts as explicit status evidence", () => {
    const { rerender } = render(
      <RiskMandateComparison
        comparison={buildRiskMandateComparisonViewModel({
          portfolioRisk: buildMandateComparisonFixture(),
          concentrationRisk: buildMandateComparisonFixture({
            risk_profile: "GROWTH",
          }),
        })}
      />,
    );

    const surface = screen.getByTestId("risk-mandate-comparison");
    expect(surface).toHaveAttribute("data-mandate-context-posture", "conflict");
    expect(
      screen.getByText(/different mandate contexts/),
    ).toHaveAttribute("role", "status");

    rerender(
      <RiskMandateComparison
        comparison={buildRiskMandateComparisonViewModel({
          portfolioRisk: buildMandateComparisonFixture({ risk_profile: null }),
          concentrationRisk: buildMandateComparisonFixture({ risk_profile: null }),
        })}
      />,
    );

    expect(surface).toHaveAttribute(
      "data-mandate-context-posture",
      "insufficient_evidence",
    );
    expect(
      screen.getByText(/insufficient mandate context/),
    ).toHaveAttribute("role", "status");
  });

  it("keeps absent cadence and unknown review state explicit", () => {
    render(
      <RiskMandateComparison
        comparison={buildRiskMandateComparisonViewModel({
          portfolioRisk: buildMandateComparisonFixture({
            review_policy: {
              review_frequency: null,
              last_review_date: null,
              next_review_due_date: "2026-03-31",
              state: "future_state",
            } as unknown as WorkbenchMandateComparison["review_policy"],
          }),
          concentrationRisk: null,
        })}
      />,
    );

    const reviewState = screen.getByText("Review state unavailable");
    expect(reviewState).toHaveAttribute(
      "data-review-policy-state",
      "unavailable",
    );
    expect(screen.getByText(/Not reported · next 31 Mar 2026/)).toBeVisible();
  });

  it("keeps a source-declared unavailable comparison useful without inventing rows", () => {
    render(
      <RiskMandateComparison
        comparison={buildRiskMandateComparisonViewModel({
          portfolioRisk: buildMandateComparisonFixture({
            constraints: [],
            date_alignment_state: "unavailable",
            supportability: {
              state: "unavailable",
              reason: "Mandate evidence is not available for this portfolio.",
              source_service: "lotus-manage",
            },
          }),
          concentrationRisk: null,
        })}
      />,
    );

    const source = screen.getByRole("region", {
      name: "Portfolio risk constraints",
    });
    expect(source).toHaveAttribute(
      "data-mandate-supportability",
      "unavailable",
    );
    expect(source).toHaveAttribute("data-date-alignment", "unavailable");
    expect(source).toHaveTextContent("Evidence unavailable");
    expect(source).toHaveTextContent("Date alignment unavailable");
    expect(source).toHaveTextContent(
      "Mandate evidence is not available for this portfolio.",
    );
    expect(source).toHaveTextContent(
      "No source constraint comparisons were supplied",
    );
  });

  it("renders a missing constraint family beside supplied mandate evidence", () => {
    render(
      <RiskMandateComparison
        comparison={buildRiskMandateComparisonViewModel({
          portfolioRisk: buildMandateComparisonFixture(),
          concentrationRisk: null,
        })}
      />,
    );

    const surface = screen.getByTestId("risk-mandate-comparison");
    expect(surface).toHaveAttribute(
      "data-mandate-availability",
      "partially_supplied",
    );
    expect(surface).toHaveTextContent("Partly supplied");

    const missingSource = screen.getByRole("region", {
      name: "Concentration constraints",
    });
    expect(missingSource).toHaveAttribute(
      "data-mandate-source-availability",
      "not_supplied",
    );
    expect(missingSource).toHaveAttribute(
      "data-mandate-supportability",
      "not_supplied",
    );
    expect(missingSource).toHaveTextContent(
      "Mandate comparison was not supplied for this view",
    );
    expect(within(missingSource).queryByRole("table")).not.toBeInTheDocument();
    expect(
      within(missingSource).queryByText("Source evidence and lineage"),
    ).not.toBeInTheDocument();
  });
});
