import type { WorkbenchAdvisorBriefWorkflowPackRun } from "@/features/workbench/types";
import type { AiHumanReviewState } from "@/design-system";

type AdvisorBriefReviewEvidence = Pick<
  WorkbenchAdvisorBriefWorkflowPackRun,
  | "has_review_history"
  | "latest_review_actor"
  | "latest_review_event_at"
  | "review_transition_count"
>;

const REVIEW_STATE_LABELS: Readonly<Record<string, string>> = {
  ACCEPTED: "Accepted for internal use",
  REJECTED: "Rejected",
  REVISED: "Revision requested",
  SUPERSEDED: "Superseded",
  ABANDONED: "Withdrawn",
  AWAITING_REVIEW: "Awaiting review",
  NOT_REVIEW_REQUIRED: "No review required",
};

type AdvisorBriefHumanReview = {
  state: AiHumanReviewState;
  sourceRecorded: boolean;
  actor?: string;
  occurredAt?: string;
};

export function getAdvisorBriefReviewStateLabel(value: string): string {
  return REVIEW_STATE_LABELS[value.trim().toUpperCase()] ?? "Not reported";
}

export function buildAdvisorBriefHumanReview(
  workflowPackRun: WorkbenchAdvisorBriefWorkflowPackRun | null | undefined
): AdvisorBriefHumanReview {
  const sourceRecorded = hasRecordedAdvisorBriefReviewEvidence(workflowPackRun);
  const actor = workflowPackRun?.latest_review_actor?.trim();
  const occurredAt = workflowPackRun?.latest_review_event_at?.trim();
  const recordedEvidence = {
    sourceRecorded,
    ...(sourceRecorded && actor ? { actor } : {}),
    ...(sourceRecorded && occurredAt ? { occurredAt } : {}),
  };
  const normalizedReviewState = workflowPackRun?.review_state.trim().toUpperCase();

  if (workflowPackRun?.review_pending === true) {
    return normalizedReviewState === "AWAITING_REVIEW"
      ? { state: "review-required", sourceRecorded: false }
      : { state: "unavailable", sourceRecorded: false };
  }

  if (workflowPackRun?.review_pending !== false) {
    return { state: "unavailable", sourceRecorded: false };
  }

  switch (normalizedReviewState) {
    case "ACCEPTED":
    case "REVISED":
    case "SUPERSEDED":
      return {
        state: sourceRecorded ? "reviewed" : "unavailable",
        ...recordedEvidence,
      };
    case "REJECTED":
    case "ABANDONED":
      return {
        state: sourceRecorded ? "rejected" : "unavailable",
        ...recordedEvidence,
      };
    case "NOT_REVIEW_REQUIRED":
      return { state: "not-required", sourceRecorded: false };
    case "AWAITING_REVIEW":
      return { state: "unavailable", sourceRecorded: false };
    default:
      return { state: "unavailable", sourceRecorded: false };
  }
}

export function isHistoricalAdvisorBriefReviewState(
  reviewState: string | null | undefined
): boolean {
  const normalizedState = reviewState?.trim().toUpperCase();
  return normalizedState === "REVISED" || normalizedState === "SUPERSEDED";
}

export function isTerminalAdvisorBriefReviewState(
  reviewState: string | null | undefined
): boolean {
  const normalizedState = reviewState?.trim().toUpperCase();
  return ["ACCEPTED", "REJECTED", "REVISED", "SUPERSEDED", "ABANDONED"].includes(
    normalizedState ?? ""
  );
}

export function hasRecordedAdvisorBriefReviewEvidence(
  evidence: AdvisorBriefReviewEvidence | null | undefined
): boolean {
  const reviewTransitionCount = evidence?.review_transition_count;
  return (
    evidence?.has_review_history === true &&
    Boolean(evidence.latest_review_actor?.trim()) &&
    typeof reviewTransitionCount === "number" &&
    Number.isInteger(reviewTransitionCount) &&
    reviewTransitionCount > 0 &&
    parseAdvisorBriefReviewUtcTimestamp(evidence.latest_review_event_at) !== null
  );
}

export function parseAdvisorBriefReviewUtcTimestamp(
  value: string | null | undefined
): number | null {
  const timestamp = value?.trim();
  const match = timestamp?.match(
    /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.\d{1,6})?(?:Z|\+00:00)$/
  );
  if (!timestamp || !match) {
    return null;
  }

  const parsedTimestamp = Date.parse(timestamp);
  if (!Number.isFinite(parsedTimestamp)) {
    return null;
  }

  const parsedDate = new Date(parsedTimestamp);
  const [, year, month, day, hour, minute, second] = match;
  return (
    parsedDate.getUTCFullYear() === Number(year) &&
    parsedDate.getUTCMonth() + 1 === Number(month) &&
    parsedDate.getUTCDate() === Number(day) &&
    parsedDate.getUTCHours() === Number(hour) &&
    parsedDate.getUTCMinutes() === Number(minute) &&
    parsedDate.getUTCSeconds() === Number(second)
  )
    ? parsedTimestamp
    : null;
}
