import { describe, expect, it } from "vitest";

import {
  formatPmQualityReasonCodeList,
  pmOperatingQualityStatePanelCopy,
} from "../../src/features/workbench/pm-operating-quality-panel-helpers";

describe("PM operating quality panel helpers", () => {
  it("maps panel states to product-safe state-panel copy", () => {
    expect(pmOperatingQualityStatePanelCopy("empty")).toEqual({
      kind: "empty",
      title: "No PM operating quality evidence returned",
      body: "No policy or score-run evidence is currently available for this PM book.",
    });
    expect(pmOperatingQualityStatePanelCopy("partial")).toEqual({
      kind: "partial",
      title: "PM operating quality evidence is partial",
      body: "Some policy or score-run inputs require review before a persisted score run is used.",
    });
    expect(pmOperatingQualityStatePanelCopy("blocked")).toEqual({
      kind: "permission_blocked",
      title: "PM operating quality action is blocked",
      body: "Manage has published blocked actions for this PM operating quality posture.",
    });
    expect(pmOperatingQualityStatePanelCopy("unavailable")).toEqual({
      kind: "unavailable",
      title: "PM operating quality is unavailable",
      body: "PM operating quality evidence could not be loaded from Gateway.",
    });
    expect(pmOperatingQualityStatePanelCopy("ready")).toEqual({
      kind: "unavailable",
      title: "PM operating quality is unavailable",
      body: "PM operating quality evidence could not be loaded from Gateway.",
    });
  });

  it("formats source-owned reason code lists without changing raw codes", () => {
    expect(formatPmQualityReasonCodeList("N/A")).toBe("N/A");
    expect(formatPmQualityReasonCodeList("-")).toBe("-");
    expect(formatPmQualityReasonCodeList("")).toBe("N/A");
    expect(
      formatPmQualityReasonCodeList(
        "PM_QUALITY_FAIRNESS_SPREAD_REVIEW_REQUIRED, SEGMENT_MINIMUM_SCORE_RUNS_NOT_MET"
      )
    ).toBe(
      "Fairness review required (PM_QUALITY_FAIRNESS_SPREAD_REVIEW_REQUIRED), Insufficient segment evidence (SEGMENT_MINIMUM_SCORE_RUNS_NOT_MET)"
    );
  });
});
