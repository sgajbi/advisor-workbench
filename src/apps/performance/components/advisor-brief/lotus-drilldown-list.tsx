import type { PerformanceAdvisorBriefAction } from "../../advisor-brief-view-model";
import {
  getPerformanceWorkspaceModeLabel,
  type PerformanceWorkspaceMode,
} from "../../performance-workspace-modes";

function resolveActionLabel(action: PerformanceAdvisorBriefAction) {
  return action.label || `Open ${getPerformanceWorkspaceModeLabel(action.targetMode)}`;
}

export default function LotusDrilldownList({
  actions,
  onSelectMode,
  variant = "rail",
}: {
  actions: PerformanceAdvisorBriefAction[];
  onSelectMode: (mode: PerformanceWorkspaceMode) => void;
  variant?: "rail" | "workflow";
}) {
  return (
    <div
      className={
        variant === "workflow"
          ? "performance-advisor-brief-workflow-list"
          : "performance-advisor-brief-drilldown-list"
      }
    >
      {actions.map((action) => (
        <button
          key={`${variant}-${action.targetMode}-${action.label}`}
          type="button"
          className={
            variant === "workflow"
              ? "lotus-drilldown-item performance-advisor-brief-workflow-action"
              : "lotus-drilldown-item performance-advisor-brief-drilldown-action"
          }
          onClick={() => onSelectMode(action.targetMode)}
        >
          <span className="performance-advisor-brief-action-copy">
            <span className="performance-advisor-brief-action-title">
              {resolveActionLabel(action)}
            </span>
            <span className="performance-advisor-brief-action-meta">
              {variant === "workflow" ? "Advisor workflow" : "Open analysis surface"}
            </span>
          </span>
          <span aria-hidden="true" className="performance-advisor-brief-action-chevron">
            →
          </span>
        </button>
      ))}
    </div>
  );
}
