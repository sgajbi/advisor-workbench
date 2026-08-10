"use client";

import { useEffect, useRef, useState } from "react";
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
  type PmQualityCommandOption,
  type PmQualityFairnessCreateEvidence,
  type PmQualityReviewActionEvidence,
  type PmQualityReviewActionForm,
  type PmQualityReviewTargetOption,
  type PmQualitySummaryInvocationEvidence,
  type PmQualitySummaryInvocationForm,
} from "@/features/workbench/pm-operating-quality-actions";
import {
  buildPmOperatingQualitySelectionKey,
  buildReviewActionPreviewKey,
  buildReviewActionRef,
  buildReviewActionRequest,
  buildReviewActionTargetOptions,
  buildSummaryInvocationPreviewKey,
  buildSummaryInvocationRef,
  buildSummaryInvocationRequest,
  buildSummaryInvocationReviewActionOptions,
  buildSummaryInvocationScoreRunOptions,
  pmOperatingQualitySelectionEquals,
  readPmOperatingQualitySelection,
  resolveReviewActionReadiness,
  resolveReviewActionTarget,
  resolveReviewTargetType,
  resolveSummaryInvocationReadiness,
  resolveSummaryInvocationTarget,
} from "@/features/workbench/pm-operating-quality-command-model";
import {
  buildPmOperatingQualityPanelModel,
  hasPmOperatingQualityFairnessAnalysis,
  hasPmOperatingQualityReviewAction,
  matchesPmOperatingQualitySummaryScoreRun,
  type PmOperatingQualitySelection,
  type PmOperatingQualityPanelModel,
} from "@/features/workbench/pm-operating-quality-view-model";
import {
  buildDpmAiWorkflowOutcome,
  type DpmAiWorkflowOutcome,
} from "@/features/workbench/dpm-ai-workflow-disclosure";
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
  selection: PmOperatingQualitySelection;
  pendingFairnessDetail: boolean;
  pendingReviewActionDetail: boolean;
  pendingAction: boolean;
  pendingFairnessAction: boolean;
  pendingFairnessCreateAction: boolean;
  pendingSummaryAction: boolean;
  pendingReviewActionPreview: boolean;
  pendingReviewActionCreate: boolean;
  pendingSummaryInvocationPreview: boolean;
  pendingSummaryInvocationCreate: boolean;
  selectionLocked: boolean;
  actionError: PmQualityActionError | null;
  actionMessage: string | null;
  summaryOutcome: DpmAiWorkflowOutcome | null;
  fairnessCreateEvidence: PmQualityFairnessCreateEvidence | null;
  reviewActionCreateEvidence: PmQualityReviewActionEvidence | null;
  summaryInvocationCreateEvidence: PmQualitySummaryInvocationEvidence | null;
  reviewActionForm: PmQualityReviewActionForm;
  summaryInvocationForm: PmQualitySummaryInvocationForm;
  reviewActionTargetOptions: PmQualityReviewTargetOption[];
  summaryInvocationScoreRunOptions: PmQualityCommandOption[];
  summaryInvocationReviewActionOptions: PmQualityCommandOption[];
  reviewActionReadiness: { state: string; detail: string };
  summaryInvocationReadiness: { state: string; detail: string };
  reviewActionPreviewReady: boolean;
  summaryInvocationPreviewReady: boolean;
  setReviewActionFormValue: (field: keyof PmQualityReviewActionForm, value: string) => void;
  setSummaryInvocationFormValue: (
    field: keyof PmQualitySummaryInvocationForm,
    value: string
  ) => void;
  selectScoreRun: (scoreRunId: string) => void;
  selectFairnessAnalysis: (fairnessAnalysisId: string) => Promise<void>;
  selectReviewAction: (reviewActionId: string) => Promise<void>;
  previewScoreRun: () => Promise<void>;
  previewFairnessAnalysis: () => Promise<void>;
  createFairnessAnalysis: () => Promise<void>;
  requestSupportSummary: () => Promise<void>;
  previewReviewAction: () => Promise<void>;
  createReviewAction: () => Promise<void>;
  previewSummaryInvocation: () => Promise<void>;
  createSummaryInvocation: () => Promise<void>;
};

type PmQualitySummaryState = {
  scoreRunId: string;
  pending: boolean;
  response: DpmPmOperatingQualitySummaryResponse | null;
  outcome: DpmAiWorkflowOutcome | null;
  error: PmQualityActionError | null;
};

type PmQualitySelectedDetailState = {
  recordId: string;
  pending: boolean;
  response: DpmPmOperatingQualityGatewayResponse | null;
};

function retainGatewayResponseBySourceId(
  current: DpmPmOperatingQualityGatewayResponse[],
  response: DpmPmOperatingQualityGatewayResponse,
  readSourceId: (candidate: DpmPmOperatingQualityGatewayResponse) => string | null,
): DpmPmOperatingQualityGatewayResponse[] {
  const sourceId = readSourceId(response);
  if (!sourceId) {
    return current;
  }
  return [
    ...current.filter((candidate) => {
      const candidateId = readSourceId(candidate);
      return Boolean(candidateId && candidateId !== sourceId);
    }),
    response,
  ];
}

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
  const [retainedFairnessAnalysisResponses, setRetainedFairnessAnalysisResponses] =
    useState<DpmPmOperatingQualityGatewayResponse[]>([]);
  const [fairnessRetentionSourceKey, setFairnessRetentionSourceKey] = useState(
    fairnessAnalyses?.correlation_id ?? null,
  );
  const [reviewActionPreviewResponse, setReviewActionPreviewResponse] =
    useState<DpmPmOperatingQualityGatewayResponse | null>(null);
  const [reviewActionPreviewKey, setReviewActionPreviewKey] = useState<string | null>(null);
  const [retainedReviewActionResponses, setRetainedReviewActionResponses] =
    useState<DpmPmOperatingQualityGatewayResponse[]>([]);
  const [reviewActionRetentionSourceKey, setReviewActionRetentionSourceKey] = useState(
    reviewActions?.correlation_id ?? null,
  );
  const [summaryInvocationPreviewResponse, setSummaryInvocationPreviewResponse] =
    useState<DpmPmOperatingQualityGatewayResponse | null>(null);
  const [summaryInvocationPreviewKey, setSummaryInvocationPreviewKey] =
    useState<string | null>(null);
  const [createdSummaryInvocationResponse, setCreatedSummaryInvocationResponse] =
    useState<DpmPmOperatingQualityGatewayResponse | null>(null);
  const [fairnessCreateEvidence, setFairnessCreateEvidence] =
    useState<PmQualityFairnessCreateEvidence | null>(null);
  const [reviewActionCreateEvidence, setReviewActionCreateEvidence] =
    useState<PmQualityReviewActionEvidence | null>(null);
  const [summaryInvocationCreateEvidence, setSummaryInvocationCreateEvidence] =
    useState<PmQualitySummaryInvocationEvidence | null>(null);
  const [summaryState, setSummaryState] =
    useState<PmQualitySummaryState | null>(null);
  const [selectionPreference, setSelectionPreference] = useState<PmOperatingQualitySelection>({
    scoreRunId: null,
    fairnessAnalysisId: null,
    reviewActionId: null,
  });
  const [selectedFairnessDetail, setSelectedFairnessDetail] =
    useState<PmQualitySelectedDetailState | null>(null);
  const [selectedReviewActionDetail, setSelectedReviewActionDetail] =
    useState<PmQualitySelectedDetailState | null>(null);
  const summaryRequestSequenceRef = useRef(0);
  const fairnessDetailSequenceRef = useRef(0);
  const reviewActionDetailSequenceRef = useRef(0);
  const persistedActionPendingRef = useRef(false);
  const [pendingAction, setPendingAction] = useState(false);
  const [pendingFairnessAction, setPendingFairnessAction] = useState(false);
  const [pendingFairnessCreateAction, setPendingFairnessCreateAction] = useState(false);
  const [pendingReviewActionPreview, setPendingReviewActionPreview] = useState(false);
  const [pendingReviewActionCreate, setPendingReviewActionCreate] = useState(false);
  const [pendingSummaryInvocationPreview, setPendingSummaryInvocationPreview] = useState(false);
  const [pendingSummaryInvocationCreate, setPendingSummaryInvocationCreate] = useState(false);
  const [actionError, setActionError] = useState<PmQualityActionError | null>(null);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const selectedFairnessDetailResponse =
    selectedFairnessDetail?.recordId === selectionPreference.fairnessAnalysisId
      ? selectedFairnessDetail.response
      : null;
  const selectedReviewActionDetailResponse =
    selectedReviewActionDetail?.recordId === selectionPreference.reviewActionId
      ? selectedReviewActionDetail.response
      : null;
  const fairnessCanonicalSourceKey = fairnessAnalyses?.correlation_id ?? null;
  if (fairnessRetentionSourceKey !== fairnessCanonicalSourceKey) {
    setFairnessRetentionSourceKey(fairnessCanonicalSourceKey);
    setRetainedFairnessAnalysisResponses((current) =>
      current.filter((response) => {
        const fairnessAnalysisId = readPmQualityFairnessAnalysisId(response);
        return Boolean(
          fairnessAnalysisId &&
            !hasPmOperatingQualityFairnessAnalysis(fairnessAnalyses, fairnessAnalysisId),
        );
      }),
    );
  }
  const reviewActionCanonicalSourceKey = reviewActions?.correlation_id ?? null;
  if (reviewActionRetentionSourceKey !== reviewActionCanonicalSourceKey) {
    setReviewActionRetentionSourceKey(reviewActionCanonicalSourceKey);
    setRetainedReviewActionResponses((current) =>
      current.filter((response) => {
        const reviewActionId = readPmQualityReviewActionId(response);
        return Boolean(
          reviewActionId &&
            !hasPmOperatingQualityReviewAction(reviewActions, reviewActionId),
        );
      }),
    );
  }
  const sourceModel = buildPmOperatingQualityPanelModel({
    policies,
    scoreRuns,
    fairnessAnalyses,
    fairnessAnalysisDetails: [selectedFairnessDetailResponse, fairnessAnalysisDetail],
    retainedFairnessAnalyses: retainedFairnessAnalysisResponses,
    reviewActions,
    reviewActionDetails: [
      selectedReviewActionDetailResponse,
      reviewActionPreviewResponse,
      reviewActionDetail,
    ],
    retainedReviewActions: retainedReviewActionResponses,
    summaryInvocations,
    summaryInvocationDetail:
      createdSummaryInvocationResponse ??
      summaryInvocationPreviewResponse ??
    summaryInvocationDetail,
    preview: previewResponse,
    fairnessPreview: fairnessPreviewResponse,
    summary: null,
    selection: selectionPreference,
  });
  const currentSummaryState =
    summaryState?.scoreRunId === sourceModel.selectedScoreRun?.scoreRunId
      ? summaryState
      : null;
  const model = currentSummaryState?.response
    ? buildPmOperatingQualityPanelModel({
        policies,
        scoreRuns,
        fairnessAnalyses,
        fairnessAnalysisDetails: [selectedFairnessDetailResponse, fairnessAnalysisDetail],
        retainedFairnessAnalyses: retainedFairnessAnalysisResponses,
        reviewActions,
        reviewActionDetails: [
          selectedReviewActionDetailResponse,
          reviewActionPreviewResponse,
          reviewActionDetail,
        ],
        retainedReviewActions: retainedReviewActionResponses,
        summaryInvocations,
        summaryInvocationDetail:
          createdSummaryInvocationResponse ??
          summaryInvocationPreviewResponse ??
          summaryInvocationDetail,
        preview: previewResponse,
        fairnessPreview: fairnessPreviewResponse,
        summary: currentSummaryState.response,
        selection: selectionPreference,
      })
    : sourceModel;
  const selection = readPmOperatingQualitySelection(model);
  if (!pmOperatingQualitySelectionEquals(selectionPreference, selection)) {
    setSelectionPreference(selection);
  }
  const currentSelectionKey = buildPmOperatingQualitySelectionKey(selection);
  const currentSelectionKeyRef = useRef(currentSelectionKey);
  const currentSelectionRef = useRef(selection);
  useEffect(() => {
    currentSelectionKeyRef.current = currentSelectionKey;
    currentSelectionRef.current = selection;
  }, [currentSelectionKey, selection]);
  const pendingSummaryAction = currentSummaryState?.pending ?? false;
  const summaryOutcome = currentSummaryState?.outcome ?? null;
  const summaryActionError = currentSummaryState?.error ?? null;
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
  const reviewActionReadiness = resolveReviewActionReadiness({
    form: reviewActionForm,
    policyId: model.policyId,
    policyVersion: model.policyVersion,
    blockedActions: model.blockedActions,
  });
  const currentReviewActionPreviewKey = buildReviewActionPreviewKey(reviewActionForm);
  const reviewActionPreviewReady =
    Boolean(reviewActionPreviewResponse) &&
    reviewActionPreviewKey === currentReviewActionPreviewKey;
  const reviewActionTargetOptions = buildReviewActionTargetOptions(model);
  const summaryInvocationScoreRunOptions = buildSummaryInvocationScoreRunOptions(model);
  const summaryInvocationReviewActionOptions = buildSummaryInvocationReviewActionOptions(model);
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
  const summaryInvocationReadiness = resolveSummaryInvocationReadiness({
    form: summaryInvocationForm,
    policyId: model.policyId,
    policyVersion: model.policyVersion,
    blockedActions: model.blockedActions,
  });
  const currentSummaryInvocationPreviewKey =
    buildSummaryInvocationPreviewKey(summaryInvocationForm);
  const summaryInvocationPreviewReady =
    Boolean(summaryInvocationPreviewResponse) &&
    summaryInvocationPreviewKey === currentSummaryInvocationPreviewKey;

  function setReviewActionFormValue(field: keyof PmQualityReviewActionForm, value: string) {
    if (field === "targetId") {
      if (reviewActionForm.targetType === "FAIRNESS_ANALYSIS") {
        void selectFairnessAnalysis(value);
      } else {
        selectScoreRun(value);
      }
      return;
    }
    setReviewActionFormState((current) => {
      if (field === "targetType") {
        return {
          ...current,
          targetType: value,
        };
      }
      return { ...current, [field]: value };
    });
    setReviewActionPreviewResponse(null);
    setReviewActionPreviewKey(null);
    setReviewActionCreateEvidence(null);
  }

  function setSummaryInvocationFormValue(
    field: keyof PmQualitySummaryInvocationForm,
    value: string
  ) {
    if (field === "scoreRunId") {
      selectScoreRun(value);
      return;
    }
    if (field === "reviewActionId") {
      void selectReviewAction(value);
      return;
    }
    setSummaryInvocationFormState((current) => ({ ...current, [field]: value }));
    setSummaryInvocationPreviewResponse(null);
    setSummaryInvocationPreviewKey(null);
    setCreatedSummaryInvocationResponse(null);
    setSummaryInvocationCreateEvidence(null);
  }

  function selectScoreRun(scoreRunId: string) {
    if (
      !model.scoreRunRows.some((row) => row.scoreRunId === scoreRunId) ||
      selection.scoreRunId === scoreRunId
    ) {
      return;
    }
    beginRecordSelection({ ...selection, scoreRunId });
  }

  async function selectFairnessAnalysis(fairnessAnalysisId: string) {
    if (
      !model.fairnessAnalysisRows.some(
        (row) => row.fairnessAnalysisId === fairnessAnalysisId
      ) ||
      selection.fairnessAnalysisId === fairnessAnalysisId
    ) {
      return;
    }
    const nextSelection = { ...selection, fairnessAnalysisId };
    if (!beginRecordSelection(nextSelection)) return;
    const requestSequence = fairnessDetailSequenceRef.current + 1;
    fairnessDetailSequenceRef.current = requestSequence;
    setSelectedFairnessDetail({ recordId: fairnessAnalysisId, pending: true, response: null });
    try {
      const response = await getDpmPmOperatingQualityFairnessAnalysis(
        fairnessAnalysisId,
        "client",
      );
      if (
        requestSequence !== fairnessDetailSequenceRef.current ||
        currentSelectionRef.current.fairnessAnalysisId !== fairnessAnalysisId
      ) {
        return;
      }
      setSelectedFairnessDetail({
        recordId: fairnessAnalysisId,
        pending: false,
        response,
      });
    } catch (error) {
      if (
        requestSequence !== fairnessDetailSequenceRef.current ||
        currentSelectionRef.current.fairnessAnalysisId !== fairnessAnalysisId
      ) {
        return;
      }
      setSelectedFairnessDetail({ recordId: fairnessAnalysisId, pending: false, response: null });
      setActionError(
        buildPmQualityActionError(error, "PM operating quality fairness detail load failed"),
      );
    }
  }

  async function selectReviewAction(reviewActionId: string) {
    if (
      !model.reviewActionRows.some((row) => row.reviewActionId === reviewActionId) ||
      selection.reviewActionId === reviewActionId
    ) {
      return;
    }
    const nextSelection = { ...selection, reviewActionId };
    if (!beginRecordSelection(nextSelection)) return;
    const requestSequence = reviewActionDetailSequenceRef.current + 1;
    reviewActionDetailSequenceRef.current = requestSequence;
    setSelectedReviewActionDetail({ recordId: reviewActionId, pending: true, response: null });
    try {
      const response = await getDpmPmOperatingQualityReviewAction(reviewActionId, "client");
      if (
        requestSequence !== reviewActionDetailSequenceRef.current ||
        currentSelectionRef.current.reviewActionId !== reviewActionId
      ) {
        return;
      }
      setSelectedReviewActionDetail({
        recordId: reviewActionId,
        pending: false,
        response,
      });
    } catch (error) {
      if (
        requestSequence !== reviewActionDetailSequenceRef.current ||
        currentSelectionRef.current.reviewActionId !== reviewActionId
      ) {
        return;
      }
      setSelectedReviewActionDetail({ recordId: reviewActionId, pending: false, response: null });
      setActionError(
        buildPmQualityActionError(error, "PM operating quality review-action detail load failed"),
      );
    }
  }

  function beginRecordSelection(nextSelection: PmOperatingQualitySelection): boolean {
    if (persistedActionPendingRef.current) return false;
    const previousSelection = currentSelectionRef.current;
    setSelectionPreference(nextSelection);
    currentSelectionRef.current = nextSelection;
    currentSelectionKeyRef.current = buildPmOperatingQualitySelectionKey(nextSelection);
    if (previousSelection.scoreRunId !== nextSelection.scoreRunId) {
      summaryRequestSequenceRef.current += 1;
    }
    if (previousSelection.fairnessAnalysisId !== nextSelection.fairnessAnalysisId) {
      fairnessDetailSequenceRef.current += 1;
    }
    if (previousSelection.reviewActionId !== nextSelection.reviewActionId) {
      reviewActionDetailSequenceRef.current += 1;
    }
    setSummaryState(null);
    setActionError(null);
    setActionMessage(null);
    setReviewActionPreviewResponse(null);
    setReviewActionPreviewKey(null);
    setReviewActionCreateEvidence(null);
    setSummaryInvocationPreviewResponse(null);
    setSummaryInvocationPreviewKey(null);
    setSummaryInvocationCreateEvidence(null);
    setPendingAction(false);
    setPendingFairnessAction(false);
    setPendingReviewActionPreview(false);
    setPendingSummaryInvocationPreview(false);
    return true;
  }

  async function previewScoreRun() {
    if (pendingAction) {
      return;
    }
    if (model.scoreRunPreviewReadinessState !== "READY") {
      setActionError(buildPmQualityBlockedActionError(model.scoreRunPreviewReadiness));
      return;
    }
    const actionSelectionKey = currentSelectionKey;
    setPendingAction(true);
    setActionError(null);
    setActionMessage(null);
    try {
      const response = await previewDpmPmOperatingQualityScoreRun({
        policyId: model.policyId !== "N/A" ? model.policyId : undefined,
        policyVersion: model.policyVersion !== "N/A" ? model.policyVersion : undefined,
      });
      if (currentSelectionKeyRef.current !== actionSelectionKey) return;
      setPreviewResponse(response);
      setActionMessage("Preview returned Manage operating-quality evidence.");
    } catch (error) {
      if (currentSelectionKeyRef.current !== actionSelectionKey) return;
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
    const actionSelectionKey = currentSelectionKey;
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
      if (currentSelectionKeyRef.current !== actionSelectionKey) return;
      setFairnessPreviewResponse(response);
      setActionMessage("Fairness preview returned Manage segment evidence.");
    } catch (error) {
      if (currentSelectionKeyRef.current !== actionSelectionKey) return;
      setActionError(
        buildPmQualityActionError(error, "PM operating quality fairness preview failed")
      );
    } finally {
      setPendingFairnessAction(false);
    }
  }

  async function createFairnessAnalysis() {
    if (pendingFairnessCreateAction || persistedActionPendingRef.current) {
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
    persistedActionPendingRef.current = true;
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
      setRetainedFairnessAnalysisResponses((current) =>
        retainGatewayResponseBySourceId(
          current,
          response,
          readPmQualityFairnessAnalysisId,
        ),
      );
      setFairnessCreateEvidence(buildPmQualityFairnessCreateEvidence(response));
      const fairnessAnalysisId = readPmQualityFairnessAnalysisId(response);
      if (fairnessAnalysisId) {
        const detail = await getDpmPmOperatingQualityFairnessAnalysis(
          fairnessAnalysisId,
          "client"
        );
        const nextSelection = { ...currentSelectionRef.current, fairnessAnalysisId };
        setSelectionPreference(nextSelection);
        currentSelectionRef.current = nextSelection;
        currentSelectionKeyRef.current = buildPmOperatingQualitySelectionKey(nextSelection);
        setSelectedFairnessDetail({
          recordId: fairnessAnalysisId,
          pending: false,
          response: detail,
        });
        setRetainedFairnessAnalysisResponses((current) =>
          retainGatewayResponseBySourceId(
            current,
            detail,
            readPmQualityFairnessAnalysisId,
          ),
        );
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
      persistedActionPendingRef.current = false;
      setPendingFairnessCreateAction(false);
    }
  }

  async function requestSupportSummary() {
    if (model.summaryRequestReadinessState !== "READY" || !model.selectedScoreRun) {
      setActionError(buildPmQualityBlockedActionError(model.summaryRequestReadiness));
      return;
    }
    const scoreRunId = model.selectedScoreRun.scoreRunId;
    if (summaryState?.pending && summaryState.scoreRunId === scoreRunId) {
      return;
    }
    const requestSequence = summaryRequestSequenceRef.current + 1;
    summaryRequestSequenceRef.current = requestSequence;
    setSummaryState({
      scoreRunId,
      pending: true,
      response: null,
      outcome: null,
      error: null,
    });
    setActionError(null);
    setActionMessage(null);
    try {
      const response = await requestDpmPmOperatingQualitySummary({
        scoreRunId,
      });
      if (
        requestSequence !== summaryRequestSequenceRef.current ||
        currentSelectionRef.current.scoreRunId !== scoreRunId
      ) {
        return;
      }
      setSummaryState({
        scoreRunId,
        pending: false,
        response: matchesPmOperatingQualitySummaryScoreRun(response, scoreRunId)
          ? response
          : null,
        outcome: buildDpmAiWorkflowOutcome(
          "pm-quality-summary",
          response,
          scoreRunId,
        ),
        error: null,
      });
    } catch (error) {
      if (
        requestSequence !== summaryRequestSequenceRef.current ||
        currentSelectionRef.current.scoreRunId !== scoreRunId
      ) {
        return;
      }
      setSummaryState({
        scoreRunId,
        pending: false,
        response: null,
        outcome: null,
        error: buildPmQualityActionError(
          error,
          "PM operating quality support summary request failed",
        ),
      });
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
    const actionSelectionKey = currentSelectionKey;
    const previewKey = currentReviewActionPreviewKey;
    setPendingReviewActionPreview(true);
    setActionError(null);
    setActionMessage(null);
    setReviewActionPreviewResponse(null);
    setReviewActionPreviewKey(null);
    setReviewActionCreateEvidence(null);
    try {
      const correlationId = buildDpmPmOperatingQualityReviewActionCorrelationId();
      const response = await previewDpmPmOperatingQualityReviewAction({
        request: buildReviewActionRequest(reviewActionForm, model),
        actorId: reviewActionForm.actorId,
        correlationId,
      });
      if (currentSelectionKeyRef.current !== actionSelectionKey) return;
      setReviewActionPreviewResponse(response);
      setReviewActionPreviewKey(previewKey);
      setActionMessage("Review-action preview returned Manage supervisory evidence.");
    } catch (error) {
      if (currentSelectionKeyRef.current !== actionSelectionKey) return;
      setActionError(
        buildPmQualityActionError(error, "PM operating quality review-action preview failed")
      );
    } finally {
      setPendingReviewActionPreview(false);
    }
  }

  async function createReviewAction() {
    if (pendingReviewActionCreate || persistedActionPendingRef.current) {
      return;
    }
    if (!reviewActionPreviewReady) {
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
    persistedActionPendingRef.current = true;
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
      setRetainedReviewActionResponses((current) =>
        retainGatewayResponseBySourceId(
          current,
          response,
          readPmQualityReviewActionId,
        ),
      );
      setReviewActionCreateEvidence(buildPmQualityReviewActionEvidence(response));
      const reviewActionId = readPmQualityReviewActionId(response);
      if (reviewActionId) {
        const detail = await getDpmPmOperatingQualityReviewAction(reviewActionId, "client");
        const nextSelection = { ...currentSelectionRef.current, reviewActionId };
        setSelectionPreference(nextSelection);
        currentSelectionRef.current = nextSelection;
        currentSelectionKeyRef.current = buildPmOperatingQualitySelectionKey(nextSelection);
        setSelectedReviewActionDetail({
          recordId: reviewActionId,
          pending: false,
          response: detail,
        });
        setRetainedReviewActionResponses((current) =>
          retainGatewayResponseBySourceId(
            current,
            detail,
            readPmQualityReviewActionId,
          ),
        );
        setSummaryInvocationFormState((current) => ({
          ...current,
          reviewActionId,
        }));
      }
      setActionMessage("Recorded Manage-owned supervisory review action.");
    } catch (error) {
      setActionError(
        buildPmQualityActionError(error, "PM operating quality review-action create failed")
      );
    } finally {
      persistedActionPendingRef.current = false;
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
    const actionSelectionKey = currentSelectionKey;
    const previewKey = currentSummaryInvocationPreviewKey;
    setPendingSummaryInvocationPreview(true);
    setActionError(null);
    setActionMessage(null);
    setSummaryInvocationPreviewResponse(null);
    setSummaryInvocationPreviewKey(null);
    setCreatedSummaryInvocationResponse(null);
    setSummaryInvocationCreateEvidence(null);
    try {
      const correlationId = buildDpmPmOperatingQualitySummaryInvocationCorrelationId();
      const response = await previewDpmPmOperatingQualitySummaryInvocation({
        request: buildSummaryInvocationRequest(summaryInvocationForm),
        actorId: summaryInvocationForm.requestedBy,
        correlationId,
      });
      if (currentSelectionKeyRef.current !== actionSelectionKey) return;
      setSummaryInvocationPreviewResponse(response);
      setSummaryInvocationPreviewKey(previewKey);
      setActionMessage("Summary-invocation preview returned Manage evidence.");
    } catch (error) {
      if (currentSelectionKeyRef.current !== actionSelectionKey) return;
      setActionError(
        buildPmQualityActionError(error, "PM operating quality summary-invocation preview failed")
      );
    } finally {
      setPendingSummaryInvocationPreview(false);
    }
  }

  async function createSummaryInvocation() {
    if (pendingSummaryInvocationCreate || persistedActionPendingRef.current) {
      return;
    }
    if (!summaryInvocationPreviewReady) {
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
    persistedActionPendingRef.current = true;
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
      persistedActionPendingRef.current = false;
      setPendingSummaryInvocationCreate(false);
    }
  }

  return {
    model,
    selection,
    pendingFairnessDetail:
      selectedFairnessDetail?.recordId === selection.fairnessAnalysisId &&
      selectedFairnessDetail.pending,
    pendingReviewActionDetail:
      selectedReviewActionDetail?.recordId === selection.reviewActionId &&
      selectedReviewActionDetail.pending,
    pendingAction,
    pendingFairnessAction,
    pendingFairnessCreateAction,
    pendingSummaryAction,
    pendingReviewActionPreview,
    pendingReviewActionCreate,
    pendingSummaryInvocationPreview,
    pendingSummaryInvocationCreate,
    selectionLocked:
      pendingFairnessCreateAction ||
      pendingReviewActionCreate ||
      pendingSummaryInvocationCreate,
    actionError: summaryActionError ?? actionError,
    actionMessage,
    summaryOutcome,
    fairnessCreateEvidence,
    reviewActionCreateEvidence,
    summaryInvocationCreateEvidence,
    reviewActionForm,
    summaryInvocationForm,
    reviewActionTargetOptions,
    summaryInvocationScoreRunOptions,
    summaryInvocationReviewActionOptions,
    reviewActionReadiness,
    summaryInvocationReadiness,
    reviewActionPreviewReady,
    summaryInvocationPreviewReady,
    setReviewActionFormValue,
    setSummaryInvocationFormValue,
    selectScoreRun,
    selectFairnessAnalysis,
    selectReviewAction,
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
