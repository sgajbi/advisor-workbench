"use client";

import { AnalyticsTable } from "@/design-system";
import styles from "@/features/workbench/components/pm-operating-quality.module.css";
import PmOperatingQualityStateBadge from "@/features/workbench/components/pm-operating-quality-state-badge";
import { formatPmQualityReasonCodeList } from "@/features/workbench/pm-operating-quality-panel-helpers";
import type { PmOperatingQualityPanelModel } from "@/features/workbench/pm-operating-quality-view-model";

type Props = {
  model: PmOperatingQualityPanelModel;
};

export default function PmOperatingQualityPolicyCard({ model }: Props) {
  return (
    <AnalyticsTable
      className={styles.table}
      tableMinWidth={780}
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
          <PmOperatingQualityStateBadge key={`${row.key}-state`} state={row.state} />,
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
