export const IDEA_FEEDBACK_TAXONOMY_VERSION =
  "idea-feedback-taxonomy-v1" as const;

export type AdvisorIdeaFeedbackOutcome = "useful" | "not_useful";

export type AdvisorIdeaFeedbackReason =
  | "relevant"
  | "not_relevant"
  | "already_known"
  | "wrong_timing"
  | "insufficient_evidence"
  | "wrong_priority"
  | "duplicate"
  | "client_specific_constraint";

export type AdvisorIdeaFeedbackRequest = {
  feedbackId: string;
  taxonomyVersion: typeof IDEA_FEEDBACK_TAXONOMY_VERSION;
  outcome: AdvisorIdeaFeedbackOutcome;
  reason: AdvisorIdeaFeedbackReason;
  recordedAtUtc: string;
};

export type AdvisorIdeaFeedbackEvent = AdvisorIdeaFeedbackRequest & {
  candidateId: string;
  evidencePacketId: string;
  actorRole: string;
};

export type AdvisorIdeaFeedbackReasonOption = {
  value: AdvisorIdeaFeedbackReason;
  label: string;
};

const USEFUL_REASON: AdvisorIdeaFeedbackReasonOption = {
  value: "relevant",
  label: "Relevant to this client",
};

export const NOT_USEFUL_REASON_OPTIONS: readonly AdvisorIdeaFeedbackReasonOption[] =
  [
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
  ];

const TIMEZONE_AWARE_TIMESTAMP = /(?:Z|[+-]\d{2}:\d{2})$/i;

export function resolveAdvisorIdeaFeedbackReason(
  outcome: AdvisorIdeaFeedbackOutcome,
  selectedReason: AdvisorIdeaFeedbackReason | "",
): AdvisorIdeaFeedbackReason | undefined {
  if (outcome === "useful") {
    return USEFUL_REASON.value;
  }
  return (
    selectedReason &&
    NOT_USEFUL_REASON_OPTIONS.some(({ value }) => value === selectedReason)
  )
    ? selectedReason
    : undefined;
}

export function usefulFeedbackReasonOption(): AdvisorIdeaFeedbackReasonOption {
  return USEFUL_REASON;
}

export function matchesAdvisorIdeaFeedbackEvidence({
  candidateId,
  event,
  request,
}: {
  candidateId: string;
  event: AdvisorIdeaFeedbackEvent | undefined;
  request: AdvisorIdeaFeedbackRequest;
}): boolean {
  if (!event) {
    return false;
  }
  if (
    !event.evidencePacketId.trim() ||
    !event.actorRole.trim() ||
    !TIMEZONE_AWARE_TIMESTAMP.test(request.recordedAtUtc) ||
    !TIMEZONE_AWARE_TIMESTAMP.test(event.recordedAtUtc)
  ) {
    return false;
  }
  const submittedAt = Date.parse(request.recordedAtUtc);
  const persistedAt = Date.parse(event.recordedAtUtc);
  return (
    event.candidateId === candidateId &&
    event.feedbackId === request.feedbackId &&
    event.taxonomyVersion === request.taxonomyVersion &&
    event.outcome === request.outcome &&
    event.reason === request.reason &&
    Number.isFinite(submittedAt) &&
    submittedAt === persistedAt
  );
}
