import type { PerformanceAdvisorBriefMetric } from "../../advisor-brief-view-model";
import type { PerformanceWorkspaceMode } from "../performance-workspace-mode-switch";

import MetricEvidenceCard from "./metric-evidence-card";

export default function SourceMetricPanel({
  metrics,
  onSelectMode,
}: {
  metrics: PerformanceAdvisorBriefMetric[];
  onSelectMode: (mode: PerformanceWorkspaceMode) => void;
}) {
  return (
    <section className="performance-advisor-brief-section" aria-label="Source Metrics">
      <div className="performance-advisor-brief-section-heading">
        <h3>Source Metrics</h3>
        <p className="performance-advisor-brief-section-note">
          Current performance measures used to support the brief.
        </p>
      </div>
      <div className="performance-advisor-brief-metric-panel">
        {metrics.map((metric) => (
          <MetricEvidenceCard
            key={metric.label}
            metric={metric}
            onSelectMode={onSelectMode}
          />
        ))}
      </div>
    </section>
  );
}

