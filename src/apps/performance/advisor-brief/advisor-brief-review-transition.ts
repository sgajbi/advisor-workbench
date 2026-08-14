import type {
  WorkbenchAdvisorBriefWorkflowPackRunReviewActionRequest,
  WorkbenchPerformanceAdvisorBrief,
} from "@/features/workbench/types";

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
}: {
  response: Pick<WorkbenchPerformanceAdvisorBrief, "portfolio_id" | "workflow_pack_run">;
  payload: WorkbenchAdvisorBriefWorkflowPackRunReviewActionRequest;
  expectedPortfolioId: string;
  expectedRunId: string | null;
}): boolean {
  const run = response.workflow_pack_run;
  if (
    !run ||
    !expectedRunId ||
    response.portfolio_id !== expectedPortfolioId ||
    run.run_id !== expectedRunId ||
    run.review_state !== EXPECTED_REVIEW_STATE[payload.action_type] ||
    run.has_review_history !== true ||
    typeof run.review_transition_count !== "number" ||
    run.review_transition_count <= 0 ||
    run.latest_review_actor?.trim() !== payload.reviewed_by.trim() ||
    !isValidUtcTimestamp(run.latest_review_event_at)
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

  return true;
}

function isValidUtcTimestamp(value: string | null | undefined): boolean {
  const timestamp = value?.trim();
  return Boolean(
    timestamp &&
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,6})?(?:Z|\+00:00)$/.test(
        timestamp
      ) &&
      Number.isFinite(Date.parse(timestamp))
  );
}
