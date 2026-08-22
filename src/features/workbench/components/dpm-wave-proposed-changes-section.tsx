"use client";

import { AnalyticsTable } from "@/design-system";
import DpmWaveStateBadge from "@/features/workbench/components/dpm-wave-state-badge";
import {
  type DpmWaveProposedChangeRow,
} from "@/features/workbench/dpm-wave-command-center-panel-helpers";

type Props = {
  rows: DpmWaveProposedChangeRow[];
  selectedWaveId: string | null;
  pendingAction?: string | null;
  onLoadProposedChanges: () => void;
};

export default function DpmWaveProposedChangesSection({
  rows,
  selectedWaveId,
  pendingAction = null,
  onLoadProposedChanges,
}: Props) {
  return (
    <section className="rebalance-proposed-card" aria-labelledby="rebalance-proposed-title">
      <div className="rebalance-table-heading">
        <h3 id="rebalance-proposed-title">Proposed Changes</h3>
        <div>
          <button
            type="button"
            onClick={onLoadProposedChanges}
            disabled={!selectedWaveId || Boolean(pendingAction)}
          >
            Load Changes
          </button>
        </div>
      </div>
      <AnalyticsTable
        ariaLabel="Proposed rebalance changes"
        variant="portfolio"
        density="compact"
        columns={[
          { key: "security", label: "Security" },
          { key: "action", label: "Action" },
          { key: "value", label: "Est. Value", align: "right" },
          { key: "reason", label: "Reason" },
          { key: "impact", label: "Mandate Impact" },
          { key: "status", label: "Status" },
        ]}
        rows={rows.map((row) => ({
          key: row.key,
          cells: [
            row.security,
            <span className={`rebalance-action rebalance-action-${row.actionTone}`} key={`${row.key}-action`}>
              {row.action}
            </span>,
            row.estimatedValue,
            row.reason,
            row.mandateImpact,
            <DpmWaveStateBadge key={`${row.key}-status`} state={row.status} />,
          ],
        }))}
        emptyState={{
          title: "No proposed changes loaded",
          body: "Load proposed changes after selecting a rebalance proposal.",
        }}
      />
    </section>
  );
}
