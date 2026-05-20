import { describe, expect, it } from "vitest";

import {
  readDpmFairnessAnalysisId,
  readDpmMandateId,
  readDpmProofPackId,
  readDpmReviewActionId,
} from "../../src/features/workbench/manage-workspace-data";

describe("manage workspace data selectors", () => {
  it("reads mandate identifiers from top-level and nested Gateway payloads", () => {
    expect(readDpmMandateId({ mandate_id: "mandate_direct" })).toBe("mandate_direct");
    expect(readDpmMandateId({ mandate: { mandate_id: "mandate_nested" } })).toBe(
      "mandate_nested"
    );
    expect(readDpmMandateId({ mandate_id: " " })).toBeNull();
  });

  it("reads the first source-owned proof-pack identifier without constructing one", () => {
    expect(readDpmProofPackId({ proof_pack_id: "ppack_direct" })).toBe("ppack_direct");
    expect(
      readDpmProofPackId({
        items: [{ proof_pack_id: "" }, { proof_pack_id: "ppack_from_review" }],
      })
    ).toBe("ppack_from_review");
    expect(readDpmProofPackId({ items: [{ proof_pack_id: " " }] })).toBeNull();
  });

  it("reads fairness-analysis identifiers from every supported Gateway shape", () => {
    expect(readDpmFairnessAnalysisId({ fairness_analysis_id: "fair_direct" })).toBe(
      "fair_direct"
    );
    expect(
      readDpmFairnessAnalysisId({ fairness_analysis: { fairness_analysis_id: "fair_nested" } })
    ).toBe("fair_nested");
    expect(
      readDpmFairnessAnalysisId({
        fairness_analyses: [{ fairness_analysis_id: "fair_list" }],
      })
    ).toBe("fair_list");
    expect(
      readDpmFairnessAnalysisId({
        items: [{ fairness_analysis_id: "fair_items" }],
      })
    ).toBe("fair_items");
    expect(readDpmFairnessAnalysisId({ fairness_analyses: [{}] })).toBeNull();
  });

  it("reads PM quality review-action identifiers from every supported Gateway shape", () => {
    expect(readDpmReviewActionId({ review_action_id: "review_direct" })).toBe(
      "review_direct"
    );
    expect(
      readDpmReviewActionId({ review_action: { review_action_id: "review_nested" } })
    ).toBe("review_nested");
    expect(
      readDpmReviewActionId({
        review_actions: [{ review_action_id: "review_list" }],
      })
    ).toBe("review_list");
    expect(
      readDpmReviewActionId({
        items: [{ review_action_id: "review_items" }],
      })
    ).toBe("review_items");
    expect(readDpmReviewActionId({ review_actions: [{}] })).toBeNull();
  });
});
