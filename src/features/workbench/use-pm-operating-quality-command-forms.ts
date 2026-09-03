"use client";

import { useState, type Dispatch, type SetStateAction } from "react";
import {
  type PmQualityReviewActionForm,
  type PmQualitySummaryInvocationForm,
} from "@/features/workbench/pm-operating-quality-actions";
import {
  buildReviewActionPreviewKey,
  buildReviewActionRef,
  buildSummaryInvocationPreviewKey,
  buildSummaryInvocationRef,
  resolveReviewActionReadiness,
  resolveReviewActionTarget,
  resolveReviewTargetType,
  resolveSummaryInvocationReadiness,
  resolveSummaryInvocationTarget,
} from "@/features/workbench/pm-operating-quality-command-model";
import type {
  PmOperatingQualitySelection,
  PmOperatingQualityPanelModel,
} from "@/features/workbench/pm-operating-quality-view-model";

/**
 * The two persisted-command forms of the PM operating-quality workflow (#989). The
 * supervisor edits free fields; identity fields follow the governed selection, and the
 * preview keys derived here are what fence previewed evidence to the exact form that
 * produced it.
 */
export function usePmOperatingQualityCommandForms(
  model: PmOperatingQualityPanelModel,
  selection: PmOperatingQualitySelection,
): {
  reviewActionForm: PmQualityReviewActionForm;
  setReviewActionFormState: Dispatch<SetStateAction<PmQualityReviewActionForm>>;
  summaryInvocationForm: PmQualitySummaryInvocationForm;
  setSummaryInvocationFormState: Dispatch<SetStateAction<PmQualitySummaryInvocationForm>>;
  reviewActionReadiness: { state: string; detail: string };
  summaryInvocationReadiness: { state: string; detail: string };
  currentReviewActionPreviewKey: string;
  currentSummaryInvocationPreviewKey: string;
} {
  const defaultReviewTarget = resolveReviewActionTarget(model);
  const [reviewActionFormState, setReviewActionFormState] =
    useState<PmQualityReviewActionForm>(() => ({
      actorId: "workbench-pm-operating-quality-supervisor",
      targetType: defaultReviewTarget.targetType,
      targetId: defaultReviewTarget.targetId,
      actionType: "REQUEST_EVIDENCE_REMEDIATION",
      actionState: "REVIEW_REQUIRED",
      reviewActionRef: defaultReviewTarget.reviewActionRef,
      boundedRationale:
        "Record bounded supervisory review for Manage-owned PM operating quality evidence.",
    }));
  const reviewTargetType = resolveReviewTargetType(reviewActionFormState.targetType, model);
  const reviewTargetId =
    reviewTargetType === "FAIRNESS_ANALYSIS"
      ? selection.fairnessAnalysisId ?? ""
      : selection.scoreRunId ?? "";
  const reviewActionForm: PmQualityReviewActionForm = {
    ...reviewActionFormState,
    targetType: reviewTargetType,
    targetId: reviewTargetId,
    reviewActionRef: buildReviewActionRef(
      reviewTargetId,
      reviewActionFormState.reviewActionRef,
    ),
  };
  if (
    reviewActionFormState.targetType !== reviewActionForm.targetType ||
    reviewActionFormState.targetId !== reviewActionForm.targetId
  ) {
    setReviewActionFormState(reviewActionForm);
  }
  const defaultSummaryInvocationTarget = resolveSummaryInvocationTarget(model);
  const [summaryInvocationFormState, setSummaryInvocationFormState] =
    useState<PmQualitySummaryInvocationForm>(() => ({
      requestedBy: "workbench-pm-operating-quality-supervisor",
      summaryRef: defaultSummaryInvocationTarget.summaryRef,
      scoreRunId: defaultSummaryInvocationTarget.scoreRunId,
      reviewActionId: defaultSummaryInvocationTarget.reviewActionId,
      invocationState: "PENDING_REVIEW",
      workflowPackName: "pm-operating-quality-summary",
      workflowPackVersion: model.policyVersion !== "N/A" ? model.policyVersion : "",
      workflowRunId: "",
      artifactRef: "",
      contentHash: "",
    }));
  const summaryInvocationForm: PmQualitySummaryInvocationForm = {
    ...summaryInvocationFormState,
    scoreRunId: selection.scoreRunId ?? "",
    reviewActionId: selection.reviewActionId ?? "",
    summaryRef: buildSummaryInvocationRef(
      selection.scoreRunId ?? "",
      summaryInvocationFormState.summaryRef,
    ),
  };
  if (
    summaryInvocationFormState.scoreRunId !== summaryInvocationForm.scoreRunId ||
    summaryInvocationFormState.reviewActionId !== summaryInvocationForm.reviewActionId
  ) {
    setSummaryInvocationFormState(summaryInvocationForm);
  }
  return {
    reviewActionForm,
    setReviewActionFormState,
    summaryInvocationForm,
    setSummaryInvocationFormState,
    reviewActionReadiness: resolveReviewActionReadiness({
      form: reviewActionForm,
      policyId: model.policyId,
      policyVersion: model.policyVersion,
      blockedActions: model.blockedActions,
    }),
    summaryInvocationReadiness: resolveSummaryInvocationReadiness({
      form: summaryInvocationForm,
      policyId: model.policyId,
      policyVersion: model.policyVersion,
      blockedActions: model.blockedActions,
    }),
    currentReviewActionPreviewKey: buildReviewActionPreviewKey(reviewActionForm),
    currentSummaryInvocationPreviewKey: buildSummaryInvocationPreviewKey(summaryInvocationForm),
  };
}
