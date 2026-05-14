"use client";

import { MetricRow, SectionBlock, SemanticBadge, Text } from "@/design-system";
import {
  businessStateLabel,
  formatBusinessReason,
} from "@/features/workbench/manage-workspace-view-model";
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
        value={<SemanticBadge tone={tone}>{businessStateLabel(status)}</SemanticBadge>}
      />
      <MetricRow
        label="Decision Support"
        value={
          <SemanticBadge tone={badgeTone(supportabilityState)}>
            {businessStateLabel(supportabilityState)}
          </SemanticBadge>
        }
      />
      <MetricRow
        label="Freshness"
        value={
          <SemanticBadge tone={freshnessTone(supportabilityFreshness)}>
            {businessStateLabel(supportabilityFreshness)}
          </SemanticBadge>
        }
      />
      <div className="rebalance-status-detail-grid" aria-label="Rebalance decision evidence">
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
      <div className="rebalance-operations-dashboard" aria-label="Rebalance review activity">
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
                    Review {index + 1}
                  </Text>
                  <Text as="span" variant="bodySmall" className="muted">
                    {run.created_at_utc ?? "Timestamp N/A"}
                  </Text>
                </div>
                <div className="rebalance-operations-run-state">
                  <SemanticBadge tone={badgeTone(run.status)}>{businessStateLabel(run.status)}</SemanticBadge>
                  {run.workflow_state ? (
                    <SemanticBadge tone={badgeTone(run.workflow_state)}>
                      {businessStateLabel(run.workflow_state)}
                    </SemanticBadge>
                  ) : null}
                  {run.error_code ? (
                    <SemanticBadge tone="danger">{formatBusinessReason(run.error_code)}</SemanticBadge>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <Text variant="secondary" className="muted">
            No recent rebalance review activity is available for this portfolio.
          </Text>
        )}
      </div>
      <Text variant="secondary" className="muted">
        Latest assessment: {lastRunAt ?? "Not available"}
      </Text>
      <Text variant="secondary" className="muted">
        {hasSourceContext
          ? formatBusinessReason(supportabilityReason ?? "READY")
          : "Decision support is not available for this portfolio."}
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
