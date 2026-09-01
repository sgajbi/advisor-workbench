import { describe, expect, it } from "vitest";

import {
  PM_OPERATING_QUALITY_PERSISTENCE_SCOPE,
  pmOperatingQualityMutationKeys,
  pmOperatingQualityQueryKeys,
} from "../../src/features/workbench/pm-operating-quality-query-keys";

const context = {
  asOfDate: "2026-05-15",
  limit: 10,
  offset: 0,
};

describe("PM operating-quality Query identity", () => {
  it("keeps each source collection and selected record independently addressable", () => {
    expect(pmOperatingQualityQueryKeys.fairnessAnalyses(context)).not.toEqual(
      pmOperatingQualityQueryKeys.reviewActions(context),
    );
    expect(pmOperatingQualityQueryKeys.reviewActions(context)).not.toEqual(
      pmOperatingQualityQueryKeys.summaryInvocations(context),
    );
    expect(pmOperatingQualityQueryKeys.fairnessAnalysis("fairness-1")).not.toEqual(
      pmOperatingQualityQueryKeys.fairnessAnalysis("fairness-2"),
    );
    expect(pmOperatingQualityQueryKeys.reviewAction("review-1")).not.toEqual(
      pmOperatingQualityQueryKeys.reviewAction("review-2"),
    );
  });

  it("includes every list request dimension in collection identity", () => {
    for (const variant of [
      { ...context, asOfDate: "2026-05-16" },
      { ...context, limit: 20 },
      { ...context, offset: 10 },
    ]) {
      expect(pmOperatingQualityQueryKeys.fairnessAnalyses(variant)).not.toEqual(
        pmOperatingQualityQueryKeys.fairnessAnalyses(context),
      );
    }
  });

  it("uses distinct command identities under one governed mutation family", () => {
    const keys = [
      pmOperatingQualityMutationKeys.scoreRunPreview(),
      pmOperatingQualityMutationKeys.supportSummary(),
      pmOperatingQualityMutationKeys.fairnessPreview(),
      pmOperatingQualityMutationKeys.fairnessCreate(),
      pmOperatingQualityMutationKeys.reviewActionPreview(),
      pmOperatingQualityMutationKeys.reviewActionCreate(),
      pmOperatingQualityMutationKeys.summaryInvocationPreview(),
      pmOperatingQualityMutationKeys.summaryInvocationCreate(),
    ];

    expect(new Set(keys.map((key) => JSON.stringify(key)))).toHaveLength(8);
    expect(keys.every((key) => key.slice(0, 3).join("/") === "workbench/pm-operating-quality/mutation")).toBe(true);
    expect(PM_OPERATING_QUALITY_PERSISTENCE_SCOPE).toBe(
      "workbench-pm-operating-quality-persistence",
    );
  });
});
