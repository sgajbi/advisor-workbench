import type {
  DpmPmOperatingQualityReviewActionRequest,
  DpmPmOperatingQualitySummaryInvocationRequest,
} from "@/features/workbench/pm-operating-quality-api";
import type {
  PmQualityCommandOption,
  PmQualityReviewActionForm,
  PmQualityReviewTargetOption,
  PmQualitySummaryInvocationForm,
} from "@/features/workbench/pm-operating-quality-actions";
import type {
  PmOperatingQualityPanelModel,
  PmOperatingQualitySelection,
} from "@/features/workbench/pm-operating-quality-view-model";

export function readPmOperatingQualitySelection(
  model: PmOperatingQualityPanelModel
): PmOperatingQualitySelection {
  return {
    scoreRunId: model.selectedScoreRun?.scoreRunId ?? null,
    fairnessAnalysisId: model.selectedFairnessAnalysis?.fairnessAnalysisId ?? null,
    reviewActionId: model.selectedReviewAction?.reviewActionId ?? null,
  };
}

export function pmOperatingQualitySelectionEquals(
  left: PmOperatingQualitySelection,
  right: PmOperatingQualitySelection
): boolean {
  return (
    left.scoreRunId === right.scoreRunId &&
    left.fairnessAnalysisId === right.fairnessAnalysisId &&
    left.reviewActionId === right.reviewActionId
  );
}

export function buildPmOperatingQualitySelectionKey(
  selection: PmOperatingQualitySelection
): string {
  return [
    selection.scoreRunId ?? "none",
    selection.fairnessAnalysisId ?? "none",
    selection.reviewActionId ?? "none",
  ].join("|");
}

export function resolveReviewTargetType(
  preferredTargetType: string,
  model: PmOperatingQualityPanelModel
): string {
  if (preferredTargetType === "FAIRNESS_ANALYSIS" && model.selectedFairnessAnalysis) {
    return "FAIRNESS_ANALYSIS";
  }
  if (preferredTargetType === "SCORE_RUN" && model.selectedScoreRun) {
    return "SCORE_RUN";
  }
  return model.selectedFairnessAnalysis ? "FAIRNESS_ANALYSIS" : "SCORE_RUN";
}

export function buildReviewActionPreviewKey(form: PmQualityReviewActionForm): string {
  return `${form.targetType}|${form.targetId}|${form.actionType}|${form.actionState}|${form.reviewActionRef}|${form.actorId}|${form.boundedRationale}`;
}

export function buildSummaryInvocationPreviewKey(
  form: PmQualitySummaryInvocationForm
): string {
  return [
    form.scoreRunId,
    form.reviewActionId,
    form.invocationState,
    form.summaryRef,
    form.requestedBy,
    form.workflowPackName,
    form.workflowPackVersion,
    form.workflowRunId,
    form.artifactRef,
    form.contentHash,
  ].join("|");
}

export function resolveReviewActionTarget(model: PmOperatingQualityPanelModel): {
  targetType: string;
  targetId: string;
  reviewActionRef: string;
} {
  if (model.selectedFairnessAnalysis?.fairnessAnalysisId) {
    return {
      targetType: "FAIRNESS_ANALYSIS",
      targetId: model.selectedFairnessAnalysis.fairnessAnalysisId,
      reviewActionRef: `PMQ-REVIEW-${model.selectedFairnessAnalysis.fairnessAnalysisId}`,
    };
  }
  if (model.selectedScoreRun?.scoreRunId) {
    return {
      targetType: "SCORE_RUN",
      targetId: model.selectedScoreRun.scoreRunId,
      reviewActionRef: `PMQ-REVIEW-${model.selectedScoreRun.scoreRunId}`,
    };
  }
  return {
    targetType: "SCORE_RUN",
    targetId: "",
    reviewActionRef: "PMQ-REVIEW",
  };
}

export function resolveSummaryInvocationTarget(model: PmOperatingQualityPanelModel): {
  scoreRunId: string;
  reviewActionId: string;
  summaryRef: string;
} {
  const scoreRunId = model.selectedScoreRun?.scoreRunId ?? "";
  const reviewActionId =
    model.selectedReviewAction?.reviewActionId ??
    (model.reviewActionDetail.reviewActionId !== "N/A"
      ? model.reviewActionDetail.reviewActionId
      : "");
  return {
    scoreRunId,
    reviewActionId,
    summaryRef: scoreRunId ? `PMQ-SUMMARY-${scoreRunId}` : "PMQ-SUMMARY",
  };
}

export function buildReviewActionTargetOptions(
  model: PmOperatingQualityPanelModel
): PmQualityReviewTargetOption[] {
  return [
    ...model.scoreRunRows
      .filter((row) => row.scoreRunId !== "N/A")
      .map((row) => ({
        targetType: "SCORE_RUN",
        value: row.scoreRunId,
        label: `${row.scoreRunId} / ${row.pmId}`,
        detail: `${row.bookId} | ${row.state} | ${row.asOfDate}`,
      })),
    ...model.fairnessAnalysisRows
      .filter((row) => row.fairnessAnalysisId !== "N/A")
      .map((row) => ({
        targetType: "FAIRNESS_ANALYSIS",
        value: row.fairnessAnalysisId,
        label: row.fairnessAnalysisId,
        detail: `${row.state} | ${row.policy} | ${row.asOfDate}`,
      })),
  ];
}

export function buildSummaryInvocationScoreRunOptions(
  model: PmOperatingQualityPanelModel
): PmQualityCommandOption[] {
  return model.scoreRunRows
    .filter((row) => row.scoreRunId !== "N/A")
    .map((row) => ({
      value: row.scoreRunId,
      label: `${row.scoreRunId} / ${row.pmId}`,
      detail: `${row.bookId} | ${row.state} | ${row.asOfDate}`,
    }));
}

export function buildSummaryInvocationReviewActionOptions(
  model: PmOperatingQualityPanelModel
): PmQualityCommandOption[] {
  return model.reviewActionRows
    .filter((row) => row.reviewActionId !== "N/A")
    .map((row) => ({
      value: row.reviewActionId,
      label: row.reviewActionRef,
      detail: `${row.reviewActionId} | ${row.target} | ${row.actionState}`,
    }));
}

export function buildReviewActionRef(targetId: string, currentRef: string): string {
  if (!targetId.trim()) {
    return currentRef;
  }
  if (!currentRef.trim() || currentRef.startsWith("PMQ-REVIEW-")) {
    return `PMQ-REVIEW-${targetId.trim()}`;
  }
  return currentRef;
}

export function buildSummaryInvocationRef(scoreRunId: string, currentRef: string): string {
  if (!scoreRunId.trim()) {
    return currentRef;
  }
  if (!currentRef.trim() || currentRef.startsWith("PMQ-SUMMARY-")) {
    return `PMQ-SUMMARY-${scoreRunId.trim()}`;
  }
  return currentRef;
}

export function resolveReviewActionReadiness(params: {
  form: PmQualityReviewActionForm;
  policyId: string;
  policyVersion: string;
  blockedActions: string[];
}): { state: string; detail: string } {
  const blocked = params.blockedActions.find((action) =>
    [
      "PREVIEW_REVIEW_ACTION",
      "CREATE_REVIEW_ACTION",
      "PREVIEW_PM_QUALITY_REVIEW_ACTION",
      "CREATE_PM_QUALITY_REVIEW_ACTION",
    ].includes(action)
  );
  if (blocked) {
    return { state: "BLOCKED", detail: "Blocked by Manage action register" };
  }
  if (!params.form.targetType || !params.form.targetId) {
    return {
      state: "BLOCKED",
      detail: "Select a Manage-owned score run or fairness analysis target.",
    };
  }
  if (!params.form.actorId.trim()) {
    return { state: "BLOCKED", detail: "Supervisor actor is required." };
  }
  if (!params.form.reviewActionRef.trim()) {
    return { state: "BLOCKED", detail: "Bank review reference is required." };
  }
  if (!params.form.boundedRationale.trim()) {
    return { state: "BLOCKED", detail: "Bounded supervisory rationale is required." };
  }
  if (params.policyId === "N/A" || params.policyVersion === "N/A") {
    return { state: "BLOCKED", detail: "Blocked until Manage returns policy id and version." };
  }
  return {
    state: "READY",
    detail: `Ready to preview ${formatReviewActionTarget(params.form.targetType)} ${params.form.targetId}`,
  };
}

export function resolveSummaryInvocationReadiness(params: {
  form: PmQualitySummaryInvocationForm;
  policyId: string;
  policyVersion: string;
  blockedActions: string[];
}): { state: string; detail: string } {
  const blocked = params.blockedActions.find((action) =>
    [
      "PREVIEW_SUMMARY_INVOCATION",
      "CREATE_SUMMARY_INVOCATION",
      "PREVIEW_PM_QUALITY_SUMMARY_INVOCATION",
      "CREATE_PM_QUALITY_SUMMARY_INVOCATION",
    ].includes(action)
  );
  if (blocked) {
    return { state: "BLOCKED", detail: "Blocked by Manage action register" };
  }
  if (!params.form.scoreRunId.trim()) {
    return { state: "BLOCKED", detail: "Select a Manage-owned score run." };
  }
  if (!params.form.reviewActionId.trim()) {
    return { state: "BLOCKED", detail: "Record or select a Manage review action first." };
  }
  if (!params.form.requestedBy.trim()) {
    return { state: "BLOCKED", detail: "Supervisor requester is required." };
  }
  if (!params.form.summaryRef.trim()) {
    return { state: "BLOCKED", detail: "Bank summary reference is required." };
  }
  if (params.policyId === "N/A" || params.policyVersion === "N/A") {
    return { state: "BLOCKED", detail: "Blocked until Manage returns policy id and version." };
  }
  return {
    state: "READY",
    detail: `Ready to preview summary invocation for score run ${params.form.scoreRunId}`,
  };
}

export function buildReviewActionRequest(
  form: PmQualityReviewActionForm,
  model: PmOperatingQualityPanelModel
): DpmPmOperatingQualityReviewActionRequest {
  return {
    target_type: form.targetType,
    target_id: form.targetId,
    action_type: form.actionType,
    action_state: form.actionState,
    review_action_ref: form.reviewActionRef.trim(),
    review_reason: form.boundedRationale.trim(),
    actor_id: form.actorId.trim(),
    policy_id: model.policyId !== "N/A" ? model.policyId : undefined,
    policy_version: model.policyVersion !== "N/A" ? model.policyVersion : undefined,
    as_of_date: resolveReviewActionAsOfDate(form, model),
    source_refs: [],
  };
}

function resolveReviewActionAsOfDate(
  form: PmQualityReviewActionForm,
  model: PmOperatingQualityPanelModel
): string | undefined {
  if (form.targetType === "FAIRNESS_ANALYSIS") {
    const analysis = model.fairnessAnalysisRows.find(
      (row) => row.fairnessAnalysisId === form.targetId
    );
    return analysis?.asOfDate !== "N/A" ? analysis?.asOfDate : undefined;
  }
  if (form.targetType === "SCORE_RUN") {
    const scoreRun = model.scoreRunRows.find((row) => row.scoreRunId === form.targetId);
    return scoreRun?.asOfDate !== "N/A" ? scoreRun?.asOfDate : undefined;
  }
  return undefined;
}

export function buildSummaryInvocationRequest(
  form: PmQualitySummaryInvocationForm
): DpmPmOperatingQualitySummaryInvocationRequest {
  return {
    score_run_id: form.scoreRunId.trim(),
    review_action_id: form.reviewActionId.trim(),
    invocation_state: form.invocationState || "PENDING_REVIEW",
    summary_ref: form.summaryRef.trim(),
    workflow_pack_name: optionalTrimmed(form.workflowPackName),
    workflow_pack_version: optionalTrimmed(form.workflowPackVersion),
    workflow_run_id: optionalTrimmed(form.workflowRunId),
    summary_artifact_ref: optionalTrimmed(form.artifactRef),
    summary_content_hash: optionalTrimmed(form.contentHash),
    requested_by: form.requestedBy.trim(),
    source_refs: [],
  };
}

function optionalTrimmed(value: string): string | undefined {
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function formatReviewActionTarget(value: string): string {
  return value.replaceAll("_", " ").toLowerCase();
}
