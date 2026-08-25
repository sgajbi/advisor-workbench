"use client";

import { AnalyticsTable, ScreenStatePanel, SemanticBadge } from "@/design-system";
import DpmWaveStateBadge from "@/features/workbench/components/dpm-wave-state-badge";
import type {
  DpmCampaignDefinitionRow,
  DpmCampaignLifecycleEventRow,
} from "@/features/workbench/dpm-wave-command-center-view-model";
import { MANAGE_REBALANCE_LABELS } from "@/features/workbench/manage-terminology";
import { formatBusinessActorEvidence } from "@/features/workbench/manage-actor-presentation";

type Props = {
  rows: DpmCampaignLifecycleEventRow[];
  selectedCampaign: DpmCampaignDefinitionRow | null;
  error?: string | null;
};

export default function DpmCampaignLifecycleEvidenceCard({
  rows,
  selectedCampaign,
  error,
}: Props) {
  return (
    <div className="rebalance-campaign-evidence" aria-labelledby="campaign-lifecycle-title">
      <div className="rebalance-table-heading">
        <div>
          <h4 id="campaign-lifecycle-title">
            {MANAGE_REBALANCE_LABELS.campaignLifecycleEvidence}
          </h4>
          <p>
            {selectedCampaign
              ? `${selectedCampaign.displayName} version ${selectedCampaign.campaignVersion}`
              : "Select a campaign definition to inspect lifecycle evidence."}
          </p>
        </div>
        <SemanticBadge tone={error ? "warn" : rows.length ? "success" : "default"}>
          {error ? "Needs attention" : rows.length ? "Loaded" : "Not loaded"}
        </SemanticBadge>
      </div>
      {error ? (
        <ScreenStatePanel
          kind="partial"
          surface="portfolio"
          title="Campaign lifecycle evidence needs attention"
          body={error}
        />
      ) : null}
      <AnalyticsTable
        ariaLabel="Rebalance campaign lifecycle evidence"
        variant="portfolio"
        density="compact"
        columns={[
          { key: "event", label: "Lifecycle event" },
          { key: "occurred", label: "Recorded" },
          { key: "actor", label: "Recorded by" },
          { key: "wave", label: MANAGE_REBALANCE_LABELS.rebalanceWave },
          { key: "reviewDate", label: MANAGE_REBALANCE_LABELS.asOfDate },
          { key: "status", label: "Status" },
          { key: "reason", label: "Reason" },
          { key: "correlation", label: MANAGE_REBALANCE_LABELS.supportReference },
          { key: "idempotency", label: MANAGE_REBALANCE_LABELS.replayKey },
        ]}
        rows={rows.map((row) => ({
          key: row.key,
          cells: [
            row.eventType,
            row.occurredAt,
            formatBusinessActorEvidence(row.actor),
            row.waveId,
            row.requestedAsOfDate,
            <DpmWaveStateBadge key={`${row.key}-status`} state={row.status} />,
            row.reason,
            row.correlationId,
            row.idempotencyKey,
          ],
        }))}
        emptyState={{
          title: "No lifecycle evidence loaded",
          body: "Open campaign evidence to review Manage-recorded lifecycle events.",
        }}
      />
    </div>
  );
}
