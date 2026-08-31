import type { PerformanceAdvisorBriefAction } from "../../advisor-brief-view-model";
import {
  getPerformanceWorkspaceModeLabel,
  type PerformanceWorkspaceMode,
} from "../../performance-workspace-modes";
import { cx } from "@/design-system/utils/cx";
import styles from "./performance-advisor-brief.module.css";

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
          ? styles.workflowList
          : styles.drilldownList
      }
    >
      {actions.map((action) => (
        <button
          key={`${variant}-${action.targetMode}-${action.label}`}
          type="button"
          className={
            variant === "workflow"
              ? cx(
                  "lotus-drilldown-item",
                  styles.workflowAction
                )
              : cx(
                  "lotus-drilldown-item",
                  styles.drilldownAction
                )
          }
          onClick={() => onSelectMode(action.targetMode)}
        >
          <span className={styles.actionCopy}>
            <span className={styles.actionTitle}>
              {resolveActionLabel(action)}
            </span>
            <span className={styles.actionMeta}>
              {variant === "workflow" ? "Adviser workflow" : "Open analysis surface"}
            </span>
          </span>
          <span
            aria-hidden="true"
            className={styles.actionChevron}
          >
            →
          </span>
        </button>
      ))}
    </div>
  );
}
