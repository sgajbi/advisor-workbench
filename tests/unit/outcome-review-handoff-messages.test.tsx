import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import OutcomeReviewHandoffMessages from "../../src/features/workbench/components/outcome-review-handoff-messages";

describe("OutcomeReviewHandoffMessages", () => {
  it("renders bounded report and AI-assisted review-summary handoff status", () => {
    render(
      <OutcomeReviewHandoffMessages
        messages={["Report request Accepted.", "Review request Completed."]}
      />,
    );

    const messages = screen.getByLabelText("Outcome review handoff status");
    expect(messages).toHaveTextContent("Report request Accepted.");
    expect(messages).toHaveTextContent("Review request Completed.");
    expect(screen.queryByText(/outcome_review_id|report_job_id|workflow_pack_run|sha256/i)).not.toBeInTheDocument();
  });

  it("does not render empty handoff chrome", () => {
    render(<OutcomeReviewHandoffMessages messages={[]} />);

    expect(screen.queryByLabelText("Outcome review handoff status")).not.toBeInTheDocument();
  });

  it("does not introduce client communication or execution controls", () => {
    render(<OutcomeReviewHandoffMessages messages={["Report request Accepted."]} />);

    expect(screen.queryByRole("button")).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /client|communication|approval|delivery/i }),
    ).not.toBeInTheDocument();
    expect(screen.queryByText(/order|OMS|execution|fill|settlement/i)).not.toBeInTheDocument();
  });
});
