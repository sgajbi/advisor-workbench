import { describe, expect, it } from "vitest";

import {
  readDpmFairnessAnalysisId,
  readDpmMandateId,
  readDpmProofPackId,
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
});
