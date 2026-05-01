import { SemanticBadge } from "@/design-system";

import type { PerformanceRiskState } from "../../risk-workspace-view-model";

const STATUS_LABELS: Record<PerformanceRiskState, string> = {
  loading: "Loading",
  ready: "Ready",
  partial: "Partial",
  empty: "Empty",
  permission_blocked: "Access Restricted",
  unavailable: "Unavailable",
  error: "Error",
};

const STATUS_TONES: Record<PerformanceRiskState, "default" | "success" | "warn" | "danger"> = {
  loading: "default",
  ready: "success",
  partial: "warn",
  empty: "default",
  permission_blocked: "danger",
  unavailable: "danger",
  error: "danger",
};

export default function RiskStatusBar({
  state,
}: {
  state: PerformanceRiskState;
}) {
  return (
    <div className="performance-risk-status-bar" aria-label="Risk mode status">
      <SemanticBadge tone={STATUS_TONES[state]} emphasis="strong">
        {STATUS_LABELS[state]}
      </SemanticBadge>
    </div>
  );
}
