"use client";

import { businessStateLabel, formatBusinessReason } from "@/copy/business-state-copy";
import {
  MetricRow,
  ScreenStatePanel,
  SectionBlock,
  SemanticBadge,
} from "@/design-system";
import PmOperatingQualityFairnessEvidenceCard from "@/features/workbench/components/pm-operating-quality-fairness-evidence-card";
import DpmAiWorkflowResult from "@/features/workbench/components/dpm-ai-workflow-result";
import PmOperatingQualityGovernanceCard from "@/features/workbench/components/pm-operating-quality-governance-card";
import PmOperatingQualityPolicyCard from "@/features/workbench/components/pm-operating-quality-policy-card";
import PmOperatingQualityRecordContext from "@/features/workbench/components/pm-operating-quality-record-context";
import PmOperatingQualityReviewActionsCard from "@/features/workbench/components/pm-operating-quality-review-actions-card";
import PmOperatingQualityScoreRunCard from "@/features/workbench/components/pm-operating-quality-score-run-card";
import PmOperatingQualitySummaryInvocationsCard from "@/features/workbench/components/pm-operating-quality-summary-invocations-card";
import {
  pmOperatingQualityStatePanelCopy,
} from "@/features/workbench/pm-operating-quality-panel-helpers";
import type {
  DpmPmOperatingQualityGatewayResponse,
} from "@/features/workbench/types";
import {
  toneForState,
} from "@/features/workbench/manage-workspace-view-model";
import { usePmOperatingQualityActions } from "@/features/workbench/use-pm-operating-quality-actions";

type Props = {
  policies: DpmPmOperatingQualityGatewayResponse | null;
  scoreRuns: DpmPmOperatingQualityGatewayResponse | null;
  fairnessAnalyses?: DpmPmOperatingQualityGatewayResponse | null;
  fairnessAnalysisDetail?: DpmPmOperatingQualityGatewayResponse | null;
  reviewActions?: DpmPmOperatingQualityGatewayResponse | null;
  reviewActionDetail?: DpmPmOperatingQualityGatewayResponse | null;
  summaryInvocations?: DpmPmOperatingQualityGatewayResponse | null;
  summaryInvocationDetail?: DpmPmOperatingQualityGatewayResponse | null;
  policiesError?: string | null;
  scoreRunsError?: string | null;
  fairnessAnalysesError?: string | null;
  fairnessAnalysisDetailError?: string | null;
  reviewActionsError?: string | null;
  reviewActionDetailError?: string | null;
  summaryInvocationsError?: string | null;
  summaryInvocationDetailError?: string | null;
};

export default function PmOperatingQualityPanel({
  policies,
  scoreRuns,
  fairnessAnalyses = null,
  fairnessAnalysisDetail = null,
  reviewActions = null,
  reviewActionDetail = null,
  summaryInvocations = null,
  summaryInvocationDetail = null,
  policiesError = null,
  scoreRunsError = null,
  fairnessAnalysesError = null,
  fairnessAnalysisDetailError = null,
  reviewActionsError = null,
  reviewActionDetailError = null,
  summaryInvocationsError = null,
  summaryInvocationDetailError = null,
}: Props) {
  const {
    model,
    selection,
    pendingFairnessDetail,
    pendingReviewActionDetail,
    pendingAction,
    pendingFairnessAction,
    pendingFairnessCreateAction,
    pendingSummaryAction,
    pendingReviewActionPreview,
    pendingReviewActionCreate,
    pendingSummaryInvocationPreview,
    pendingSummaryInvocationCreate,
    selectionLocked,
    actionError,
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
  } = usePmOperatingQualityActions({
    policies,
    scoreRuns,
    fairnessAnalyses,
    fairnessAnalysisDetail,
    reviewActions,
    reviewActionDetail,
    summaryInvocations,
    summaryInvocationDetail,
  });
  const stateCopy = pmOperatingQualityStatePanelCopy(model.state);
  const loadError =
    policiesError ||
    scoreRunsError ||
    fairnessAnalysesError ||
    fairnessAnalysisDetailError ||
    reviewActionsError ||
    reviewActionDetailError ||
    summaryInvocationsError ||
    summaryInvocationDetailError;
  const shouldShowStatePanel =
    Boolean(loadError) ||
    Boolean(actionError) ||
    model.state === "empty" ||
    model.state === "partial" ||
    model.state === "blocked" ||
    model.state === "unavailable";
  const renderedState = loadError || actionError ? "partial" : model.state;

  return (
    <SectionBlock
      title="PM Operating Quality"
      subtitle="Gateway-backed supervisory evidence for Manage-owned PM policy and score-run posture."
      className="pm-operating-quality-panel"
      actions={
        <div className="pm-quality-badge-row">
          <SemanticBadge tone={toneForState(model.supportabilityState)}>
            {businessStateLabel(model.supportabilityState)}
          </SemanticBadge>
          <SemanticBadge>Manage authority</SemanticBadge>
          {model.fairnessAnalysisId !== "N/A" ? (
            <SemanticBadge tone={toneForState(model.fairnessState)}>
              Fairness {businessStateLabel(model.fairnessState)}
            </SemanticBadge>
          ) : null}
        </div>
      }
    >
      {shouldShowStatePanel ? (
        <ScreenStatePanel
          kind={loadError || actionError ? "partial" : stateCopy.kind}
          surface="portfolio"
          title={loadError || actionError ? "PM operating quality needs attention" : stateCopy.title}
          body={loadError || actionError?.body || stateCopy.body}
        />
      ) : null}

      <div
        className="pm-quality-status-strip"
        data-testid="pm-operating-quality-source-evidence"
        data-panel-state={renderedState}
        data-attention-state={loadError || actionError ? "required" : "clear"}
        data-supportability-state={model.supportabilityState}
        data-source-service={model.operationEvidence.sourceService}
        data-authority={model.authority}
        data-score-run-id={model.scoreRunId}
        data-score-run-state={model.selectedScoreRun?.state ?? "N/A"}
        data-fairness-analysis-id={model.fairnessAnalysisId}
        data-fairness-analysis-state={model.fairnessState}
      >
        <MetricRow label="Policy" value={`${model.policyId} / ${model.policyVersion}`} />
        <MetricRow label="Selected Quality Run" value={model.scoreRunId} />
        <MetricRow label="Selected Fairness Review" value={model.fairnessAnalysisId} />
        <MetricRow label="Summary Invocation" value={model.summaryInvocationId} />
        <MetricRow label="Returned Rows" value={model.count} />
        <MetricRow label="Authority" value={model.authority} />
      </div>

      <div className="pm-quality-reason-row">
        {model.reasonCodes.length > 0 ? (
          model.reasonCodes.map((reason) => (
            <SemanticBadge key={reason} tone={toneForState(reason)}>
              {formatBusinessReason(reason)}
            </SemanticBadge>
          ))
        ) : (
          <SemanticBadge>No reason codes returned</SemanticBadge>
        )}
      </div>

      <PmOperatingQualityRecordContext
        model={model}
        selection={selection}
        pendingFairnessDetail={pendingFairnessDetail}
        pendingReviewActionDetail={pendingReviewActionDetail}
        selectionLocked={selectionLocked}
        onScoreRunSelection={selectScoreRun}
        onFairnessAnalysisSelection={(fairnessAnalysisId) => {
          void selectFairnessAnalysis(fairnessAnalysisId);
        }}
        onReviewActionSelection={(reviewActionId) => {
          void selectReviewAction(reviewActionId);
        }}
      />

      <div className="pm-quality-workspace">
        <PmOperatingQualityScoreRunCard
          model={model}
          pendingScorePreview={pendingAction}
          pendingSummaryRequest={pendingSummaryAction}
          pendingFairnessPreview={pendingFairnessAction}
          pendingFairnessPersist={pendingFairnessCreateAction}
          actionMessage={actionMessage}
          actionError={actionError}
          fairnessCreateEvidence={fairnessCreateEvidence}
          onPreviewScoreRun={previewScoreRun}
          onRequestSupportSummary={requestSupportSummary}
          onPreviewFairness={previewFairnessAnalysis}
          onPersistFairness={createFairnessAnalysis}
        />

        <PmOperatingQualityGovernanceCard model={model} />
      </div>

      {summaryOutcome ? (
        <DpmAiWorkflowResult
          outcome={summaryOutcome}
          ariaLabel="PM quality decision-support result"
          eyebrow="Supervisory decision support"
          focusOnMount
        />
      ) : null}

      <PmOperatingQualityFairnessEvidenceCard model={model} />

      <PmOperatingQualityReviewActionsCard
        model={model}
        form={reviewActionForm}
        readiness={reviewActionReadiness}
        previewReady={reviewActionPreviewReady}
        pendingPreview={pendingReviewActionPreview}
        pendingCreate={pendingReviewActionCreate}
        createEvidence={reviewActionCreateEvidence}
        targetOptions={reviewActionTargetOptions}
        onFormChange={setReviewActionFormValue}
        onPreview={previewReviewAction}
        onCreate={createReviewAction}
      />

      <PmOperatingQualitySummaryInvocationsCard
        model={model}
        form={summaryInvocationForm}
        readiness={summaryInvocationReadiness}
        previewReady={summaryInvocationPreviewReady}
        pendingPreview={pendingSummaryInvocationPreview}
        pendingCreate={pendingSummaryInvocationCreate}
        createEvidence={summaryInvocationCreateEvidence}
        scoreRunOptions={summaryInvocationScoreRunOptions}
        reviewActionOptions={summaryInvocationReviewActionOptions}
        onFormChange={setSummaryInvocationFormValue}
        onPreview={previewSummaryInvocation}
        onCreate={createSummaryInvocation}
      />

      <PmOperatingQualityPolicyCard model={model} />
    </SectionBlock>
  );
}
