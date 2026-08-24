import { describe, expect, it } from "vitest";

import { SUITABILITY_WORKFLOW_LABELS } from "../../src/features/proposals/suitability-terminology";

describe("suitability terminology", () => {
  it("names the business workflow separately from supporting policy evidence", () => {
    expect(SUITABILITY_WORKFLOW_LABELS).toEqual({
      review: "Suitability review",
      reviews: "Suitability reviews",
      reviewWorklist: "Suitability review worklist",
      adviserDecisionWorklist: "Adviser decision worklist",
      reviewCounts: "Suitability review counts",
      needsAction: "Needs action",
      chooseReview: "Choose a suitability review",
      selectedReview: "Selected suitability review",
      evidence: "Suitability evidence",
      reviewDeadline: "Review deadline",
    });
  });
});
