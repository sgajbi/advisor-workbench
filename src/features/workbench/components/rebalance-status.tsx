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
  const recentRuns = props.snapshot?.recent_runs ?? [];
  const failedRunCount = recentRuns.filter((run) => isFailureStatus(run.status)).length;
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
      <div className="rebalance-operations-dashboard" aria-label="DPM operations dashboard">
        <div className="rebalance-operations-dashboard-summary">
          <span>
            <strong>{recentRuns.length}</strong>
            <Text as="span" variant="bodySmall" className="muted">
              Recent runs
            </Text>
          </span>
          <span>
            <strong>{failedRunCount}</strong>
            <Text as="span" variant="bodySmall" className="muted">
              Run issues
            </Text>
          </span>
        </div>
        {recentRuns.length > 0 ? (
          <div className="rebalance-operations-run-list">
            {recentRuns.map((run, index) => (
              <div
                className="rebalance-operations-run-row"
                key={`${run.rebalance_run_id ?? "run"}-${index}`}
              >
                <div>
                  <Text as="span" variant="bodySmall" className="rebalance-operations-run-id">
                    {run.rebalance_run_id ?? "N/A"}
                  </Text>
                  <Text as="span" variant="bodySmall" className="muted">
                    {run.created_at_utc ?? "Timestamp N/A"}
                  </Text>
                </div>
                <div className="rebalance-operations-run-state">
                  <SemanticBadge tone={badgeTone(run.status)}>{formatToken(run.status)}</SemanticBadge>
                  {run.workflow_state ? (
                    <SemanticBadge tone={badgeTone(run.workflow_state)}>
                      {formatToken(run.workflow_state)}
                    </SemanticBadge>
                  ) : null}
                  {run.error_code ? (
                    <SemanticBadge tone="danger">{formatToken(run.error_code)}</SemanticBadge>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <Text variant="secondary" className="muted">
            No recent manage rebalance runs were returned by Gateway for this portfolio.
          </Text>
        )}
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

function isFailureStatus(state: string): boolean {
  const normalized = state.toLowerCase();
  return ["failed", "error", "blocked", "rejected"].some((token) => normalized.includes(token));
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
    .map((segment) => {
      const upper = segment.toUpperCase();
      if (["DPM", "PM", "CIO", "SLA", "SLO", "ID", "API"].includes(upper)) {
        return upper;
      }
      return segment.charAt(0).toUpperCase() + segment.slice(1).toLowerCase();
    })
    .join(" ");
}
