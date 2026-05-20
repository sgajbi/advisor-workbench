"use client";

import { AnalyticsTable, MetricRow, SemanticBadge, Text } from "@/design-system";
import { formatPmQualityReasonCodeList } from "@/features/workbench/pm-operating-quality-panel-helpers";
import type { PmOperatingQualityPanelModel } from "@/features/workbench/pm-operating-quality-view-model";
import {
  businessStateLabel,
  toneForState,
} from "@/features/workbench/manage-workspace-view-model";

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
          <SemanticBadge tone={toneForState(hasDetail ? model.reviewActionDetail.actionState : "PENDING")}>
            {hasDetail ? businessStateLabel(model.reviewActionDetail.actionState) : "No detail"}
          </SemanticBadge>
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
            <SemanticBadge key={`${row.key}-state`} tone={toneForState(row.actionState)}>
              {businessStateLabel(row.actionState)}
            </SemanticBadge>,
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
