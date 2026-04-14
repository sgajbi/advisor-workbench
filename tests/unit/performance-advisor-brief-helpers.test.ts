import { describe, expect, it } from "vitest";

import type { PerformanceAdvisorBriefViewModel } from "../../src/apps/performance/advisor-brief-view-model";
import {
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
    reviewNotes: [],
    audit: {
      taskId: "task-1",
      outputLabel: "EXPLANATION_ONLY",
      promptVersion: "prompt.v1",
      providerMode: "local_openai_compatible",
      providerId: "text.local",
      adapterKind: "OPENAI_COMPATIBLE_LOCAL",
      modelId: "qwen3:8b",
      generatedAt: "2026-04-14",
      sourceRefs: ["lotus-gateway:workbench:PF_1001:performance-summary:YTD"],
      stubbed: true,
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

    expect(note).toContain("Client Talking Points");
    expect(note).toContain("- Portfolio outperformed benchmark. Active return was 1.25%.");
    expect(note).toContain("Recommended Actions");
    expect(note).toContain("- Open Return Path");
    expect(note).toContain("Risks / Exceptions");
    expect(note).toContain("- No material supportability exceptions are flagged.");
  });
});
