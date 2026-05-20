import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import OutcomeReviewStatusStrip from "../../src/features/workbench/components/outcome-review-status-strip";

describe("OutcomeReviewStatusStrip", () => {
  it("renders business-facing outcome review status metrics", () => {
    render(
      <OutcomeReviewStatusStrip
        latestReview="Ready for Advisor Review"
        outcomeStatus="Within Mandate"
        driftImprovement="72.4%"
        evidencePackStatus="Available"
      />
    );

    const strip = screen.getByLabelText("Outcome review status summary");

    expect(strip).toHaveTextContent("Latest ReviewReady for Advisor Review");
    expect(strip).toHaveTextContent("Outcome StatusWithin Mandate");
    expect(strip).toHaveTextContent("Drift Improvement72.4%");
    expect(strip).toHaveTextContent("Evidence PackAvailable");
    expect(screen.queryByText(/source_ref|content_hash|sha256|outcome_review_id/i)).not.toBeInTheDocument();
  });

  it("fails closed to unavailable labels without adding workflow controls", () => {
    render(
      <OutcomeReviewStatusStrip
        latestReview={null}
        outcomeStatus={undefined}
        driftImprovement={null}
        evidencePackStatus="Unavailable"
      />
    );

    const strip = screen.getByLabelText("Outcome review status summary");

    expect(strip).toHaveTextContent("Latest ReviewN/A");
    expect(strip).toHaveTextContent("Outcome StatusN/A");
    expect(strip).toHaveTextContent("Drift ImprovementN/A");
    expect(strip).toHaveTextContent("Evidence PackUnavailable");
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /client|communication|approval|delivery/i })
    ).not.toBeInTheDocument();
    expect(screen.queryByText(/order|OMS|execution|fill|settlement/i)).not.toBeInTheDocument();
  });
});
