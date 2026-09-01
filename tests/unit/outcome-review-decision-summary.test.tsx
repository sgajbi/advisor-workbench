import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import OutcomeReviewDecisionSummary from "../../src/features/workbench/components/outcome-review-decision-summary";

describe("OutcomeReviewDecisionSummary", () => {
  it("keeps the three decision facts together without repeating action readiness", () => {
    render(
      <OutcomeReviewDecisionSummary
        reviewPosture="Ready for adviser review"
        outcomeStatus="Within expected tolerance"
        driftImprovement="72.4%"
      />
    );

    const summary = screen.getByLabelText("Outcome review decision summary");

    expect(summary).toHaveTextContent("Review statusReady for adviser review");
    expect(summary).toHaveTextContent("Comparison outcomeWithin expected tolerance");
    expect(summary).toHaveTextContent("Drift improvement72.4%");
    expect(summary).not.toHaveTextContent("Evidence pack");
    expect(summary).not.toHaveTextContent("Report preparation");
    expect(summary).not.toHaveTextContent("AI-assisted review summary");
  });

  it("fails closed when decision facts are absent", () => {
    render(
      <OutcomeReviewDecisionSummary
        reviewPosture={null}
        outcomeStatus={undefined}
        driftImprovement={null}
      />
    );

    const summary = screen.getByLabelText("Outcome review decision summary");
    expect(summary).toHaveTextContent("Review statusN/A");
    expect(summary).toHaveTextContent("Comparison outcomeN/A");
    expect(summary).toHaveTextContent("Drift improvementN/A");
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });
});
