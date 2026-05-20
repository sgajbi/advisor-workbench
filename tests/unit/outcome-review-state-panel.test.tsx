import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import OutcomeReviewStatePanel from "../../src/features/workbench/components/outcome-review-state-panel";

describe("OutcomeReviewStatePanel", () => {
  it("stays hidden when the outcome review surface is ready", () => {
    const { container } = render(
      <OutcomeReviewStatePanel
        portfolioId="PB_SG_GLOBAL_BAL_001"
        state="ready"
      />
    );

    expect(container).toBeEmptyDOMElement();
  });

  it("renders portfolio-specific empty posture without workflow controls", () => {
    render(
      <OutcomeReviewStatePanel
        portfolioId="PB_SG_GLOBAL_BAL_001"
        state="empty"
      />
    );

    expect(
      screen.getByText("No outcome reviews for this portfolio")
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        "No outcome review is currently available for PB_SG_GLOBAL_BAL_001."
      )
    ).toBeInTheDocument();
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
    expect(screen.queryByRole("link")).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /client|communication|approval|delivery/i })
    ).not.toBeInTheDocument();
    expect(screen.queryByText(/order|OMS|execution|fill|settlement/i)).not.toBeInTheDocument();
  });

  it("renders Gateway error posture as partial unavailable state", () => {
    render(
      <OutcomeReviewStatePanel
        portfolioId="PB_SG_GLOBAL_BAL_001"
        state="ready"
        errorMessage="Gateway outcome review request failed"
      />
    );

    expect(screen.getByText("Outcome review is unavailable")).toBeInTheDocument();
    expect(
      screen.getByText("Gateway outcome review request failed")
    ).toBeInTheDocument();
    expect(screen.queryByText(/outcome_review_id|rebalance_run_id|sha256/i)).not.toBeInTheDocument();
  });
});
