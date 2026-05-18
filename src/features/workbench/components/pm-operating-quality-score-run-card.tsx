"use client";

import {
  ActionButton,
  AnalyticsTable,
  MetricRow,
  SemanticBadge,
  Text,
} from "@/design-system";
import { formatPmQualityReasonCodeList } from "@/features/workbench/pm-operating-quality-panel-helpers";
import type { PmOperatingQualityPanelModel } from "@/features/workbench/pm-operating-quality-view-model";
import type {
  PmQualityActionError,
  PmQualityFairnessCreateEvidence,
} from "@/features/workbench/pm-operating-quality-actions";
import {
  businessStateLabel,
  toneForState,
} from "@/features/workbench/manage-workspace-view-model";

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
    <div className="pm-quality-primary-card">
      <div className="pm-quality-card-header">
        <Text as="h3" variant="subsectionTitle">
          Score-Run Evidence
        </Text>
        <div className="pm-quality-action-row">
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
      <div className="pm-quality-command-readiness" aria-label="PM operating quality command readiness">
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
        <div className="pm-quality-action-error" aria-label="PM operating quality action error posture">
          <MetricRow label="Status Class" value={actionError.statusClass} />
          <MetricRow label="Gateway Status" value={actionError.status} />
          <MetricRow label="Error Source" value={actionError.source} />
        </div>
      ) : null}
      <div className="pm-quality-operation-evidence" aria-label="PM operating quality Gateway operation evidence">
        <MetricRow label="Operation" value={model.operationEvidence.operation} />
        <MetricRow label="Correlation" value={model.operationEvidence.correlationId} />
        <MetricRow label="Contract" value={model.operationEvidence.contractVersion} />
        <MetricRow label="Source Service" value={model.operationEvidence.sourceService} />
        <MetricRow label="Upstream Status" value={model.operationEvidence.upstreamStatus} />
      </div>
      {fairnessCreateEvidence ? (
        <div
          className="pm-quality-operation-evidence"
          aria-label="PM operating quality persisted fairness create evidence"
        >
          <MetricRow label="Persisted Analysis" value={fairnessCreateEvidence.fairnessAnalysisId} />
          <MetricRow label="Create Correlation" value={fairnessCreateEvidence.correlationId} />
          <MetricRow label="Create Source" value={fairnessCreateEvidence.sourceService} />
          <MetricRow label="Create Upstream Status" value={fairnessCreateEvidence.upstreamStatus} />
        </div>
      ) : null}
      <div className="pm-quality-operation-evidence" aria-label="PM operating quality support summary posture">
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
      <AnalyticsTable
        ariaLabel="PM operating quality score runs"
        variant="analysis"
        density="compact"
        columns={[
          { key: "scoreRun", label: "Score Run" },
          { key: "pm", label: "PM / Book" },
          { key: "policy", label: "Policy" },
          { key: "asOf", label: "As Of" },
          { key: "state", label: "State" },
          { key: "score", label: "Score" },
          { key: "forbiddenUses", label: "Forbidden Uses" },
          { key: "source", label: "Source Refs" },
          { key: "reason", label: "Reason" },
        ]}
        rows={model.scoreRunRows.map((row) => ({
          key: row.key,
          cells: [
            <strong key={`${row.key}-id`}>{row.scoreRunId}</strong>,
            `${row.pmId} / ${row.bookId}`,
            row.policy,
            row.asOfDate,
            <SemanticBadge key={`${row.key}-state`} tone={toneForState(row.state)}>
              {businessStateLabel(row.state)}
            </SemanticBadge>,
            row.score,
            row.forbiddenUses,
            row.sourceRefs,
            formatPmQualityReasonCodeList(row.reasonCodes),
          ],
        }))}
        emptyState={{
          title: "No score runs returned",
          body: "Load or preview Manage score-run evidence before using score-run posture.",
        }}
      />
    </div>
  );
}
