"use client";

import { AnalyticsTable, ScreenStatePanel, SemanticBadge } from "@/design-system";
import DpmWaveStateBadge from "@/features/workbench/components/dpm-wave-state-badge";
import type {
  DpmCampaignWorkflowEvidenceRow,
  DpmCampaignWorkflowSummaryRow,
} from "@/features/workbench/dpm-wave-command-center-view-model";

type Props = {
  summaryRows: DpmCampaignWorkflowSummaryRow[];
  evidenceRows: DpmCampaignWorkflowEvidenceRow[];
  error?: string | null;
};

export default function DpmCampaignWorkflowAuditCard({
  summaryRows,
  evidenceRows,
  error,
}: Props) {
  return (
    <div className="rebalance-campaign-evidence" aria-labelledby="campaign-workflow-audit-title">
      <div className="rebalance-table-heading">
        <div>
          <h4 id="campaign-workflow-audit-title">Campaign Workflow Audit</h4>
          <p>Manage-owned operating queue, approval, assignment, and maker-checker evidence.</p>
        </div>
        <SemanticBadge tone={error ? "warn" : summaryRows.length || evidenceRows.length ? "success" : "default"}>
          {error ? "Needs attention" : summaryRows.length || evidenceRows.length ? "Loaded" : "Not loaded"}
        </SemanticBadge>
      </div>
      {error ? (
        <ScreenStatePanel
          kind="partial"
          surface="portfolio"
          title="Campaign workflow evidence needs attention"
          body={error}
        />
      ) : null}
      <AnalyticsTable
        ariaLabel="DPM campaign workflow audit summary"
        variant="portfolio"
        density="compact"
        columns={[
          { key: "surface", label: "Surface" },
          { key: "state", label: "State" },
          { key: "items", label: "Items", align: "right" },
          { key: "page", label: "Page" },
          { key: "sources", label: "Source Refs", align: "right" },
          { key: "reasons", label: "Reason Codes" },
          { key: "hash", label: "Content Hash" },
          { key: "boundaries", label: "Operating Boundaries" },
        ]}
        rows={summaryRows.map((row) => ({
          key: row.key,
          cells: [
            row.surface,
            <DpmWaveStateBadge key={`${row.key}-state`} state={row.state} />,
            row.itemCount,
            row.page,
            row.sourceRefs,
            row.reasonCodes,
            row.contentHash,
            row.operatingBoundaries,
          ],
        }))}
        emptyState={{
          title: "No campaign workflow summary loaded",
          body: "Gateway has not returned Manage campaign workflow audit summary evidence.",
        }}
      />
      <AnalyticsTable
        ariaLabel="DPM campaign workflow evidence"
        variant="portfolio"
        density="compact"
        columns={[
          { key: "type", label: "Evidence Type" },
          { key: "ref", label: "Reference" },
          { key: "status", label: "Status" },
          { key: "actor", label: "Actor" },
          { key: "recorded", label: "Recorded" },
          { key: "reasons", label: "Reason Codes" },
          { key: "sources", label: "Source Refs", align: "right" },
          { key: "hash", label: "Content Hash" },
          { key: "transition", label: "Task Transition" },
          { key: "boundaries", label: "Boundaries" },
        ]}
        rows={evidenceRows.map((row) => ({
          key: row.key,
          cells: [
            row.evidenceType,
            row.evidenceRef,
            <DpmWaveStateBadge key={`${row.key}-status`} state={row.status} />,
            row.actor,
            row.recordedAt,
            row.reasonCodes,
            row.sourceRefs,
            row.contentHash,
            row.transitionPosture,
            row.operatingBoundaries,
          ],
        }))}
        emptyState={{
          title: "No campaign workflow evidence loaded",
          body: "Approval decisions, assignment actions, assignment tasks, and maker-checker controls remain source-owned in Manage.",
        }}
      />
    </div>
  );
}
