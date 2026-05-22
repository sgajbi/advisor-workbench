"use client";

import { AnalyticsTable, MetricRow, Text } from "@/design-system";
import PmOperatingQualityStateBadge from "@/features/workbench/components/pm-operating-quality-state-badge";
import { formatPmQualityReasonCodeList } from "@/features/workbench/pm-operating-quality-panel-helpers";
import type { PmOperatingQualityPanelModel } from "@/features/workbench/pm-operating-quality-view-model";

type Props = {
  model: PmOperatingQualityPanelModel;
};

export default function PmOperatingQualitySummaryInvocationsCard({ model }: Props) {
  const hasDetail = model.summaryInvocationDetail.summaryInvocationId !== "N/A";

  return (
    <div className="pm-quality-review-action-grid">
      <div className="pm-quality-review-action-detail">
        <div className="pm-quality-card-header">
          <Text as="h3" variant="subsectionTitle">
            Summary Invocation Detail
          </Text>
          <PmOperatingQualityStateBadge
            state={hasDetail ? model.summaryInvocationDetail.invocationState : "PENDING"}
            label={hasDetail ? undefined : "No detail"}
          />
        </div>
        <div aria-label="PM operating quality summary-invocation posture">
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
  );
}
