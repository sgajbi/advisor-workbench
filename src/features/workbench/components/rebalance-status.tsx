"use client";

import { MetricRow, SectionBlock, SemanticBadge, Text } from "@/design-system";
import type { WorkbenchOverview } from "@/features/workbench/types";

type Props = {
  snapshot: WorkbenchOverview["rebalance_snapshot"];
};

export default function RebalanceStatus(props: Props) {
  const status = props.snapshot?.status ?? "UNKNOWN";
  const supportability = props.snapshot?.supportability ?? null;
  const supportabilityState = supportability?.state ?? "unknown";
  const supportabilityFreshness = supportability?.freshness_bucket ?? "unknown";
  const supportabilityReason = supportability?.reason ?? null;
  const lastRunId = props.snapshot?.last_rebalance_run_id ?? null;
  const lastRunAt = props.snapshot?.last_run_at_utc ?? null;
  const hasSourceContext = supportability !== null;
  const tone = badgeTone(status);
  const missingEvidenceValue = hasSourceContext ? 0 : "N/A";

  return (
    <SectionBlock title="Rebalance Status" className="rebalance-status-panel">
      <MetricRow
        label="Status"
        value={<SemanticBadge tone={tone}>{formatToken(status)}</SemanticBadge>}
      />
      <MetricRow
        label="Source Support"
        value={
          <SemanticBadge tone={badgeTone(supportabilityState)}>
            {formatToken(supportabilityState)}
          </SemanticBadge>
        }
      />
      <MetricRow
        label="Freshness"
        value={
          <SemanticBadge tone={freshnessTone(supportabilityFreshness)}>
            {formatToken(supportabilityFreshness)}
          </SemanticBadge>
        }
      />
      <div className="rebalance-status-detail-grid" aria-label="Rebalance execution evidence">
        <span>
          <strong>{supportability?.run_count ?? missingEvidenceValue}</strong>
          <Text as="span" variant="bodySmall" className="muted">
            Runs
          </Text>
        </span>
        <span>
          <strong>{supportability?.operation_count ?? missingEvidenceValue}</strong>
          <Text as="span" variant="bodySmall" className="muted">
            Operations
          </Text>
        </span>
        <span>
          <strong>{supportability?.workflow_decision_count ?? missingEvidenceValue}</strong>
          <Text as="span" variant="bodySmall" className="muted">
            Decisions
          </Text>
        </span>
      </div>
      <Text variant="secondary" className="muted">
        Last run: {lastRunId ?? "N/A"}
        {lastRunAt ? ` - ${lastRunAt}` : ""}
      </Text>
      <Text variant="secondary" className="muted">
        {hasSourceContext
          ? supportabilityReason ?? "Gateway is preserving manage-owned action-register posture."
          : "Gateway did not return manage action-register supportability for this portfolio."}
      </Text>
    </SectionBlock>
  );
}

function badgeTone(state: string): "default" | "success" | "warn" | "danger" {
  const normalized = state.toLowerCase();
  if (["ready", "healthy", "supported", "fresh"].includes(normalized)) {
    return "success";
  }
  if (
    normalized.includes("review") ||
    ["partial", "degraded", "stale", "unknown"].includes(normalized)
  ) {
    return "warn";
  }
  if (
    ["blocked", "unsupported", "unavailable", "error"].some((token) =>
      normalized.includes(token)
    )
  ) {
    return "danger";
  }
  return "default";
}

function freshnessTone(state: string): "default" | "success" | "warn" | "danger" {
  const normalized = state.toLowerCase();
  if (["fresh", "current"].includes(normalized)) {
    return "success";
  }
  if (["stale", "expired"].includes(normalized)) {
    return "danger";
  }
  if (normalized === "unknown" || normalized === "partial") {
    return "warn";
  }
  return "default";
}

function formatToken(value: string): string {
  return value
    .split(/[_\s-]+/)
    .filter(Boolean)
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1).toLowerCase())
    .join(" ");
}
