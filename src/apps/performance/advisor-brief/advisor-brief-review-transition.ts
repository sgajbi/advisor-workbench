import type {
  WorkbenchAdvisorBriefWorkflowPackRun,
  WorkbenchAdvisorBriefWorkflowPackRunReviewActionRequest,
  WorkbenchPerformanceAdvisorBrief,
} from "@/features/workbench/types";

import {
  hasRecordedAdvisorBriefReviewEvidence,
  parseAdvisorBriefReviewUtcTimestamp,
} from "./advisor-brief-review-evidence";

const EXPECTED_REVIEW_STATE = {
  ACCEPT: "ACCEPTED",
  REJECT: "REJECTED",
  REVISE: "REVISED",
  SUPERSEDE: "SUPERSEDED",
  ABANDON: "ABANDONED",
} satisfies Record<
  WorkbenchAdvisorBriefWorkflowPackRunReviewActionRequest["action_type"],
  string
>;

export function isConfirmedAdvisorBriefReviewTransition({
  response,
  payload,
  expectedPortfolioId,
  expectedRunId,
  previousRun,
}: {
  response: Pick<WorkbenchPerformanceAdvisorBrief, "portfolio_id" | "workflow_pack_run">;
  payload: WorkbenchAdvisorBriefWorkflowPackRunReviewActionRequest;
  expectedPortfolioId: string;
  expectedRunId: string | null;
  previousRun: WorkbenchAdvisorBriefWorkflowPackRun | null;
}): boolean {
  const run = response.workflow_pack_run;
  if (
    !run ||
    !expectedRunId ||
    response.portfolio_id !== expectedPortfolioId ||
    run.run_id !== expectedRunId ||
    run.review_state !== EXPECTED_REVIEW_STATE[payload.action_type] ||
    run.review_pending ||
    !hasRecordedAdvisorBriefReviewEvidence(run) ||
    !hasAdvancedReviewEvidence(run, previousRun) ||
    run.latest_review_actor?.trim() !== payload.reviewed_by.trim()
  ) {
    return false;
  }

  if (payload.action_type === "REVISE" || payload.action_type === "SUPERSEDE") {
    return (
      run.superseded === true &&
      Boolean(payload.replacement_run_id?.trim()) &&
      run.replacement_run_id?.trim() === payload.replacement_run_id?.trim()
    );
  }

  return run.superseded !== true && !run.replacement_run_id?.trim();
}

function hasAdvancedReviewEvidence(
  run: WorkbenchAdvisorBriefWorkflowPackRun,
  previousRun: WorkbenchAdvisorBriefWorkflowPackRun | null
): boolean {
  const responseCount = run.review_transition_count;
  const responseEventAt = parseAdvisorBriefReviewUtcTimestamp(run.latest_review_event_at);
  const previousCount = previousRun?.review_transition_count;
  const previousEventAt = previousRun?.latest_review_event_at?.trim();

  if (
    typeof responseCount !== "number" ||
    !Number.isInteger(responseCount) ||
    responseEventAt === null
  ) {
    return false;
  }

  if (
    previousCount !== null &&
    previousCount !== undefined &&
    (typeof previousCount !== "number" ||
      !Number.isInteger(previousCount) ||
      previousCount < 0)
  ) {
    return false;
  }

  const baselineCount = previousCount ?? 0;
  if (responseCount <= baselineCount) {
    return false;
  }

  if (!previousEventAt) {
    return previousRun?.has_review_history !== true;
  }

  const previousEventTimestamp = parseAdvisorBriefReviewUtcTimestamp(previousEventAt);
  return previousEventTimestamp !== null && responseEventAt > previousEventTimestamp;
}
