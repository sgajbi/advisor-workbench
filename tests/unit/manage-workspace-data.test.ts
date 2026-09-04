import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import {
  proofPackPreloadErrorMessage,
  readDpmFairnessAnalysisId,
  readDpmMandateId,
  readPreloadableDpmProofPackId,
  readDpmProofPackId,
  readDpmReviewActionId,
} from "../../src/features/workbench/manage-workspace-data";
import { WorkbenchApiError } from "../../src/features/workbench/api-client";

describe("manage workspace data selectors", () => {
  it("preloads proof-pack detail through the server Gateway target", () => {
    const source = readFileSync(
      resolve(__dirname, "../../src/features/workbench/manage-workspace-data-loader.ts"),
      "utf8"
    );

    expect(source).toContain('getDpmProofPack(proofPackId, "server")');
  });

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

  it("preloads only directly available proof-pack detail identifiers", () => {
    expect(readPreloadableDpmProofPackId({ proof_pack_id: "ppack_direct" })).toBe(
      "ppack_direct"
    );
    expect(
      readPreloadableDpmProofPackId({
        items: [{ proof_pack_id: "ppack_from_review" }],
      })
    ).toBeNull();
  });

  it("renders product-safe copy for optional proof-pack preload failures", () => {
    expect(proofPackPreloadErrorMessage(new WorkbenchApiError("DPM proof pack", 404))).toBeNull();
    expect(proofPackPreloadErrorMessage(new Error("Failed to parse URL from /api/bff"))).toBe(
      "Evidence pack preload is temporarily unavailable. Prepare evidence to generate the current review pack."
    );
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
