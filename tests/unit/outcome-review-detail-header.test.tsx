import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import OutcomeReviewDetailHeader from "../../src/features/workbench/components/outcome-review-detail-header";

describe("OutcomeReviewDetailHeader", () => {
  it("renders selected review actions and delegates supported requests", () => {
    const onRequestReportJob = vi.fn();
    const onRequestAiNarrative = vi.fn();

    render(
      <OutcomeReviewDetailHeader
        reviewLabel="13 May 2026 outcome review"
        reportJobAvailable
        reportJobPending={false}
        aiNarrativeAvailable
        aiNarrativePending={false}
        onRequestReportJob={onRequestReportJob}
        onRequestAiNarrative={onRequestAiNarrative}
      />,
    );

    expect(screen.getByRole("heading", { name: "Selected review detail" })).toBeInTheDocument();
    expect(screen.getByText("13 May 2026 outcome review")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Request report" }));
    fireEvent.click(screen.getByRole("button", { name: "Prepare AI-assisted review summary" }));

    expect(onRequestReportJob).toHaveBeenCalledTimes(1);
    expect(onRequestAiNarrative).toHaveBeenCalledTimes(1);
  });

  it("keeps unavailable handoffs disabled without client communication or execution actions", () => {
    render(
      <OutcomeReviewDetailHeader
        reviewLabel="Blocked outcome review"
        reportJobAvailable={false}
        reportJobPending={false}
        aiNarrativeAvailable={false}
        aiNarrativePending={false}
        onRequestReportJob={vi.fn()}
        onRequestAiNarrative={vi.fn()}
      />,
    );

    expect(screen.getByRole("button", { name: "Request report" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Prepare AI-assisted review summary" })).toBeDisabled();
    expect(screen.queryByRole("button", { name: /client|communication|approval|delivery/i })).not.toBeInTheDocument();
    expect(screen.queryByText(/order|OMS|execution|fill|settlement/i)).not.toBeInTheDocument();
  });

  it("uses pending labels while parent-owned requests are running", () => {
    render(
      <OutcomeReviewDetailHeader
        reviewLabel="Pending outcome review"
        reportJobAvailable
        reportJobPending
        aiNarrativeAvailable
        aiNarrativePending
        onRequestReportJob={vi.fn()}
        onRequestAiNarrative={vi.fn()}
      />,
    );

    expect(screen.getByRole("button", { name: "Requesting report" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Preparing AI-assisted review summary" })).toBeDisabled();
  });
});
