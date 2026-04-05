import type { PerformanceAdvisorBriefMetric } from "../../advisor-brief-view-model";
import type { PerformanceWorkspaceMode } from "../performance-workspace-mode-switch";

export default function MetricEvidenceCard({
  metric,
  onSelectMode,
}: {
  metric: PerformanceAdvisorBriefMetric;
  onSelectMode: (mode: PerformanceWorkspaceMode) => void;
}) {
  return (
    <button
      type="button"
      className="performance-advisor-brief-metric-card"
      onClick={() => onSelectMode(metric.targetMode)}
    >
      <span className="performance-advisor-brief-metric-label">{metric.label}</span>
      <div className="performance-advisor-brief-metric-row">
        <strong className="performance-advisor-brief-metric-value">{metric.value}</strong>
        <span className="performance-advisor-brief-metric-arrow" aria-hidden="true">
          →
        </span>
      </div>
      <span className="performance-advisor-brief-metric-support">{metric.supportingText}</span>
    </button>
  );
}
