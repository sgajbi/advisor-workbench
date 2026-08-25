import { describe, expect, it } from "vitest";

import {
  decisionDataQualityStatus,
  decisionReadinessStatus,
} from "../../src/copy/decision-readiness-copy";

describe("decision readiness copy", () => {
  it("distinguishes ready evidence from evidence requiring review", () => {
    expect(decisionReadinessStatus(true)).toEqual({
      label: "Ready",
      tone: "success",
    });
    expect(decisionReadinessStatus(false)).toEqual({
      label: "Review required",
      tone: "warn",
    });
  });

  it("requires review when data-quality warnings or failures exist", () => {
    expect(decisionDataQualityStatus(0, 0).label).toBe("Ready");
    expect(decisionDataQualityStatus(1, 0).label).toBe("Review required");
    expect(decisionDataQualityStatus(0, 1).label).toBe("Review required");
  });
});
