"use client";

import { AnalyticsTable, ScreenStatePanel, SemanticBadge } from "@/design-system";
import DpmWaveStateBadge from "@/features/workbench/components/dpm-wave-state-badge";
import type {
  DpmCampaignDefinitionRow,
  DpmCampaignLifecycleEventRow,
} from "@/features/workbench/dpm-wave-command-center-view-model";

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
          <h4 id="campaign-lifecycle-title">Campaign Lifecycle Evidence</h4>
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
        ariaLabel="DPM campaign lifecycle evidence"
        variant="portfolio"
        density="compact"
        columns={[
          { key: "event", label: "Lifecycle Event" },
          { key: "occurred", label: "Recorded" },
          { key: "actor", label: "Recorded By" },
          { key: "wave", label: "Wave" },
          { key: "reviewDate", label: "Review Date" },
          { key: "status", label: "Status" },
          { key: "reason", label: "Reason" },
          { key: "correlation", label: "Correlation" },
          { key: "idempotency", label: "Idempotency" },
        ]}
        rows={rows.map((row) => ({
          key: row.key,
          cells: [
            row.eventType,
            row.occurredAt,
            row.actor,
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
