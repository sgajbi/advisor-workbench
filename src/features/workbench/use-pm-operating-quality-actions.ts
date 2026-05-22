"use client";

import { useState } from "react";
import {
  buildDpmPmOperatingQualitySummaryInvocationCorrelationId,
  buildDpmPmOperatingQualityReviewActionCorrelationId,
  createDpmPmOperatingQualityFairnessAnalysis,
  createDpmPmOperatingQualityReviewAction,
  createDpmPmOperatingQualitySummaryInvocation,
  getDpmPmOperatingQualityFairnessAnalysis,
  getDpmPmOperatingQualityReviewAction,
  getDpmPmOperatingQualitySummaryInvocation,
  previewDpmPmOperatingQualityFairnessAnalysis,
  previewDpmPmOperatingQualityReviewAction,
  previewDpmPmOperatingQualityScoreRun,
  previewDpmPmOperatingQualitySummaryInvocation,
  requestDpmPmOperatingQualitySummary,
  type DpmPmOperatingQualityReviewActionRequest,
  type DpmPmOperatingQualitySummaryInvocationRequest,
} from "@/features/workbench/pm-operating-quality-api";
import {
  buildPmQualityActionError,
  buildPmQualityBlockedActionError,
  buildPmQualityFairnessCreateEvidence,
  buildPmQualityReviewActionEvidence,
  buildPmQualitySummaryInvocationEvidence,
  readPmQualityFairnessAnalysisId,
  readPmQualityReviewActionId,
  readPmQualitySummaryInvocationId,
  type PmQualityActionError,
  type PmQualityFairnessCreateEvidence,
  type PmQualityReviewActionEvidence,
  type PmQualityReviewActionForm,
  type PmQualitySummaryInvocationEvidence,
  type PmQualitySummaryInvocationForm,
} from "@/features/workbench/pm-operating-quality-actions";
import {
  buildPmOperatingQualityPanelModel,
  type PmOperatingQualityPanelModel,
} from "@/features/workbench/pm-operating-quality-view-model";
import type {
  DpmPmOperatingQualityGatewayResponse,
  DpmPmOperatingQualitySummaryResponse,
} from "@/features/workbench/types";

type UsePmOperatingQualityActionsInput = {
  policies: DpmPmOperatingQualityGatewayResponse | null;
  scoreRuns: DpmPmOperatingQualityGatewayResponse | null;
  fairnessAnalyses?: DpmPmOperatingQualityGatewayResponse | null;
  fairnessAnalysisDetail?: DpmPmOperatingQualityGatewayResponse | null;
  reviewActions?: DpmPmOperatingQualityGatewayResponse | null;
  reviewActionDetail?: DpmPmOperatingQualityGatewayResponse | null;
  summaryInvocations?: DpmPmOperatingQualityGatewayResponse | null;
  summaryInvocationDetail?: DpmPmOperatingQualityGatewayResponse | null;
};

type UsePmOperatingQualityActionsResult = {
  model: PmOperatingQualityPanelModel;
  pendingAction: boolean;
  pendingFairnessAction: boolean;
  pendingFairnessCreateAction: boolean;
  pendingSummaryAction: boolean;
  pendingReviewActionPreview: boolean;
  pendingReviewActionCreate: boolean;
  pendingSummaryInvocationPreview: boolean;
  pendingSummaryInvocationCreate: boolean;
  actionError: PmQualityActionError | null;
  actionMessage: string | null;
  fairnessCreateEvidence: PmQualityFairnessCreateEvidence | null;
  reviewActionCreateEvidence: PmQualityReviewActionEvidence | null;
  summaryInvocationCreateEvidence: PmQualitySummaryInvocationEvidence | null;
  reviewActionForm: PmQualityReviewActionForm;
  summaryInvocationForm: PmQualitySummaryInvocationForm;
  reviewActionReadiness: { state: string; detail: string };
  summaryInvocationReadiness: { state: string; detail: string };
  reviewActionPreviewReady: boolean;
  summaryInvocationPreviewReady: boolean;
  setReviewActionFormValue: (field: keyof PmQualityReviewActionForm, value: string) => void;
  setSummaryInvocationFormValue: (
    field: keyof PmQualitySummaryInvocationForm,
    value: string
  ) => void;
  previewScoreRun: () => Promise<void>;
  previewFairnessAnalysis: () => Promise<void>;
  createFairnessAnalysis: () => Promise<void>;
  requestSupportSummary: () => Promise<void>;
  previewReviewAction: () => Promise<void>;
  createReviewAction: () => Promise<void>;
  previewSummaryInvocation: () => Promise<void>;
  createSummaryInvocation: () => Promise<void>;
};

export function usePmOperatingQualityActions({
  policies,
  scoreRuns,
  fairnessAnalyses = null,
  fairnessAnalysisDetail = null,
  reviewActions = null,
  reviewActionDetail = null,
  summaryInvocations = null,
  summaryInvocationDetail = null,
}: UsePmOperatingQualityActionsInput): UsePmOperatingQualityActionsResult {
  const [previewResponse, setPreviewResponse] =
    useState<DpmPmOperatingQualityGatewayResponse | null>(null);
  const [fairnessPreviewResponse, setFairnessPreviewResponse] =
    useState<DpmPmOperatingQualityGatewayResponse | null>(null);
  const [createdFairnessAnalysisResponse, setCreatedFairnessAnalysisResponse] =
    useState<DpmPmOperatingQualityGatewayResponse | null>(null);
  const [reviewActionPreviewResponse, setReviewActionPreviewResponse] =
    useState<DpmPmOperatingQualityGatewayResponse | null>(null);
  const [createdReviewActionResponse, setCreatedReviewActionResponse] =
    useState<DpmPmOperatingQualityGatewayResponse | null>(null);
  const [summaryInvocationPreviewResponse, setSummaryInvocationPreviewResponse] =
    useState<DpmPmOperatingQualityGatewayResponse | null>(null);
  const [createdSummaryInvocationResponse, setCreatedSummaryInvocationResponse] =
    useState<DpmPmOperatingQualityGatewayResponse | null>(null);
  const [fairnessCreateEvidence, setFairnessCreateEvidence] =
    useState<PmQualityFairnessCreateEvidence | null>(null);
  const [reviewActionCreateEvidence, setReviewActionCreateEvidence] =
    useState<PmQualityReviewActionEvidence | null>(null);
  const [summaryInvocationCreateEvidence, setSummaryInvocationCreateEvidence] =
    useState<PmQualitySummaryInvocationEvidence | null>(null);
  const [summaryResponse, setSummaryResponse] =
    useState<DpmPmOperatingQualitySummaryResponse | null>(null);
  const [pendingAction, setPendingAction] = useState(false);
  const [pendingFairnessAction, setPendingFairnessAction] = useState(false);
  const [pendingFairnessCreateAction, setPendingFairnessCreateAction] = useState(false);
  const [pendingSummaryAction, setPendingSummaryAction] = useState(false);
  const [pendingReviewActionPreview, setPendingReviewActionPreview] = useState(false);
  const [pendingReviewActionCreate, setPendingReviewActionCreate] = useState(false);
  const [pendingSummaryInvocationPreview, setPendingSummaryInvocationPreview] = useState(false);
  const [pendingSummaryInvocationCreate, setPendingSummaryInvocationCreate] = useState(false);
  const [actionError, setActionError] = useState<PmQualityActionError | null>(null);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const model = buildPmOperatingQualityPanelModel({
    policies,
    scoreRuns,
    fairnessAnalyses,
    fairnessAnalysisDetail: createdFairnessAnalysisResponse ?? fairnessAnalysisDetail,
    reviewActions,
    reviewActionDetail: createdReviewActionResponse ?? reviewActionPreviewResponse ?? reviewActionDetail,
    summaryInvocations,
    summaryInvocationDetail:
      createdSummaryInvocationResponse ??
      summaryInvocationPreviewResponse ??
      summaryInvocationDetail,
    preview: previewResponse,
    fairnessPreview: fairnessPreviewResponse,
    summary: summaryResponse,
  });
  const defaultReviewTarget = resolveReviewActionTarget(model);
  const [reviewActionForm, setReviewActionForm] = useState<PmQualityReviewActionForm>(() => ({
    actorId: "workbench-pm-operating-quality-supervisor",
    targetType: defaultReviewTarget.targetType,
    targetId: defaultReviewTarget.targetId,
    actionType: "REQUEST_EVIDENCE_REMEDIATION",
    actionState: "REVIEW_REQUIRED",
    reviewActionRef: defaultReviewTarget.reviewActionRef,
    boundedRationale:
      "Record bounded supervisory review for Manage-owned PM operating quality evidence.",
  }));
  const reviewActionReadiness = resolveReviewActionReadiness({
    form: reviewActionForm,
    policyId: model.policyId,
    policyVersion: model.policyVersion,
    blockedActions: model.blockedActions,
  });
  const reviewActionPreviewReady = Boolean(reviewActionPreviewResponse);
  const defaultSummaryInvocationTarget = resolveSummaryInvocationTarget(model);
  const [summaryInvocationForm, setSummaryInvocationForm] =
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
  const summaryInvocationReadiness = resolveSummaryInvocationReadiness({
    form: summaryInvocationForm,
    policyId: model.policyId,
    policyVersion: model.policyVersion,
    blockedActions: model.blockedActions,
  });
  const summaryInvocationPreviewReady = Boolean(summaryInvocationPreviewResponse);

  function setReviewActionFormValue(field: keyof PmQualityReviewActionForm, value: string) {
    setReviewActionForm((current) => ({ ...current, [field]: value }));
    setReviewActionPreviewResponse(null);
    setCreatedReviewActionResponse(null);
    setReviewActionCreateEvidence(null);
  }

  function setSummaryInvocationFormValue(
    field: keyof PmQualitySummaryInvocationForm,
    value: string
  ) {
    setSummaryInvocationForm((current) => ({ ...current, [field]: value }));
    setSummaryInvocationPreviewResponse(null);
    setCreatedSummaryInvocationResponse(null);
    setSummaryInvocationCreateEvidence(null);
  }

  async function previewScoreRun() {
    if (pendingAction) {
      return;
    }
    if (model.scoreRunPreviewReadinessState !== "READY") {
      setActionError(buildPmQualityBlockedActionError(model.scoreRunPreviewReadiness));
      return;
    }
    setPendingAction(true);
    setActionError(null);
    setActionMessage(null);
    try {
      const response = await previewDpmPmOperatingQualityScoreRun({
        policyId: model.policyId !== "N/A" ? model.policyId : undefined,
        policyVersion: model.policyVersion !== "N/A" ? model.policyVersion : undefined,
      });
      setPreviewResponse(response);
      setActionMessage("Preview returned Manage operating-quality evidence.");
    } catch (error) {
      setActionError(buildPmQualityActionError(error, "PM operating quality preview failed"));
    } finally {
      setPendingAction(false);
    }
  }

  async function previewFairnessAnalysis() {
    if (pendingFairnessAction) {
      return;
    }
    if (model.fairnessPreviewReadinessState !== "READY") {
      setActionError(buildPmQualityBlockedActionError(model.fairnessPreviewReadiness));
      return;
    }
    if (model.policyId === "N/A" || model.policyVersion === "N/A") {
      setActionError(
        buildPmQualityBlockedActionError(
          "PM operating quality policy id/version is required for fairness preview."
        )
      );
      return;
    }
    setPendingFairnessAction(true);
    setActionError(null);
    setActionMessage(null);
    try {
      const response = await previewDpmPmOperatingQualityFairnessAnalysis({
        policyId: model.policyId,
        policyVersion: model.policyVersion,
        asOfDate: model.fairnessAsOfDate !== "N/A" ? model.fairnessAsOfDate : undefined,
        segments: model.fairnessSegmentRequests,
      });
      setFairnessPreviewResponse(response);
      setActionMessage("Fairness preview returned Manage segment evidence.");
    } catch (error) {
      setActionError(
        buildPmQualityActionError(error, "PM operating quality fairness preview failed")
      );
    } finally {
      setPendingFairnessAction(false);
    }
  }

  async function createFairnessAnalysis() {
    if (pendingFairnessCreateAction) {
      return;
    }
    if (model.fairnessPreviewReadinessState !== "READY") {
      setActionError(buildPmQualityBlockedActionError(model.fairnessPreviewReadiness));
      return;
    }
    if (model.policyId === "N/A" || model.policyVersion === "N/A") {
      setActionError(
        buildPmQualityBlockedActionError(
          "PM operating quality policy id/version is required for fairness analysis persistence."
        )
      );
      return;
    }
    setPendingFairnessCreateAction(true);
    setActionError(null);
    setActionMessage(null);
    try {
      const response = await createDpmPmOperatingQualityFairnessAnalysis({
        policyId: model.policyId,
        policyVersion: model.policyVersion,
        asOfDate: model.fairnessAsOfDate !== "N/A" ? model.fairnessAsOfDate : undefined,
        segments: model.fairnessSegmentRequests,
      });
      setCreatedFairnessAnalysisResponse(response);
      setFairnessCreateEvidence(buildPmQualityFairnessCreateEvidence(response));
      const fairnessAnalysisId = readPmQualityFairnessAnalysisId(response);
      if (fairnessAnalysisId) {
        const detail = await getDpmPmOperatingQualityFairnessAnalysis(
          fairnessAnalysisId,
          "client"
        );
        setCreatedFairnessAnalysisResponse(detail);
      }
      setActionMessage("Persisted fairness analysis returned Manage evidence.");
    } catch (error) {
      setActionError(
        buildPmQualityActionError(
          error,
          "PM operating quality fairness analysis persistence failed"
        )
      );
    } finally {
      setPendingFairnessCreateAction(false);
    }
  }

  async function requestSupportSummary() {
    if (pendingSummaryAction) {
      return;
    }
    if (model.summaryRequestReadinessState !== "READY" || !model.selectedScoreRun) {
      setActionError(buildPmQualityBlockedActionError(model.summaryRequestReadiness));
      return;
    }
    setPendingSummaryAction(true);
    setActionError(null);
    setActionMessage(null);
    try {
      const response = await requestDpmPmOperatingQualitySummary({
        scoreRunId: model.selectedScoreRun.scoreRunId,
      });
      setSummaryResponse(response);
      setActionMessage("Support summary returned review-required PM quality evidence.");
    } catch (error) {
      setActionError(
        buildPmQualityActionError(error, "PM operating quality support summary request failed")
      );
    } finally {
      setPendingSummaryAction(false);
    }
  }

  async function previewReviewAction() {
    if (pendingReviewActionPreview) {
      return;
    }
    if (reviewActionReadiness.state !== "READY") {
      setActionError(buildPmQualityBlockedActionError(reviewActionReadiness.detail));
      return;
    }
    setPendingReviewActionPreview(true);
    setActionError(null);
    setActionMessage(null);
    setReviewActionPreviewResponse(null);
    setCreatedReviewActionResponse(null);
    setReviewActionCreateEvidence(null);
    try {
      const correlationId = buildDpmPmOperatingQualityReviewActionCorrelationId();
      const response = await previewDpmPmOperatingQualityReviewAction({
        request: buildReviewActionRequest(reviewActionForm, model),
        actorId: reviewActionForm.actorId,
        correlationId,
      });
      setReviewActionPreviewResponse(response);
      setActionMessage("Review-action preview returned Manage supervisory evidence.");
    } catch (error) {
      setActionError(
        buildPmQualityActionError(error, "PM operating quality review-action preview failed")
      );
    } finally {
      setPendingReviewActionPreview(false);
    }
  }

  async function createReviewAction() {
    if (pendingReviewActionCreate) {
      return;
    }
    if (!reviewActionPreviewResponse) {
      setActionError(
        buildPmQualityBlockedActionError(
          "Preview the supervisory review action before recording it."
        )
      );
      return;
    }
    if (reviewActionReadiness.state !== "READY") {
      setActionError(buildPmQualityBlockedActionError(reviewActionReadiness.detail));
      return;
    }
    setPendingReviewActionCreate(true);
    setActionError(null);
    setActionMessage(null);
    try {
      const correlationId = buildDpmPmOperatingQualityReviewActionCorrelationId();
      const response = await createDpmPmOperatingQualityReviewAction({
        request: buildReviewActionRequest(reviewActionForm, model),
        actorId: reviewActionForm.actorId,
        correlationId,
      });
      setCreatedReviewActionResponse(response);
      setReviewActionCreateEvidence(buildPmQualityReviewActionEvidence(response));
      const reviewActionId = readPmQualityReviewActionId(response);
      if (reviewActionId) {
        const detail = await getDpmPmOperatingQualityReviewAction(reviewActionId, "client");
        setCreatedReviewActionResponse(detail);
        setSummaryInvocationForm((current) => ({
          ...current,
          reviewActionId: current.reviewActionId || reviewActionId,
        }));
      }
      setActionMessage("Recorded Manage-owned supervisory review action.");
    } catch (error) {
      setActionError(
        buildPmQualityActionError(error, "PM operating quality review-action create failed")
      );
    } finally {
      setPendingReviewActionCreate(false);
    }
  }

  async function previewSummaryInvocation() {
    if (pendingSummaryInvocationPreview) {
      return;
    }
    if (summaryInvocationReadiness.state !== "READY") {
      setActionError(buildPmQualityBlockedActionError(summaryInvocationReadiness.detail));
      return;
    }
    setPendingSummaryInvocationPreview(true);
    setActionError(null);
    setActionMessage(null);
    setSummaryInvocationPreviewResponse(null);
    setCreatedSummaryInvocationResponse(null);
    setSummaryInvocationCreateEvidence(null);
    try {
      const correlationId = buildDpmPmOperatingQualitySummaryInvocationCorrelationId();
      const response = await previewDpmPmOperatingQualitySummaryInvocation({
        request: buildSummaryInvocationRequest(summaryInvocationForm),
        actorId: summaryInvocationForm.requestedBy,
        correlationId,
      });
      setSummaryInvocationPreviewResponse(response);
      setActionMessage("Summary-invocation preview returned Manage evidence.");
    } catch (error) {
      setActionError(
        buildPmQualityActionError(error, "PM operating quality summary-invocation preview failed")
      );
    } finally {
      setPendingSummaryInvocationPreview(false);
    }
  }

  async function createSummaryInvocation() {
    if (pendingSummaryInvocationCreate) {
      return;
    }
    if (!summaryInvocationPreviewResponse) {
      setActionError(
        buildPmQualityBlockedActionError(
          "Preview the PM quality summary invocation before recording it."
        )
      );
      return;
    }
    if (summaryInvocationReadiness.state !== "READY") {
      setActionError(buildPmQualityBlockedActionError(summaryInvocationReadiness.detail));
      return;
    }
    setPendingSummaryInvocationCreate(true);
    setActionError(null);
    setActionMessage(null);
    try {
      const correlationId = buildDpmPmOperatingQualitySummaryInvocationCorrelationId();
      const response = await createDpmPmOperatingQualitySummaryInvocation({
        request: buildSummaryInvocationRequest(summaryInvocationForm),
        actorId: summaryInvocationForm.requestedBy,
        correlationId,
      });
      setCreatedSummaryInvocationResponse(response);
      setSummaryInvocationCreateEvidence(buildPmQualitySummaryInvocationEvidence(response));
      const summaryInvocationId = readPmQualitySummaryInvocationId(response);
      if (summaryInvocationId) {
        const detail = await getDpmPmOperatingQualitySummaryInvocation(
          summaryInvocationId,
          "client"
        );
        setCreatedSummaryInvocationResponse(detail);
      }
      setActionMessage("Recorded Manage-owned PM quality summary invocation.");
    } catch (error) {
      setActionError(
        buildPmQualityActionError(error, "PM operating quality summary-invocation create failed")
      );
    } finally {
      setPendingSummaryInvocationCreate(false);
    }
  }

  return {
    model,
    pendingAction,
    pendingFairnessAction,
    pendingFairnessCreateAction,
    pendingSummaryAction,
    pendingReviewActionPreview,
    pendingReviewActionCreate,
    pendingSummaryInvocationPreview,
    pendingSummaryInvocationCreate,
    actionError,
    actionMessage,
    fairnessCreateEvidence,
    reviewActionCreateEvidence,
    summaryInvocationCreateEvidence,
    reviewActionForm,
    summaryInvocationForm,
    reviewActionReadiness,
    summaryInvocationReadiness,
    reviewActionPreviewReady,
    summaryInvocationPreviewReady,
    setReviewActionFormValue,
    setSummaryInvocationFormValue,
    previewScoreRun,
    previewFairnessAnalysis,
    createFairnessAnalysis,
    requestSupportSummary,
    previewReviewAction,
    createReviewAction,
    previewSummaryInvocation,
    createSummaryInvocation,
  };
}

function resolveReviewActionTarget(model: PmOperatingQualityPanelModel): {
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

function resolveSummaryInvocationTarget(model: PmOperatingQualityPanelModel): {
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

function resolveReviewActionReadiness(params: {
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

function resolveSummaryInvocationReadiness(params: {
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

function buildReviewActionRequest(
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
  if (form.targetType === "FAIRNESS_ANALYSIS" && model.selectedFairnessAnalysis?.asOfDate) {
    return model.selectedFairnessAnalysis.asOfDate;
  }
  if (form.targetType === "SCORE_RUN" && model.selectedScoreRun?.asOfDate) {
    return model.selectedScoreRun.asOfDate;
  }
  return undefined;
}

function buildSummaryInvocationRequest(
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
