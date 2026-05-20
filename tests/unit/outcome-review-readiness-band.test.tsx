import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import OutcomeReviewReadinessBand from "../../src/features/workbench/components/outcome-review-readiness-band";

describe("OutcomeReviewReadinessBand", () => {
  it("renders ready source-backed outcome review readiness without action controls", () => {
    render(
      <OutcomeReviewReadinessBand
        reviewWindow="01 May 2026 - 13 May 2026"
        reportInputBlocked={false}
        aiEvidenceBlocked={false}
        sourceEvidenceStatus="Available"
      />
    );

    const band = screen.getByLabelText("Selected outcome review readiness");

    expect(band).toHaveTextContent("Review Window01 May 2026 - 13 May 2026");
    expect(band).toHaveTextContent("Report InputReady");
    expect(band).toHaveTextContent("AI NarrativeReady");
    expect(band).toHaveTextContent("Source EvidenceAvailable");
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /client|communication|approval|delivery/i })
    ).not.toBeInTheDocument();
    expect(screen.queryByText(/order|OMS|execution|fill|settlement/i)).not.toBeInTheDocument();
  });

  it("renders fail-closed handoff posture from supplied boundary values", () => {
    render(
      <OutcomeReviewReadinessBand
        reviewWindow="01 May 2026 - 13 May 2026"
        reportInputBlocked
        aiEvidenceBlocked
        sourceEvidenceStatus="Partial"
      />
    );

    const band = screen.getByLabelText("Selected outcome review readiness");

    expect(band).toHaveTextContent("Report InputBlocked");
    expect(band).toHaveTextContent("AI NarrativeBlocked");
    expect(band).toHaveTextContent("Source EvidencePartial");
    expect(screen.queryByText(/source_ref|content_hash|sha256|outcome_review_id/i)).not.toBeInTheDocument();
  });
});
