import type { WorkbenchAdvisorBriefWorkflowPackRun } from "@/features/workbench/types";

type AdvisorBriefReviewEvidence = Pick<
  WorkbenchAdvisorBriefWorkflowPackRun,
  | "has_review_history"
  | "latest_review_actor"
  | "latest_review_event_at"
  | "review_transition_count"
>;

export function hasRecordedAdvisorBriefReviewEvidence(
  evidence: AdvisorBriefReviewEvidence | null | undefined
): boolean {
  return (
    evidence?.has_review_history === true &&
    Boolean(evidence.latest_review_actor?.trim()) &&
    typeof evidence.review_transition_count === "number" &&
    evidence.review_transition_count > 0 &&
    isValidUtcReviewTimestamp(evidence.latest_review_event_at)
  );
}

function isValidUtcReviewTimestamp(
  value: string | null | undefined
): boolean {
  const timestamp = value?.trim();
  const match = timestamp?.match(
    /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.\d{1,6})?(?:Z|\+00:00)$/
  );
  if (!timestamp || !match) {
    return false;
  }

  const parsedTimestamp = Date.parse(timestamp);
  if (!Number.isFinite(parsedTimestamp)) {
    return false;
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
  );
}
