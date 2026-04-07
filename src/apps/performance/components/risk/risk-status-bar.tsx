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
  return (
    <div className="performance-risk-status-bar" aria-label="Risk mode status">
      <div className="performance-risk-status-items">
        <SemanticBadge tone={STATUS_TONES[state]} emphasis="strong">
          {STATUS_LABELS[state]}
        </SemanticBadge>
        <SemanticBadge>Stateful only</SemanticBadge>
        <SemanticBadge tone={warnings.length ? "warn" : "success"}>
          {warnings.length ? "Review notes" : "Source-grounded"}
        </SemanticBadge>
      </div>
      <Text variant="metadata" className="performance-risk-status-note">
        Gateway Risk BFF contract. No stateless risk execution is surfaced in Workbench.
      </Text>
    </div>
  );
}
