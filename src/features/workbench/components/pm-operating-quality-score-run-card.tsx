"use client";

import {
  ActionButton,
  MetricRow,
  Text,
} from "@/design-system";
import styles from "@/features/workbench/components/pm-operating-quality.module.css";
import type { PmOperatingQualityPanelModel } from "@/features/workbench/pm-operating-quality-view-model";
import type {
  PmQualityActionError,
  PmQualityFairnessCreateEvidence,
} from "@/features/workbench/pm-operating-quality-actions";

type Props = {
  model: PmOperatingQualityPanelModel;
  pendingScorePreview: boolean;
  pendingSummaryRequest: boolean;
  pendingFairnessPreview: boolean;
  pendingFairnessPersist: boolean;
  actionMessage?: string | null;
  actionError?: PmQualityActionError | null;
  fairnessCreateEvidence?: PmQualityFairnessCreateEvidence | null;
  onPreviewScoreRun: () => void;
  onRequestSupportSummary: () => void;
  onPreviewFairness: () => void;
  onPersistFairness: () => void;
};

export default function PmOperatingQualityScoreRunCard({
  model,
  pendingScorePreview,
  pendingSummaryRequest,
  pendingFairnessPreview,
  pendingFairnessPersist,
  actionMessage = null,
  actionError = null,
  fairnessCreateEvidence = null,
  onPreviewScoreRun,
  onRequestSupportSummary,
  onPreviewFairness,
  onPersistFairness,
}: Props) {
  return (
    <div className={styles.primaryCard} data-testid="pm-operating-quality-score-run-card">
      <div className={styles.cardHeader}>
        <Text as="h3" variant="subsectionTitle">
          Score-Run Evidence
        </Text>
        <div className={styles.actionRow}>
          <ActionButton
            priority="secondary"
            onClick={onPreviewScoreRun}
            disabled={pendingScorePreview || model.scoreRunPreviewReadinessState !== "READY"}
          >
            {pendingScorePreview ? "Previewing" : "Preview Score Run"}
          </ActionButton>
          <ActionButton
            priority="secondary"
            onClick={onRequestSupportSummary}
            disabled={pendingSummaryRequest || model.summaryRequestReadinessState !== "READY"}
          >
            {pendingSummaryRequest ? "Requesting" : "Request Support Summary"}
          </ActionButton>
          <ActionButton
            priority="primary"
            onClick={onPreviewFairness}
            disabled={pendingFairnessPreview || model.fairnessPreviewReadinessState !== "READY"}
          >
            {pendingFairnessPreview ? "Checking" : "Preview Fairness"}
          </ActionButton>
          <ActionButton
            priority="primary"
            onClick={onPersistFairness}
            disabled={pendingFairnessPersist || model.fairnessPreviewReadinessState !== "READY"}
          >
            {pendingFairnessPersist ? "Persisting" : "Persist Fairness"}
          </ActionButton>
        </div>
      </div>
      {actionMessage ? <Text variant="secondary">{actionMessage}</Text> : null}
      <div className={styles.commandReadiness} aria-label="PM operating quality command readiness">
        <MetricRow label="Score Preview Command" value={model.scoreRunPreviewReadiness} />
        <MetricRow label="Summary Request" value={model.summaryRequestReadiness} />
        <MetricRow label="Fairness Preview Command" value={model.fairnessPreviewReadiness} />
        <MetricRow label="Fairness Persist Command" value={model.fairnessPreviewReadiness} />
        <MetricRow
          label="Execution Boundary"
          value="Gateway-backed evidence only; no browser prompt, scoring, ranking, trade approval, order routing, OMS, or client contact in Workbench"
        />
      </div>
      {actionError ? (
        <div className={styles.actionError} aria-label="PM operating quality action error status">
          <MetricRow label="Status Class" value={actionError.statusClass} />
          <MetricRow label="Gateway Status" value={actionError.status} />
          <MetricRow label="Error Source" value={actionError.source} />
        </div>
      ) : null}
      <div className={styles.operationEvidence} aria-label="PM operating quality operation evidence">
        <MetricRow label="Operation" value={model.operationEvidence.operation} />
        <MetricRow label="Correlation" value={model.operationEvidence.correlationId} />
        <MetricRow label="Contract" value={model.operationEvidence.contractVersion} />
        <MetricRow label="Source Service" value={model.operationEvidence.sourceService} />
        <MetricRow label="Upstream Status" value={model.operationEvidence.upstreamStatus} />
      </div>
      {fairnessCreateEvidence ? (
        <div
          className={styles.operationEvidence}
          aria-label="PM operating quality persisted fairness create evidence"
        >
          <MetricRow label="Persisted Analysis" value={fairnessCreateEvidence.fairnessAnalysisId} />
          <MetricRow label="Create Correlation" value={fairnessCreateEvidence.correlationId} />
          <MetricRow label="Create Source" value={fairnessCreateEvidence.sourceService} />
          <MetricRow label="Create Upstream Status" value={fairnessCreateEvidence.upstreamStatus} />
        </div>
      ) : null}
      <div className={styles.operationEvidence} aria-label="PM operating quality support summary status">
        <MetricRow label="Summary Status" value={model.summaryPosture.status} />
        <MetricRow label="Review Posture" value={model.summaryPosture.reviewState} />
        <MetricRow label="Workflow Authority" value={model.summaryPosture.workflowAuthority} />
        <MetricRow label="Workflow Run" value={model.summaryPosture.runId} />
        <MetricRow label="Requested Outputs" value={model.summaryPosture.requestedOutputs} />
        <MetricRow label="Audience" value={model.summaryPosture.audience} />
        <MetricRow label="Evidence Source" value={model.summaryPosture.evidenceSource} />
        <MetricRow label="Summary Supportability" value={model.summaryPosture.supportability} />
        <MetricRow label="Support Boundary" value={model.summaryPosture.boundary} />
      </div>
    </div>
  );
}
