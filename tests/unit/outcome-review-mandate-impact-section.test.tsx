import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import OutcomeReviewMandateImpactSection from "../../src/features/workbench/components/outcome-review-mandate-impact-section";

describe("OutcomeReviewMandateImpactSection", () => {
  it("renders mandate impact and source-shaped dimension evidence", () => {
    render(
      <OutcomeReviewMandateImpactSection
        mandateImpact="Portfolio drift improved while mandate tolerance remained intact."
        dimensions={[
          {
            key: "dimension-hidden-source-ref",
            dimension: "ALLOCATION_DRIFT",
            expected: "Reduce overweight",
            realized: "Reduced overweight",
            variance: "Within tolerance",
            state: "READY",
            explanation: "Allocation drift reduced within tolerance.",
          },
        ]}
      />,
    );

    const section = screen.getByLabelText("Outcome review mandate impact");

    expect(section).toHaveTextContent("Mandate impact");
    expect(section).toHaveTextContent("Portfolio drift improved while mandate tolerance remained intact.");
    expect(section).toHaveTextContent("Allocation drift");
    expect(section).toHaveTextContent("Within tolerance");
  });

  it("keeps outcome truth display-only without source identifiers or workflow controls", () => {
    render(
      <OutcomeReviewMandateImpactSection
        mandateImpact="Outcome remains suitable for internal review."
        dimensions={[]}
      />,
    );

    expect(screen.queryByText(/outcome_review_id|rebalance_run_id|wave_id|sha256/i)).not.toBeInTheDocument();
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /client|communication|approval|delivery/i })).not.toBeInTheDocument();
    expect(screen.queryByText(/order|OMS|execution|fill|settlement/i)).not.toBeInTheDocument();
  });
});
