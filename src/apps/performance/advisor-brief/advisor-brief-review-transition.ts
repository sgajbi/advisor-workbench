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

const EXPECTED_TASK_FLOW_POSTURE = {
  ACCEPT: { flowStatus: "COMPLETED", supportabilityStatus: "READY" },
  REJECT: { flowStatus: "FAILED", supportabilityStatus: "ACTION_REQUIRED" },
  REVISE: { flowStatus: "SUPERSEDED", supportabilityStatus: "HISTORICAL" },
  SUPERSEDE: { flowStatus: "SUPERSEDED", supportabilityStatus: "HISTORICAL" },
  ABANDON: { flowStatus: "CANCELLED", supportabilityStatus: "ACTION_REQUIRED" },
} satisfies Record<
  WorkbenchAdvisorBriefWorkflowPackRunReviewActionRequest["action_type"],
  { flowStatus: string; supportabilityStatus: string }
>;

export function isConfirmedAdvisorBriefReviewTransition({
  response,
  payload,
  expectedPortfolioId,
  expectedRunId,
  previousRun,
}: {
  response: Pick<
    WorkbenchPerformanceAdvisorBrief,
    "portfolio_id" | "workflow_pack_run" | "workflow_pack_task_flow"
  >;
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
    run.review_pending !== false ||
    !hasRecordedAdvisorBriefReviewEvidence(run) ||
    !hasAdvancedReviewEvidence(run, previousRun) ||
    run.latest_review_actor?.trim() !== payload.reviewed_by.trim()
  ) {
    return false;
  }

  if (
    !hasMatchingTaskFlowPosture(response, payload, expectedRunId, run.supportability_status)
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

function hasMatchingTaskFlowPosture(
  response: Pick<WorkbenchPerformanceAdvisorBrief, "workflow_pack_task_flow">,
  payload: WorkbenchAdvisorBriefWorkflowPackRunReviewActionRequest,
  expectedRunId: string,
  runSupportabilityStatus: string
): boolean {
  const taskFlow = response.workflow_pack_task_flow;
  const expectedPosture = EXPECTED_TASK_FLOW_POSTURE[payload.action_type];
  const runRefs = Array.isArray(taskFlow?.run_refs) ? taskFlow.run_refs : [];
  const reviewStates =
    taskFlow?.review_states &&
    typeof taskFlow.review_states === "object" &&
    !Array.isArray(taskFlow.review_states)
      ? taskFlow.review_states
      : {};
  const handoffRefs = Array.isArray(taskFlow?.handoff_refs) ? taskFlow.handoff_refs : [];
  const replacementLineage = Array.isArray(taskFlow?.replacement_lineage)
    ? taskFlow.replacement_lineage
    : [];

  if (
    !taskFlow?.task_flow_id?.trim() ||
    !runRefs.includes(expectedRunId) ||
    reviewStates[expectedRunId] !== EXPECTED_REVIEW_STATE[payload.action_type] ||
    taskFlow.flow_status !== expectedPosture.flowStatus ||
    taskFlow.supportability_status !== expectedPosture.supportabilityStatus ||
    runSupportabilityStatus !== expectedPosture.supportabilityStatus
  ) {
    return false;
  }

  if (payload.action_type === "ACCEPT") {
    return handoffRefs.some((handoff) => handoff?.status === "READY_FOR_HANDOFF");
  }

  if (payload.action_type === "REVISE" || payload.action_type === "SUPERSEDE") {
    const replacementRunId = payload.replacement_run_id?.trim();
    return Boolean(
      replacementRunId &&
        replacementLineage.some(
          (lineage) =>
            lineage?.superseded_run_id === expectedRunId &&
            lineage.replacement_run_id === replacementRunId &&
            lineage.review_action_ref === payload.action_type
        )
    );
  }

  return !handoffRefs.some((handoff) => handoff?.status === "READY_FOR_HANDOFF");
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
