import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import OutcomeReviewReasonRow from "../../src/features/workbench/components/outcome-review-reason-row";

describe("OutcomeReviewReasonRow", () => {
  it("renders source-provided supportability reasons, blocked actions, and remediation owner", () => {
    render(
      <OutcomeReviewReasonRow
        supportabilityReasons={["READY_FOR_REPORT_INPUT"]}
        blockedActions={["CREATE_REPORT_INPUT", "REQUEST_AI_NARRATIVE"]}
        remediationOwner="Portfolio Operations"
      />,
    );

    const reasonRow = screen.getByLabelText("Outcome review supportability reasons");
    expect(reasonRow).toHaveTextContent("Report preparation ready");
    expect(reasonRow).toHaveTextContent("Report preparation blocked");
    expect(reasonRow).toHaveTextContent("AI-assisted review summary blocked");
    expect(reasonRow).toHaveTextContent("Owner: Portfolio Operations");
  });

  it("does not render empty supportability chrome", () => {
    render(
      <OutcomeReviewReasonRow
        supportabilityReasons={[]}
        blockedActions={[]}
        remediationOwner="N/A"
      />,
    );

    expect(screen.queryByLabelText("Outcome review supportability reasons")).not.toBeInTheDocument();
  });

  it("preserves an unknown source reason as a readable fail-safe label", () => {
    render(
      <OutcomeReviewReasonRow
        supportabilityReasons={["NEW_SOURCE_REASON"]}
        blockedActions={[]}
        remediationOwner="N/A"
      />,
    );

    expect(screen.getByText("Review required")).toBeInTheDocument();
  });

  it("does not introduce client communication or execution controls", () => {
    render(
      <OutcomeReviewReasonRow
        supportabilityReasons={["READY_FOR_REPORT_INPUT"]}
        blockedActions={["REQUEST_AI_NARRATIVE"]}
        remediationOwner="Portfolio Operations"
      />,
    );

    expect(screen.queryByRole("button")).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /client|communication|approval|delivery/i }),
    ).not.toBeInTheDocument();
    expect(screen.queryByText(/order|oms|execution|fill|settlement/i)).not.toBeInTheDocument();
  });
});
