import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import OutcomeReviewStatusStrip from "../../src/features/workbench/components/outcome-review-status-strip";

describe("OutcomeReviewStatusStrip", () => {
  it("renders business-facing outcome review status metrics", () => {
    render(
      <OutcomeReviewStatusStrip
        reviewPosture="Ready for adviser review"
        outcomeStatus="Within expected tolerance"
        driftImprovement="72.4%"
        evidencePackStatus="Available"
      />
    );

    const strip = screen.getByLabelText("Outcome review status summary");

    expect(strip).toHaveTextContent("Review statusReady for adviser review");
    expect(strip).toHaveTextContent("Comparison outcomeWithin expected tolerance");
    expect(strip).toHaveTextContent("Drift improvement72.4%");
    expect(strip).toHaveTextContent("Evidence packAvailable");
    expect(screen.queryByText(/source_ref|content_hash|sha256|outcome_review_id/i)).not.toBeInTheDocument();
  });

  it("fails closed to unavailable labels without adding workflow controls", () => {
    render(
      <OutcomeReviewStatusStrip
        reviewPosture={null}
        outcomeStatus={undefined}
        driftImprovement={null}
        evidencePackStatus="Unavailable"
      />
    );

    const strip = screen.getByLabelText("Outcome review status summary");

    expect(strip).toHaveTextContent("Review statusN/A");
    expect(strip).toHaveTextContent("Comparison outcomeN/A");
    expect(strip).toHaveTextContent("Drift improvementN/A");
    expect(strip).toHaveTextContent("Evidence packUnavailable");
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /client|communication|approval|delivery/i })
    ).not.toBeInTheDocument();
    expect(screen.queryByText(/order|OMS|execution|fill|settlement/i)).not.toBeInTheDocument();
  });
});
