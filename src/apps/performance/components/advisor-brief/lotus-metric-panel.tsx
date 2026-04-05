import type { PerformanceAdvisorBriefMetric } from "../../advisor-brief-view-model";
import type { PerformanceWorkspaceMode } from "../performance-workspace-mode-switch";

export default function LotusMetricPanel({
  metrics,
  onSelectMode,
}: {
  metrics: PerformanceAdvisorBriefMetric[];
  onSelectMode: (mode: PerformanceWorkspaceMode) => void;
}) {
  return (
    <section className="lotus-metric-panel performance-advisor-brief-section" aria-label="Source Metrics">
      <div className="performance-advisor-brief-section-heading">
        <h3>Source Metrics</h3>
        <p className="performance-advisor-brief-section-note">
          Current performance measures supporting the brief.
        </p>
      </div>
      <div className="performance-advisor-brief-metric-panel">
        {metrics.map((metric) => (
          <button
            key={metric.label}
            type="button"
            className="lotus-metric-panel-item performance-advisor-brief-metric-card"
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
        ))}
      </div>
    </section>
  );
}
