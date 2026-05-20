"use client";

import { AnalyticsTable, MetricRow, Text } from "@/design-system";
import PmOperatingQualityStateBadge from "@/features/workbench/components/pm-operating-quality-state-badge";
import { formatPmQualityReasonCodeList } from "@/features/workbench/pm-operating-quality-panel-helpers";
import type { PmOperatingQualityPanelModel } from "@/features/workbench/pm-operating-quality-view-model";

type Props = {
  model: PmOperatingQualityPanelModel;
};

export default function PmOperatingQualityReviewActionsCard({ model }: Props) {
  const hasDetail = model.reviewActionDetail.reviewActionId !== "N/A";

  return (
    <div className="pm-quality-review-action-grid">
      <div className="pm-quality-review-action-detail">
        <div className="pm-quality-card-header">
          <Text as="h3" variant="subsectionTitle">
            Supervisory Review Action Detail
          </Text>
          <PmOperatingQualityStateBadge
            state={hasDetail ? model.reviewActionDetail.actionState : "PENDING"}
            label={hasDetail ? undefined : "No detail"}
          />
        </div>
        <div aria-label="PM operating quality supervisory review-action posture">
          <MetricRow
            label="Gateway Read State"
            value={
              hasDetail
                ? "Review action returned by Gateway"
                : "Awaiting Manage review-action detail"
            }
          />
          <MetricRow label="Review Action" value={model.reviewActionDetail.reviewActionRef} />
          <MetricRow label="Target" value={model.reviewActionDetail.target} />
          <MetricRow label="Action" value={model.reviewActionDetail.actionType} />
          <MetricRow label="Actor" value={model.reviewActionDetail.actorId} />
          <MetricRow label="As Of" value={model.reviewActionDetail.asOfDate} />
          <MetricRow label="Policy" value={model.reviewActionDetail.policy} />
          <MetricRow
            label="Supervisory Rationale"
            value={model.reviewActionDetail.rationale}
          />
          <MetricRow
            label="Reason Codes"
            value={formatPmQualityReasonCodeList(model.reviewActionDetail.reasonCodes)}
          />
          <MetricRow label="Source Refs" value={model.reviewActionDetail.sourceRefs} />
          <MetricRow
            label="Operating Boundary"
            value={model.reviewActionDetail.operatingBoundaries}
          />
        </div>
      </div>

      <AnalyticsTable
        ariaLabel="PM operating quality supervisory review actions"
        variant="analysis"
        density="compact"
        columns={[
          { key: "action", label: "Review Action" },
          { key: "target", label: "Target" },
          { key: "type", label: "Action Type" },
          { key: "state", label: "State" },
          { key: "actor", label: "Actor" },
          { key: "asOf", label: "As Of" },
          { key: "policy", label: "Policy" },
          { key: "source", label: "Source Refs" },
          { key: "reason", label: "Reason" },
        ]}
        rows={model.reviewActionRows.map((row) => ({
          key: row.key,
          cells: [
            <strong key={`${row.key}-action`}>{row.reviewActionRef}</strong>,
            row.target,
            row.actionType,
            <PmOperatingQualityStateBadge key={`${row.key}-state`} state={row.actionState} />,
            row.actorId,
            row.asOfDate,
            row.policy,
            row.sourceRefs,
            formatPmQualityReasonCodeList(row.reasonCodes),
          ],
        }))}
        emptyState={{
          title: "No supervisory review actions returned",
          body: "Workbench waits for Manage-persisted PM quality review actions through Gateway.",
        }}
      />
    </div>
  );
}
