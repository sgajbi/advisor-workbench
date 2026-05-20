import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import OutcomeReviewSupportBadges from "../../src/features/workbench/components/outcome-review-support-badges";

describe("OutcomeReviewSupportBadges", () => {
  it("renders business-facing supportability posture from the source state", () => {
    render(<OutcomeReviewSupportBadges supportabilityState="SUPPORTED" />);

    const posture = screen.getByLabelText("Outcome review support posture");

    expect(posture).toHaveTextContent("Supported");
    expect(posture).toHaveTextContent("Evidence available");
  });

  it("keeps unavailable posture display-only without source identifiers or workflow controls", () => {
    render(<OutcomeReviewSupportBadges supportabilityState="UNAVAILABLE" />);

    const posture = screen.getByLabelText("Outcome review support posture");

    expect(posture).toHaveTextContent("Unavailable");
    expect(screen.queryByText(/outcome_review_id|rebalance_run_id|wave_id|sha256/i)).not.toBeInTheDocument();
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
    expect(screen.queryByRole("link")).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /client|communication|approval|delivery/i })
    ).not.toBeInTheDocument();
    expect(screen.queryByText(/order|OMS|execution|fill|settlement/i)).not.toBeInTheDocument();
  });
});
