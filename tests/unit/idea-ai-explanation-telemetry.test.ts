import { beforeEach, describe, expect, it } from "vitest";

import {
  getAnalyticsUiMetricEvents,
  resetAnalyticsUiMetricEvents,
} from "../../src/features/analytics-observability/metrics";
import {
  recordIdeaExplanationOpened,
  recordIdeaExplanationFailed,
  recordIdeaExplanationServed,
  recordIdeaExplanationUnavailable,
} from "../../src/features/proposals/idea-ai-explanation-telemetry";

describe("Idea explanation journey telemetry", () => {
  beforeEach(() => resetAnalyticsUiMetricEvents());

  it("records the fixed advisor-rationale purpose and bounded source disposition", () => {
    recordIdeaExplanationOpened();
    recordIdeaExplanationServed("executed");
    recordIdeaExplanationUnavailable("candidate_evidence_changed");

    expect(
      getAnalyticsUiMetricEvents().map((event) => ({
        operation: event.labels.operation,
        state: event.labels.state,
        reason: event.labels.reason,
      })),
    ).toEqual([
      {
        operation:
          "idea.candidate.ai-explanation.advisor_rationale_draft",
        state: "loading",
        reason: "none",
      },
      {
        operation:
          "idea.candidate.ai-explanation.advisor_rationale_draft",
        state: "ready",
        reason: "executed",
      },
      {
        operation:
          "idea.candidate.ai-explanation.advisor_rationale_draft",
        state: "partial",
        reason: "candidate_evidence_changed",
      },
    ]);
  });

  it("bounds an unknown disposition instead of emitting unbounded labels", () => {
    recordIdeaExplanationUnavailable("future_source_reason");

    expect(getAnalyticsUiMetricEvents()[0]?.labels.reason).toBe("other");
  });

  it("distinguishes request failure from a returned partial fallback", () => {
    recordIdeaExplanationFailed();

    expect(getAnalyticsUiMetricEvents()[0]?.labels).toMatchObject({
      state: "error",
      reason: "request_failed",
    });
  });
});
