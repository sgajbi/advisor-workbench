"use client";

import { MetricRow, Text } from "@/design-system";
import type { PmOperatingQualityPanelModel } from "@/features/workbench/pm-operating-quality-view-model";

type Props = {
  model: PmOperatingQualityPanelModel;
};

export default function PmOperatingQualityGovernanceCard({ model }: Props) {
  return (
    <aside className="pm-quality-governance-card">
      <Text as="h3" variant="subsectionTitle">
        Governance Posture
      </Text>
      <div className="pm-quality-governance-stack">
        <MetricRow label="Forbidden Uses" value={model.forbiddenUsePosture} />
        <MetricRow label="Score Preview Readiness" value={model.scoreRunPreviewReadiness} />
        <MetricRow label="Summary Readiness" value={model.summaryRequestReadiness} />
        <MetricRow label="Preview Readiness" value={model.fairnessPreviewReadiness} />
        <MetricRow label="Source Segments" value={String(model.fairnessSegmentRequests.length)} />
        <MetricRow label="Persisted Analyses" value={String(model.fairnessAnalysisRows.length)} />
        <MetricRow label="Fairness Spread" value={model.fairnessSpread} />
        <MetricRow label="Blocked Actions" value={model.blockedActionPosture} />
        <MetricRow label="Policy Versions" value={String(model.policyRows.length)} />
        <Text variant="secondary">
          Workbench preserves Gateway, Manage, and review-gated AI evidence only. It does not rank
          PMs, calculate PM quality, construct prompts, approve trades, create HR or compensation
          decisions, operate OMS workflows, or contact clients.
        </Text>
      </div>
    </aside>
  );
}
