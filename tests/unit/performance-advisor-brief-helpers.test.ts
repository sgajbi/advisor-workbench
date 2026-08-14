import { describe, expect, it } from "vitest";

import type { PerformanceAdvisorBriefViewModel } from "../../src/apps/performance/advisor-brief-view-model";
import {
  canCopyAdvisorBrief,
  dedupeAdvisorActions,
  toAdvisorNoteCopy,
} from "../../src/apps/performance/components/advisor-brief/performance-advisor-brief-helpers";

function buildBrief(
  overrides: Partial<PerformanceAdvisorBriefViewModel> = {}
): PerformanceAdvisorBriefViewModel {
  return {
    summary: "Source-grounded summary.",
    status: "ready",
    title: "Performance Advisor Brief",
    talkingPoints: [
      {
        headline: "Portfolio outperformed benchmark.",
        detail: "Active return was 1.25%.",
        tone: "positive",
        evidenceRefs: [],
      },
    ],
    recommendedActions: [
      { label: "Open Return Path", targetMode: "summary", route: "/performance?mode=summary" },
      { label: "Open Return Path", targetMode: "summary", route: "/performance?mode=summary" },
      { label: "Review Contribution", targetMode: "analysis", route: "/performance?mode=analysis" },
    ],
    risksAndExceptions: [],
    sourceMetrics: [],
    supportability: [],
    supportDetails: [],
    reviewNotes: [],
    aiDisclosure: {
      scopeLabel: "Performance advisor brief",
      preparation: "ai-assisted",
      availability: "simulation",
      evidence: { state: "supported", sourceCount: 1 },
      humanReview: { state: "review-required", sourceRecorded: false },
      clientUse: "blocked",
      freshness: { state: "not-reported" },
      limitations: [],
      diagnostics: [],
    },
    ...overrides,
  };
}

describe("performance-advisor-brief helpers", () => {
  it("deduplicates repeated workflow actions by target mode and label", () => {
    const actions = dedupeAdvisorActions(buildBrief().recommendedActions);

    expect(actions).toHaveLength(2);
    expect(actions.map((action) => `${action.targetMode}:${action.label}`)).toEqual([
      "summary:Open Return Path",
      "analysis:Review Contribution",
    ]);
  });

  it("builds note copy with a default risks fallback when no exceptions are present", () => {
    const note = toAdvisorNoteCopy(buildBrief());

    expect(note).toContain("Advisor Talking Points");
    expect(note).toContain("- Portfolio outperformed benchmark. Active return was 1.25%.");
    expect(note).toContain("Recommended Actions");
    expect(note).toContain("- Open Return Path");
    expect(note).toContain("Risks / Exceptions");
    expect(note).toContain("- No material supportability exceptions are flagged.");
  });

  it("admits only current evidence with a usable internal review posture for copying", () => {
    expect(canCopyAdvisorBrief(buildBrief())).toBe(true);
    expect(
      canCopyAdvisorBrief(
        buildBrief({
          aiDisclosure: {
            ...buildBrief().aiDisclosure,
            humanReview: { state: "rejected", sourceRecorded: true },
          },
        })
      )
    ).toBe(false);
    expect(
      canCopyAdvisorBrief(
        buildBrief({
          aiDisclosure: {
            ...buildBrief().aiDisclosure,
            availability: "stale",
            freshness: { state: "stale" },
          },
        })
      )
    ).toBe(false);
  });

  it("labels blocked and historical note text without implying review is pending", () => {
    const rejectedBrief = buildBrief({
      aiDisclosure: {
        ...buildBrief().aiDisclosure,
        humanReview: { state: "rejected", sourceRecorded: true },
      },
    });
    const historicalBrief = buildBrief({
      aiDisclosure: {
        ...buildBrief().aiDisclosure,
        availability: "stale",
      },
    });

    expect(toAdvisorNoteCopy(rejectedBrief)).toMatch(/^BLOCKED INTERNAL NOTE/);
    expect(toAdvisorNoteCopy(historicalBrief)).toMatch(/^HISTORICAL INTERNAL NOTE/);
    expect(toAdvisorNoteCopy(rejectedBrief)).not.toContain("Human review required");
  });
});
