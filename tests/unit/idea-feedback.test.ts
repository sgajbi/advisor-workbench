import { describe, expect, it } from "vitest";

import {
  IDEA_FEEDBACK_TAXONOMY_VERSION,
  matchesAdvisorIdeaFeedbackEvidence,
  NOT_USEFUL_REASON_OPTIONS,
  resolveAdvisorIdeaFeedbackReason,
  usefulFeedbackReasonOption,
  type AdvisorIdeaFeedbackRequest,
} from "../../src/features/proposals/idea-feedback";

const REQUEST: AdvisorIdeaFeedbackRequest = {
  feedbackId: "feedback-001",
  taxonomyVersion: IDEA_FEEDBACK_TAXONOMY_VERSION,
  outcome: "not_useful",
  reason: "insufficient_evidence",
  recordedAtUtc: "2026-08-31T10:15:00.000Z",
};

describe("governed adviser feedback contract", () => {
  it("exposes the exact source-owned reason set without retired aliases", () => {
    expect([
      usefulFeedbackReasonOption(),
      ...NOT_USEFUL_REASON_OPTIONS,
    ]).toEqual([
      { value: "relevant", label: "Relevant to this client" },
      { value: "not_relevant", label: "Not relevant to this client" },
      { value: "already_known", label: "Already known" },
      { value: "wrong_timing", label: "Timing is not appropriate" },
      { value: "insufficient_evidence", label: "Evidence is insufficient" },
      { value: "wrong_priority", label: "Priority is incorrect" },
      { value: "duplicate", label: "Duplicate opportunity" },
      {
        value: "client_specific_constraint",
        label: "Client-specific constraint",
      },
    ]);
  });

  it("binds useful feedback to relevance and requires a governed not-useful reason", () => {
    expect(resolveAdvisorIdeaFeedbackReason("useful", "")).toBe("relevant");
    expect(resolveAdvisorIdeaFeedbackReason("useful", "wrong_timing")).toBe(
      "relevant",
    );
    expect(resolveAdvisorIdeaFeedbackReason("not_useful", "")).toBeUndefined();
    for (const option of NOT_USEFUL_REASON_OPTIONS) {
      expect(resolveAdvisorIdeaFeedbackReason("not_useful", option.value)).toBe(
        option.value,
      );
    }
    expect(
      resolveAdvisorIdeaFeedbackReason("not_useful", "relevant"),
    ).toBeUndefined();
  });

  it("accepts only event evidence matching the submitted candidate and feedback", () => {
    const event = {
      ...REQUEST,
      candidateId: "idea-001",
      recordedAtUtc: "2026-08-31T10:15:00Z",
    };
    expect(
      matchesAdvisorIdeaFeedbackEvidence({
        candidateId: "idea-001",
        event,
        request: REQUEST,
      }),
    ).toBe(true);

    for (const mismatch of [
      { candidateId: "idea-002" },
      { feedbackId: "feedback-002" },
      { taxonomyVersion: "idea-feedback-taxonomy-v0" },
      { outcome: "useful" },
      { reason: "wrong_timing" },
      { recordedAtUtc: "2026-08-31T10:15:01Z" },
    ]) {
      expect(
        matchesAdvisorIdeaFeedbackEvidence({
          candidateId: "idea-001",
          event: { ...event, ...mismatch } as typeof event,
          request: REQUEST,
        }),
      ).toBe(false);
    }
    expect(
      matchesAdvisorIdeaFeedbackEvidence({
        candidateId: "idea-001",
        event: undefined,
        request: REQUEST,
      }),
    ).toBe(false);
  });
});
