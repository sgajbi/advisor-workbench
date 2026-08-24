import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import OutcomeReviewDetailHeader from "../../src/features/workbench/components/outcome-review-detail-header";

describe("OutcomeReviewDetailHeader", () => {
  it("renders the selected review report action without duplicating AI support", () => {
    const onRequestReportJob = vi.fn();

    render(
      <OutcomeReviewDetailHeader
        reviewLabel="13 May 2026 outcome review"
        reportJobAvailable
        reportJobPending={false}
        onRequestReportJob={onRequestReportJob}
      />,
    );

    expect(screen.getByRole("heading", { name: "Selected review detail" })).toBeInTheDocument();
    expect(screen.getByText("13 May 2026 outcome review")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Request report" }));

    expect(onRequestReportJob).toHaveBeenCalledTimes(1);
    expect(
      screen.queryByRole("button", { name: /Prepare AI-assisted review summary/ }),
    ).not.toBeInTheDocument();
  });

  it("keeps unavailable handoffs disabled without client communication or execution actions", () => {
    render(
      <OutcomeReviewDetailHeader
        reviewLabel="Blocked outcome review"
        reportJobAvailable={false}
        reportJobPending={false}
        onRequestReportJob={vi.fn()}
      />,
    );

    expect(screen.getByRole("button", { name: "Request report" })).toBeDisabled();
    expect(
      screen.queryByRole("button", { name: /Prepare AI-assisted review summary/ }),
    ).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /client|communication|approval|delivery/i })).not.toBeInTheDocument();
    expect(screen.queryByText(/order|OMS|execution|fill|settlement/i)).not.toBeInTheDocument();
  });

  it("uses pending labels while parent-owned requests are running", () => {
    render(
      <OutcomeReviewDetailHeader
        reviewLabel="Pending outcome review"
        reportJobAvailable
        reportJobPending
        onRequestReportJob={vi.fn()}
      />,
    );

    expect(screen.getByRole("button", { name: "Requesting report" })).toBeDisabled();
    expect(
      screen.queryByRole("button", { name: /AI-assisted review summary/ }),
    ).not.toBeInTheDocument();
  });
});
