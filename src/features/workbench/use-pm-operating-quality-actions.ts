"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
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
  type PmQualityReviewActionForm,
  type PmQualitySummaryInvocationForm,
  type UsePmOperatingQualityActionsInput,
  type UsePmOperatingQualityActionsResult,
} from "@/features/workbench/pm-operating-quality-actions";
import {
  buildReviewActionRequest,
  buildReviewActionTargetOptions,
  buildSummaryInvocationRequest,
  buildSummaryInvocationReviewActionOptions,
  buildSummaryInvocationScoreRunOptions,
  pmOperatingQualitySelectionEquals,
  readPmOperatingQualitySelection,
} from "@/features/workbench/pm-operating-quality-command-model";
import { usePmOperatingQualityCommandForms } from "@/features/workbench/use-pm-operating-quality-command-forms";
import {
  pmOperatingQualityFairnessAnalysisQueryOptions,
  pmOperatingQualityReviewActionQueryOptions,
} from "@/features/workbench/pm-operating-quality-query-options";
import {
  PM_OPERATING_QUALITY_PERSISTENCE_SCOPE,
  pmOperatingQualityMutationKeys,
  pmOperatingQualityQueryKeys,
} from "@/features/workbench/pm-operating-quality-query-keys";
import {
  PM_QUALITY_COMMAND_COPY,
  PmQualityCommandError,
  commandPosture,
  resolveCommandFeedback,
  type PmQualityCommandVariables,
  type PmQualitySummaryResult,
} from "@/features/workbench/pm-operating-quality-command-lifecycle";
import {
  usePmOperatingQualitySources,
  type PmQualityPersistedRecord,
} from "@/features/workbench/use-pm-operating-quality-sources";
import {
  buildPmOperatingQualityPanelModel,
  matchesPmOperatingQualitySummaryScoreRun,
  type PmOperatingQualitySelection,
  type PmOperatingQualityPanelModel,
} from "@/features/workbench/pm-operating-quality-view-model";
import { buildDpmAiWorkflowOutcome } from "@/features/workbench/dpm-ai-workflow-disclosure";
import type {
  DpmPmOperatingQualityGatewayResponse,
  DpmPmOperatingQualitySummaryResponse,
} from "@/features/workbench/types";

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
  const [selectionPreference, setSelectionPreference] = useState<PmOperatingQualitySelection>({
    scoreRunId: null,
    fairnessAnalysisId: null,
    reviewActionId: null,
  });
  const [commandEpoch, setCommandEpoch] = useState(0);
  const queryClient = useQueryClient();
  const sources = usePmOperatingQualitySources({
    fairnessAnalyses,
    fairnessAnalysisDetail,
    reviewActions,
    reviewActionDetail,
    summaryInvocations,
    selectedFairnessAnalysisId: selectionPreference.fairnessAnalysisId,
    selectedReviewActionId: selectionPreference.reviewActionId,
  });

  // A source-changing persisted command is complete only when the exact affected list
  // has refreshed. Awaiting the invalidation inside the mutation keeps `isPending`
  // truthful through the refresh, and a refresh failure is an explicit error -- never
  // a completed confirmation over stale source evidence.
  async function refreshAffectedList(
    queryKey: readonly unknown[],
    label: string,
  ): Promise<void> {
    try {
      await queryClient.invalidateQueries({ queryKey, exact: true }, { throwOnError: true });
    } catch (error) {
      const underlying = buildPmQualityActionError(error, "source refresh failed");
      throw new PmQualityCommandError({
        ...underlying,
        body: `${label} persisted, but the governed source list refresh failed (${underlying.body}). Reload to confirm the recorded evidence.`,
      });
    }
  }

  function requireReady(state: string, detail: string): void {
    if (state !== "READY") {
      throw new PmQualityCommandError(buildPmQualityBlockedActionError(detail));
    }
  }

  function requirePolicyIdentity(commandLabel: string): void {
    if (model.policyId === "N/A" || model.policyVersion === "N/A") {
      throw new PmQualityCommandError(
        buildPmQualityBlockedActionError(
          `PM operating quality policy id/version is required for ${commandLabel}.`,
        ),
      );
    }
  }

  // Gates that depend on another mutation's outcome read the mutation cache, not the
  // render closure: observer results propagate a tick after the cache settles, and a
  // command submitted in that window must still see the truth.
  function cachedMutationVariables(
    mutationKey: readonly unknown[],
    status: "success" | "pending",
  ): PmQualityCommandVariables | null {
    const mutation = queryClient
      .getMutationCache()
      .find({ mutationKey: mutationKey as unknown[], status });
    return mutation ? (mutation.state.variables as PmQualityCommandVariables) : null;
  }

  function persistedCommandInFlight(): boolean {
    return [
      pmOperatingQualityMutationKeys.fairnessCreate(),
      pmOperatingQualityMutationKeys.reviewActionCreate(),
      pmOperatingQualityMutationKeys.summaryInvocationCreate(),
    ].some((mutationKey) => Boolean(cachedMutationVariables(mutationKey, "pending")));
  }

  function requirePreviewedForm(
    previewMutationKey: readonly unknown[],
    currentPreviewKey: string,
    blockedDetail: string,
  ): void {
    const previewedVariables = cachedMutationVariables(previewMutationKey, "success");
    if (previewedVariables?.previewKey !== currentPreviewKey) {
      throw new PmQualityCommandError(buildPmQualityBlockedActionError(blockedDetail));
    }
  }

  const previewScoreRunMutation = useMutation({
    mutationKey: pmOperatingQualityMutationKeys.scoreRunPreview(),
    mutationFn: async (
      _variables: PmQualityCommandVariables,
    ): Promise<DpmPmOperatingQualityGatewayResponse> => {
      requireReady(model.scoreRunPreviewReadinessState, model.scoreRunPreviewReadiness);
      return await previewDpmPmOperatingQualityScoreRun({
        policyId: model.policyId !== "N/A" ? model.policyId : undefined,
        policyVersion: model.policyVersion !== "N/A" ? model.policyVersion : undefined,
      });
    },
  });
  const previewFairnessMutation = useMutation({
    mutationKey: pmOperatingQualityMutationKeys.fairnessPreview(),
    mutationFn: async (
      _variables: PmQualityCommandVariables,
    ): Promise<DpmPmOperatingQualityGatewayResponse> => {
      requireReady(model.fairnessPreviewReadinessState, model.fairnessPreviewReadiness);
      requirePolicyIdentity("fairness preview");
      return await previewDpmPmOperatingQualityFairnessAnalysis({
        policyId: model.policyId,
        policyVersion: model.policyVersion,
        asOfDate: model.fairnessAsOfDate !== "N/A" ? model.fairnessAsOfDate : undefined,
        segments: model.fairnessSegmentRequests,
      });
    },
  });
  const createFairnessMutation = useMutation({
    mutationKey: pmOperatingQualityMutationKeys.fairnessCreate(),
    scope: { id: PM_OPERATING_QUALITY_PERSISTENCE_SCOPE },
    mutationFn: async (
      _variables: PmQualityCommandVariables,
    ): Promise<PmQualityPersistedRecord> => {
      requireReady(model.fairnessPreviewReadinessState, model.fairnessPreviewReadiness);
      requirePolicyIdentity("fairness analysis persistence");
      const response = await createDpmPmOperatingQualityFairnessAnalysis({
        policyId: model.policyId,
        policyVersion: model.policyVersion,
        asOfDate: model.fairnessAsOfDate !== "N/A" ? model.fairnessAsOfDate : undefined,
        segments: model.fairnessSegmentRequests,
      });
      const fairnessAnalysisId = readPmQualityFairnessAnalysisId(response);
      let detail: DpmPmOperatingQualityGatewayResponse | null = null;
      if (fairnessAnalysisId) {
        detail = await getDpmPmOperatingQualityFairnessAnalysis(fairnessAnalysisId, "client");
        queryClient.setQueryData(
          pmOperatingQualityQueryKeys.fairnessAnalysis(fairnessAnalysisId),
          detail,
        );
        setSelectionPreference((current) => ({ ...current, fairnessAnalysisId }));
      }
      await refreshAffectedList(sources.fairnessListQueryKey, "Fairness analysis");
      return { response, detail };
    },
  });
  const summaryMutation = useMutation({
    mutationKey: pmOperatingQualityMutationKeys.supportSummary(),
    mutationFn: async (
      variables: PmQualityCommandVariables,
    ): Promise<PmQualitySummaryResult> => {
      const scoreRunId = variables.scoreRunId ?? "";
      if (model.summaryRequestReadinessState !== "READY" || !scoreRunId) {
        throw new PmQualityCommandError(
          buildPmQualityBlockedActionError(model.summaryRequestReadiness),
        );
      }
      const response = await requestDpmPmOperatingQualitySummary({ scoreRunId });
      return {
        scoreRunId,
        response: matchesPmOperatingQualitySummaryScoreRun(response, scoreRunId)
          ? response
          : null,
        outcome: buildDpmAiWorkflowOutcome("pm-quality-summary", response, scoreRunId),
      };
    },
  });
  const previewReviewActionMutation = useMutation({
    mutationKey: pmOperatingQualityMutationKeys.reviewActionPreview(),
    mutationFn: async (
      _variables: PmQualityCommandVariables,
    ): Promise<DpmPmOperatingQualityGatewayResponse> => {
      requireReady(reviewActionReadiness.state, reviewActionReadiness.detail);
      const response = await previewDpmPmOperatingQualityReviewAction({
        request: buildReviewActionRequest(reviewActionForm, model),
        actorId: reviewActionForm.actorId,
        correlationId: buildDpmPmOperatingQualityReviewActionCorrelationId(),
      });
      // The preview IS Manage-returned evidence for its identity: seed it so the
      // identity-keyed detail Query does not repay a read for a record that is not
      // persisted yet (a detail GET for a previewed-only record has no source row).
      const previewedReviewActionId = readPmQualityReviewActionId(response);
      if (previewedReviewActionId) {
        queryClient.setQueryData(
          pmOperatingQualityQueryKeys.reviewAction(previewedReviewActionId),
          response,
        );
      }
      return response;
    },
  });
  const createReviewActionMutation = useMutation({
    mutationKey: pmOperatingQualityMutationKeys.reviewActionCreate(),
    scope: { id: PM_OPERATING_QUALITY_PERSISTENCE_SCOPE },
    mutationFn: async (
      _variables: PmQualityCommandVariables,
    ): Promise<PmQualityPersistedRecord> => {
      requirePreviewedForm(
        pmOperatingQualityMutationKeys.reviewActionPreview(),
        currentReviewActionPreviewKey,
        "Preview the supervisory review action before recording it.",
      );
      requireReady(reviewActionReadiness.state, reviewActionReadiness.detail);
      const response = await createDpmPmOperatingQualityReviewAction({
        request: buildReviewActionRequest(reviewActionForm, model),
        actorId: reviewActionForm.actorId,
        correlationId: buildDpmPmOperatingQualityReviewActionCorrelationId(),
      });
      const reviewActionId = readPmQualityReviewActionId(response);
      let detail: DpmPmOperatingQualityGatewayResponse | null = null;
      if (reviewActionId) {
        detail = await getDpmPmOperatingQualityReviewAction(reviewActionId, "client");
        queryClient.setQueryData(
          pmOperatingQualityQueryKeys.reviewAction(reviewActionId),
          detail,
        );
        setSelectionPreference((current) => ({ ...current, reviewActionId }));
        setSummaryInvocationFormState((current) => ({ ...current, reviewActionId }));
      }
      await refreshAffectedList(sources.reviewActionListQueryKey, "Supervisory review action");
      return { response, detail };
    },
  });
  const previewSummaryInvocationMutation = useMutation({
    mutationKey: pmOperatingQualityMutationKeys.summaryInvocationPreview(),
    mutationFn: async (
      _variables: PmQualityCommandVariables,
    ): Promise<DpmPmOperatingQualityGatewayResponse> => {
      requireReady(summaryInvocationReadiness.state, summaryInvocationReadiness.detail);
      return await previewDpmPmOperatingQualitySummaryInvocation({
        request: buildSummaryInvocationRequest(summaryInvocationForm),
        actorId: summaryInvocationForm.requestedBy,
        correlationId: buildDpmPmOperatingQualitySummaryInvocationCorrelationId(),
      });
    },
  });
  const createSummaryInvocationMutation = useMutation({
    mutationKey: pmOperatingQualityMutationKeys.summaryInvocationCreate(),
    scope: { id: PM_OPERATING_QUALITY_PERSISTENCE_SCOPE },
    mutationFn: async (
      _variables: PmQualityCommandVariables,
    ): Promise<PmQualityPersistedRecord> => {
      requirePreviewedForm(
        pmOperatingQualityMutationKeys.summaryInvocationPreview(),
        currentSummaryInvocationPreviewKey,
        "Preview the PM quality summary invocation before recording it.",
      );
      requireReady(summaryInvocationReadiness.state, summaryInvocationReadiness.detail);
      const response = await createDpmPmOperatingQualitySummaryInvocation({
        request: buildSummaryInvocationRequest(summaryInvocationForm),
        actorId: summaryInvocationForm.requestedBy,
        correlationId: buildDpmPmOperatingQualitySummaryInvocationCorrelationId(),
      });
      const summaryInvocationId = readPmQualitySummaryInvocationId(response);
      let detail: DpmPmOperatingQualityGatewayResponse | null = null;
      if (summaryInvocationId) {
        detail = await getDpmPmOperatingQualitySummaryInvocation(summaryInvocationId, "client");
      }
      await refreshAffectedList(
        sources.summaryInvocationListQueryKey,
        "PM quality summary invocation",
      );
      return { response, detail };
    },
  });

  function fenced(variables: PmQualityCommandVariables | undefined): boolean {
    return variables?.epoch === commandEpoch;
  }
  const previewResponse =
    fenced(previewScoreRunMutation.variables) ? previewScoreRunMutation.data ?? null : null;
  const fairnessPreviewResponse =
    fenced(previewFairnessMutation.variables) ? previewFairnessMutation.data ?? null : null;
  const reviewActionPreviewKey = fenced(previewReviewActionMutation.variables)
    ? previewReviewActionMutation.variables?.previewKey ?? null
    : null;
  const summaryInvocationPreviewKey = fenced(previewSummaryInvocationMutation.variables)
    ? previewSummaryInvocationMutation.variables?.previewKey ?? null
    : null;
  // Preview and freshly-created evidence feed the panel model while they belong to the
  // current selection epoch; the exposed *PreviewReady/evidence surfaces additionally
  // fence on the preview key, so a form edit downgrades them before any re-preview.
  const reviewActionPreviewInModel = fenced(previewReviewActionMutation.variables)
    ? previewReviewActionMutation.data ?? null
    : null;
  const summaryInvocationPreviewInModel = fenced(previewSummaryInvocationMutation.variables)
    ? previewSummaryInvocationMutation.data ?? null
    : null;
  const createdSummaryInvocationInModel = fenced(createSummaryInvocationMutation.variables)
    ? (createSummaryInvocationMutation.data?.detail ??
      createSummaryInvocationMutation.data?.response ??
      null)
    : null;

  function assembleModel(
    summary: DpmPmOperatingQualitySummaryResponse | null,
  ): PmOperatingQualityPanelModel {
    return buildPmOperatingQualityPanelModel({
      policies,
      scoreRuns,
      fairnessAnalyses: sources.fairnessSource,
      fairnessAnalysisDetails: [
        sources.selectedFairnessDetailResponse,
        fairnessAnalysisDetail,
      ],
      retainedFairnessAnalyses: sources.retainedFairnessAnalysisResponses,
      reviewActions: sources.reviewActionSource,
      reviewActionDetails: [
        sources.selectedReviewActionDetailResponse,
        reviewActionPreviewInModel,
        reviewActionDetail,
      ],
      retainedReviewActions: sources.retainedReviewActionResponses,
      summaryInvocations: sources.summaryInvocationSource,
      summaryInvocationDetail:
        createdSummaryInvocationInModel ??
        summaryInvocationPreviewInModel ??
        summaryInvocationDetail,
      preview: previewResponse,
      fairnessPreview: fairnessPreviewResponse,
      summary,
      selection: selectionPreference,
    });
  }

  const sourceModel = assembleModel(null);
  const summaryResult =
    fenced(summaryMutation.variables) && summaryMutation.data ? summaryMutation.data : null;
  const currentSummaryResult =
    summaryResult?.scoreRunId === sourceModel.selectedScoreRun?.scoreRunId
      ? summaryResult
      : null;
  const model = currentSummaryResult?.response
    ? assembleModel(currentSummaryResult.response)
    : sourceModel;
  const selection = readPmOperatingQualitySelection(model);
  if (!pmOperatingQualitySelectionEquals(selectionPreference, selection)) {
    setSelectionPreference(selection);
  }
  const summaryFenced =
    fenced(summaryMutation.variables) &&
    summaryMutation.variables?.scoreRunId === selection.scoreRunId;
  const {
    reviewActionForm,
    setReviewActionFormState,
    summaryInvocationForm,
    setSummaryInvocationFormState,
    reviewActionReadiness,
    summaryInvocationReadiness,
    currentReviewActionPreviewKey,
    currentSummaryInvocationPreviewKey,
  } = usePmOperatingQualityCommandForms(model, selection);
  const reviewActionPreviewReady =
    previewReviewActionMutation.isSuccess &&
    reviewActionPreviewKey === currentReviewActionPreviewKey;
  const summaryInvocationPreviewReady =
    previewSummaryInvocationMutation.isSuccess &&
    summaryInvocationPreviewKey === currentSummaryInvocationPreviewKey;

  // One feedback surface: the most recently submitted command that still belongs to
  // the current selection epoch speaks; everything older is fenced out. Both halves
  // are read from mutation state, never mirrored into local state.
  const copy = PM_QUALITY_COMMAND_COPY;
  const { actionMessage, commandError } = resolveCommandFeedback([
    commandPosture(previewScoreRunMutation, copy.scoreRunPreview, fenced(previewScoreRunMutation.variables)),
    commandPosture(previewFairnessMutation, copy.fairnessPreview, fenced(previewFairnessMutation.variables)),
    commandPosture(createFairnessMutation, copy.fairnessCreate, fenced(createFairnessMutation.variables)),
    commandPosture(summaryMutation, copy.supportSummary, summaryFenced),
    commandPosture(previewReviewActionMutation, copy.reviewActionPreview, fenced(previewReviewActionMutation.variables)),
    commandPosture(createReviewActionMutation, copy.reviewActionCreate, fenced(createReviewActionMutation.variables)),
    commandPosture(previewSummaryInvocationMutation, copy.summaryInvocationPreview, fenced(previewSummaryInvocationMutation.variables)),
    commandPosture(createSummaryInvocationMutation, copy.summaryInvocationCreate, fenced(createSummaryInvocationMutation.variables)),
  ]);

  function beginRecordSelection(nextSelection: PmOperatingQualitySelection): boolean {
    if (persistedCommandInFlight()) return false;
    setSelectionPreference(nextSelection);
    setCommandEpoch((epoch) => epoch + 1);
    return true;
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

  // Selecting a record fences the epoch and warms its identity-keyed detail Query;
  // Query state owns the selected-record failure and keeps it identity-fenced.
  async function selectDetailRecord(
    known: boolean,
    unchanged: boolean,
    nextSelection: PmOperatingQualitySelection,
    fetchDetail: () => Promise<unknown>,
  ): Promise<void> {
    if (!known || unchanged) return;
    if (!beginRecordSelection(nextSelection)) return;
    await fetchDetail().catch(() => undefined);
  }

  async function selectFairnessAnalysis(fairnessAnalysisId: string) {
    await selectDetailRecord(
      model.fairnessAnalysisRows.some(
        (row) => row.fairnessAnalysisId === fairnessAnalysisId,
      ),
      selection.fairnessAnalysisId === fairnessAnalysisId,
      { ...selection, fairnessAnalysisId },
      () =>
        queryClient.fetchQuery(
          pmOperatingQualityFairnessAnalysisQueryOptions(fairnessAnalysisId),
        ),
    );
  }

  async function selectReviewAction(reviewActionId: string) {
    await selectDetailRecord(
      model.reviewActionRows.some((row) => row.reviewActionId === reviewActionId),
      selection.reviewActionId === reviewActionId,
      { ...selection, reviewActionId },
      () =>
        queryClient.fetchQuery(pmOperatingQualityReviewActionQueryOptions(reviewActionId)),
    );
  }

  function setReviewActionFormValue(field: keyof PmQualityReviewActionForm, value: string) {
    if (field === "targetId") {
      if (reviewActionForm.targetType === "FAIRNESS_ANALYSIS") {
        void selectFairnessAnalysis(value);
      } else {
        selectScoreRun(value);
      }
      return;
    }
    setReviewActionFormState((current) =>
      field === "targetType"
        ? { ...current, targetType: value }
        : { ...current, [field]: value },
    );
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
  }

  // Command entry points never throw (the mutation carries the failure) and never
  // double-submit: previews guard on their own pending state, persisted commands on
  // any in-flight member of the shared persistence scope.
  function commandEntry(
    mutation: {
      isPending: boolean;
      mutateAsync: (variables: PmQualityCommandVariables) => Promise<unknown>;
    },
    kind: "preview" | "persist",
    extraVariables: () => Partial<PmQualityCommandVariables> = () => ({}),
  ): () => Promise<void> {
    return async () => {
      if (kind === "preview" ? mutation.isPending : persistedCommandInFlight()) return;
      await mutation
        .mutateAsync({ epoch: commandEpoch, ...extraVariables() })
        .catch(() => undefined);
    };
  }

  const previewScoreRun = commandEntry(previewScoreRunMutation, "preview");
  const previewFairnessAnalysis = commandEntry(previewFairnessMutation, "preview");
  const createFairnessAnalysis = commandEntry(createFairnessMutation, "persist");
  const previewReviewAction = commandEntry(previewReviewActionMutation, "preview", () => ({
    previewKey: currentReviewActionPreviewKey,
  }));
  const createReviewAction = commandEntry(createReviewActionMutation, "persist", () => ({
    previewKey: currentReviewActionPreviewKey,
  }));
  const previewSummaryInvocation = commandEntry(
    previewSummaryInvocationMutation,
    "preview",
    () => ({ previewKey: currentSummaryInvocationPreviewKey }),
  );
  const createSummaryInvocation = commandEntry(
    createSummaryInvocationMutation,
    "persist",
    () => ({ previewKey: currentSummaryInvocationPreviewKey }),
  );

  async function requestSupportSummary() {
    const scoreRunId = model.selectedScoreRun?.scoreRunId ?? "";
    if (
      scoreRunId &&
      summaryMutation.isPending &&
      summaryMutation.variables?.scoreRunId === scoreRunId
    ) {
      return;
    }
    await summaryMutation
      .mutateAsync({ epoch: commandEpoch, scoreRunId })
      .catch(() => undefined);
  }

  const persistPending =
    createFairnessMutation.isPending ||
    createReviewActionMutation.isPending ||
    createSummaryInvocationMutation.isPending;

  return {
    model,
    selection,
    pendingFairnessDetail:
      selectionPreference.fairnessAnalysisId === selection.fairnessAnalysisId &&
      sources.fairnessDetailFetching,
    pendingReviewActionDetail:
      selectionPreference.reviewActionId === selection.reviewActionId &&
      sources.reviewActionDetailFetching,
    pendingAction: previewScoreRunMutation.isPending,
    pendingFairnessAction: previewFairnessMutation.isPending,
    pendingFairnessCreateAction: createFairnessMutation.isPending,
    pendingSummaryAction: summaryFenced && summaryMutation.isPending,
    pendingReviewActionPreview: previewReviewActionMutation.isPending,
    pendingReviewActionCreate: createReviewActionMutation.isPending,
    pendingSummaryInvocationPreview: previewSummaryInvocationMutation.isPending,
    pendingSummaryInvocationCreate: createSummaryInvocationMutation.isPending,
    selectionLocked: persistPending,
    actionError: sources.selectedDetailError ?? commandError,
    actionMessage,
    summaryOutcome: summaryFenced ? currentSummaryResult?.outcome ?? null : null,
    fairnessCreateEvidence:
      fenced(createFairnessMutation.variables) && createFairnessMutation.data
        ? buildPmQualityFairnessCreateEvidence(createFairnessMutation.data.response)
        : null,
    reviewActionCreateEvidence:
      fenced(createReviewActionMutation.variables) &&
      createReviewActionMutation.variables?.previewKey === currentReviewActionPreviewKey &&
      createReviewActionMutation.data
        ? buildPmQualityReviewActionEvidence(createReviewActionMutation.data.response)
        : null,
    summaryInvocationCreateEvidence:
      fenced(createSummaryInvocationMutation.variables) &&
      createSummaryInvocationMutation.variables?.previewKey ===
        currentSummaryInvocationPreviewKey &&
      createSummaryInvocationMutation.data
        ? buildPmQualitySummaryInvocationEvidence(
            createSummaryInvocationMutation.data.response,
          )
        : null,
    reviewActionForm,
    summaryInvocationForm,
    reviewActionTargetOptions: buildReviewActionTargetOptions(model),
    summaryInvocationScoreRunOptions: buildSummaryInvocationScoreRunOptions(model),
    summaryInvocationReviewActionOptions: buildSummaryInvocationReviewActionOptions(model),
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
