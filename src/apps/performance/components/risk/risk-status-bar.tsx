import { SemanticBadge, Text } from "@/design-system";

import type { PerformanceRiskState } from "../../risk-workspace-view-model";

const STATUS_LABELS: Record<PerformanceRiskState, string> = {
  loading: "Loading",
  ready: "Ready",
  partial: "Partial",
  empty: "Empty",
  unavailable: "Unavailable",
  error: "Error",
};

const STATUS_TONES: Record<PerformanceRiskState, "default" | "success" | "warn" | "danger"> = {
  loading: "default",
  ready: "success",
  partial: "warn",
  empty: "default",
  unavailable: "danger",
  error: "danger",
};

export default function RiskStatusBar({
  state,
  warnings,
}: {
  state: PerformanceRiskState;
  warnings: string[];
}) {
  const evidenceLabel = warnings.length ? "Review notes" : "Source-grounded";

  return (
    <div className="performance-risk-status-bar" aria-label="Risk mode status">
      <div className="performance-risk-status-summary">
        <SemanticBadge tone={STATUS_TONES[state]} emphasis="strong">
          {STATUS_LABELS[state]}
        </SemanticBadge>
        <div className="performance-risk-status-metadata" aria-label="Risk mode metadata">
          <div className="performance-risk-status-metadata-item">
            <Text variant="label">Input mode</Text>
            <Text variant="metadata">Stateful only</Text>
          </div>
          <div className="performance-risk-status-metadata-item">
            <Text variant="label">Evidence</Text>
            <Text variant="metadata">{evidenceLabel}</Text>
          </div>
        </div>
      </div>
      <Text variant="secondary" className="performance-risk-status-note">
        Gateway Risk BFF contract. No stateless risk execution is surfaced in Workbench.
      </Text>
    </div>
  );
}
