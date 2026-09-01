"use client";

import { AnalyticsTable, MetricRow, Text } from "@/design-system";
import styles from "@/features/workbench/components/pm-operating-quality.module.css";
import PmOperatingQualitySummaryInvocationControl from "@/features/workbench/components/pm-operating-quality-summary-invocation-control";
import PmOperatingQualityStateBadge from "@/features/workbench/components/pm-operating-quality-state-badge";
import DpmAiWorkflowResult from "@/features/workbench/components/dpm-ai-workflow-result";
import { buildDpmAiInvocationEvidenceOutcome } from "@/features/workbench/dpm-ai-workflow-disclosure";
import { formatPmQualityReasonCodeList } from "@/features/workbench/pm-operating-quality-panel-helpers";
import type {
  PmQualityCommandOption,
  PmQualitySummaryInvocationEvidence,
  PmQualitySummaryInvocationForm,
} from "@/features/workbench/pm-operating-quality-actions";
import type { PmOperatingQualityPanelModel } from "@/features/workbench/pm-operating-quality-view-model";

type Props = {
  model: PmOperatingQualityPanelModel;
  form?: PmQualitySummaryInvocationForm;
  readiness?: { state: string; detail: string };
  previewReady?: boolean;
  pendingPreview?: boolean;
  pendingCreate?: boolean;
  createEvidence?: PmQualitySummaryInvocationEvidence | null;
  scoreRunOptions?: PmQualityCommandOption[];
  reviewActionOptions?: PmQualityCommandOption[];
  onFormChange?: (field: keyof PmQualitySummaryInvocationForm, value: string) => void;
  onPreview?: () => void;
  onCreate?: () => void;
};

export default function PmOperatingQualitySummaryInvocationsCard({
  model,
  form,
  readiness,
  previewReady = false,
  pendingPreview = false,
  pendingCreate = false,
  createEvidence = null,
  scoreRunOptions = [],
  reviewActionOptions = [],
  onFormChange,
  onPreview,
  onCreate,
}: Props) {
  const hasDetail = model.summaryInvocationDetail.summaryInvocationId !== "N/A";
  const invocationEvidenceOutcome = hasDetail
    ? buildDpmAiInvocationEvidenceOutcome({
        invocationId: model.summaryInvocationDetail.summaryInvocationId,
        invocationState: model.summaryInvocationDetail.invocationState,
        workflowRunId: model.summaryInvocationDetail.workflowRunId,
        artifactRef: model.summaryInvocationDetail.artifactRef,
        contentHash: model.summaryInvocationDetail.contentHash,
        sourceRefs: model.summaryInvocationDetail.sourceRefs,
        reviewActionId: model.summaryInvocationDetail.reviewActionId,
      })
    : null;

  return (
    <>
      {form && readiness && onFormChange && onPreview && onCreate ? (
        <PmOperatingQualitySummaryInvocationControl
          form={form}
          readiness={readiness}
          previewReady={previewReady}
          pendingPreview={pendingPreview}
          pendingCreate={pendingCreate}
          createEvidence={createEvidence}
          scoreRunOptions={scoreRunOptions}
          reviewActionOptions={reviewActionOptions}
          onFormChange={onFormChange}
          onPreview={onPreview}
          onCreate={onCreate}
        />
      ) : null}

      {invocationEvidenceOutcome ? (
        <DpmAiWorkflowResult
          outcome={invocationEvidenceOutcome}
          ariaLabel="PM quality summary-invocation evidence boundary"
          eyebrow="Invocation audit record"
        />
      ) : null}

      <div className={styles.reviewActionGrid}>
        <div className={styles.reviewActionDetail}>
          <div className={styles.cardHeader}>
            <Text as="h3" variant="subsectionTitle">
              Summary Invocation Detail
            </Text>
            <PmOperatingQualityStateBadge
              state={hasDetail ? model.summaryInvocationDetail.invocationState : "PENDING"}
              label={hasDetail ? undefined : "No detail"}
            />
          </div>
          <div aria-label="PM operating quality summary generation status">
            <MetricRow
              label="Gateway Read State"
              value={
                hasDetail
                  ? "Summary invocation returned by Gateway"
                  : "Awaiting Manage summary-invocation detail"
              }
            />
            <MetricRow
              label="Summary Invocation"
              value={model.summaryInvocationDetail.summaryRef}
            />
            <MetricRow label="Score Run" value={model.summaryInvocationDetail.scoreRunId} />
            <MetricRow label="Review Action" value={model.summaryInvocationDetail.reviewActionId} />
            <MetricRow label="Workflow Pack" value={model.summaryInvocationDetail.workflowPack} />
            <MetricRow label="Workflow Run" value={model.summaryInvocationDetail.workflowRunId} />
            <MetricRow label="Artifact Ref" value={model.summaryInvocationDetail.artifactRef} />
            <MetricRow label="Requested By" value={model.summaryInvocationDetail.requestedBy} />
            <MetricRow label="Policy" value={model.summaryInvocationDetail.policy} />
            <MetricRow label="Source Refs" value={model.summaryInvocationDetail.sourceRefs} />
            <MetricRow
              label="Reason Codes"
              value={formatPmQualityReasonCodeList(model.summaryInvocationDetail.reasonCodes)}
            />
            <MetricRow label="Content Hash" value={model.summaryInvocationDetail.contentHash} />
            <MetricRow label="Text Boundary" value={model.summaryInvocationDetail.textBoundary} />
            <MetricRow
              label="Operating Boundary"
              value={model.summaryInvocationDetail.operatingBoundaries}
            />
          </div>
        </div>

        <AnalyticsTable
          className={styles.table}
          tableMinWidth={780}
          ariaLabel="PM operating quality summary invocations"
          variant="analysis"
          density="compact"
          columns={[
            { key: "summary", label: "Summary Invocation" },
            { key: "scoreRun", label: "Score Run" },
            { key: "reviewAction", label: "Review Action" },
            { key: "state", label: "State" },
            { key: "workflowRun", label: "Workflow Run" },
            { key: "artifact", label: "Artifact" },
            { key: "requestedBy", label: "Requested By" },
            { key: "asOf", label: "As Of" },
            { key: "policy", label: "Policy" },
            { key: "boundary", label: "Boundary" },
          ]}
          rows={model.summaryInvocationRows.map((row) => ({
            key: row.key,
            cells: [
              <strong key={`${row.key}-summary`}>{row.summaryRef}</strong>,
              row.scoreRunId,
              row.reviewActionId,
              <PmOperatingQualityStateBadge key={`${row.key}-state`} state={row.invocationState} />,
              row.workflowRunId,
              row.artifactRef,
              row.requestedBy,
              row.asOfDate,
              row.policy,
              row.textBoundary,
            ],
          }))}
          emptyState={{
            title: "No summary invocations returned",
            body: "Workbench waits for Manage-persisted PM quality summary invocation history through Gateway.",
          }}
        />
      </div>
    </>
  );
}
