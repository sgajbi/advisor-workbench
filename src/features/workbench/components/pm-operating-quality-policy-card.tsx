"use client";

import { AnalyticsTable, SemanticBadge } from "@/design-system";
import { formatPmQualityReasonCodeList } from "@/features/workbench/pm-operating-quality-panel-helpers";
import type { PmOperatingQualityPanelModel } from "@/features/workbench/pm-operating-quality-view-model";
import {
  businessStateLabel,
  toneForState,
} from "@/features/workbench/manage-workspace-view-model";

type Props = {
  model: PmOperatingQualityPanelModel;
};

export default function PmOperatingQualityPolicyCard({ model }: Props) {
  return (
    <AnalyticsTable
      ariaLabel="PM operating quality policies"
      variant="analysis"
      density="compact"
      columns={[
        { key: "policy", label: "Policy" },
        { key: "enabled", label: "Enabled" },
        { key: "state", label: "State" },
        { key: "asOf", label: "As Of" },
        { key: "reason", label: "Reason" },
      ]}
      rows={model.policyRows.map((row) => ({
        key: row.key,
        cells: [
          <strong key={`${row.key}-policy`}>{`${row.policyId} / ${row.policyVersion}`}</strong>,
          row.enabled,
          <SemanticBadge key={`${row.key}-state`} tone={toneForState(row.state)}>
            {businessStateLabel(row.state)}
          </SemanticBadge>,
          row.asOfDate,
          formatPmQualityReasonCodeList(row.reasonCodes),
        ],
      }))}
      emptyState={{
        title: "No PM operating quality policy returned",
        body: "A Manage-owned policy is required before score-run evidence can be used.",
      }}
    />
  );
}
