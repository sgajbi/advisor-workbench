"use client";

import { MetricRow, ScreenStatePanel, SemanticBadge } from "@/design-system";
import DpmWaveStateBadge from "@/features/workbench/components/dpm-wave-state-badge";
import type {
  DpmCampaignDefinitionRow,
} from "@/features/workbench/dpm-wave-command-center-view-model";

type Props = {
  selectedCampaign: DpmCampaignDefinitionRow | null;
};

export default function DpmCampaignCandidateSourceCard({ selectedCampaign }: Props) {
  const readiness = selectedCampaign?.candidateSourceReadiness ?? "UNKNOWN";

  return (
    <div className="rebalance-campaign-evidence" aria-labelledby="campaign-candidate-source-title">
      <div className="rebalance-table-heading">
        <div>
          <h4 id="campaign-candidate-source-title">Candidate Source Review</h4>
          <p>Source-backed campaign candidate posture for front-office review.</p>
        </div>
        <SemanticBadge tone={selectedCampaign ? candidateSourceTone(readiness) : "default"}>
          {selectedCampaign ? "Loaded" : "Select campaign"}
        </SemanticBadge>
      </div>
      {!selectedCampaign ? (
        <ScreenStatePanel
          kind="empty"
          surface="portfolio"
          title="Select a campaign definition"
          body="Open a Manage campaign definition to review candidate source readiness."
        />
      ) : (
        <div className="rebalance-campaign-workflow-command-grid">
          <MetricRow label="Source Product" value={selectedCampaign.candidateSourceProduct} />
          <MetricRow
            label="Readiness"
            value={<DpmWaveStateBadge state={selectedCampaign.candidateSourceReadiness} />}
          />
          <MetricRow label="Candidates" value={selectedCampaign.candidateCount} />
          <MetricRow label="Eligible" value={selectedCampaign.eligibleCandidateCount} />
          <MetricRow label="Filters" value={selectedCampaign.candidateFilters} />
          <MetricRow label="Warnings" value={selectedCampaign.candidateWarnings} />
          <MetricRow label="Lineage Refs" value={selectedCampaign.lineageRefCount} />
          <MetricRow label="Next Action" value={selectedCampaign.nextAction} />
          <MetricRow label="Boundaries" value={selectedCampaign.operatingBoundaries} />
        </div>
      )}
    </div>
  );
}

function candidateSourceTone(readiness: string): "success" | "warn" | "danger" | "default" {
  if (readiness === "READY") {
    return "success";
  }
  if (readiness === "BLOCKED") {
    return "danger";
  }
  if (["DEGRADED", "PARTIAL", "INCOMPLETE", "UNKNOWN"].includes(readiness)) {
    return "warn";
  }
  return "default";
}
