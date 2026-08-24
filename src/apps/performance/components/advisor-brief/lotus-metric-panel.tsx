import { Text } from "@/design-system";

import type { PerformanceAdvisorBriefMetric } from "../../advisor-brief-view-model";
import type { PerformanceWorkspaceMode } from "../../performance-workspace-modes";
import PerformanceWorkspaceSection from "../performance-workspace-section";

export default function LotusMetricPanel({
  metrics,
  onSelectMode,
}: {
  metrics: PerformanceAdvisorBriefMetric[];
  onSelectMode: (mode: PerformanceWorkspaceMode) => void;
}) {
  return (
    <PerformanceWorkspaceSection
      ariaLabel="Source metrics"
      className="lotus-metric-panel performance-advisor-brief-section"
      headingClassName="performance-advisor-brief-section-heading"
      title="Key source metrics"
      description="Current performance measures supporting the brief and drill-down decisions."
    >
      <div className="performance-advisor-brief-metric-panel">
        {metrics.map((metric) => (
          <button
            key={metric.label}
            type="button"
            className="lotus-metric-panel-item performance-advisor-brief-metric-card"
            onClick={() => onSelectMode(metric.targetMode)}
          >
            <Text as="span" variant="dataLabel" className="performance-advisor-brief-metric-label">
              {metric.label}
            </Text>
            <div className="performance-advisor-brief-metric-row">
              <Text as="strong" variant="metricValueL" className="performance-advisor-brief-metric-value">
                {metric.value}
              </Text>
              <span className="performance-advisor-brief-metric-arrow" aria-hidden="true">
                →
              </span>
            </div>
            <Text as="span" variant="bodySmall" className="performance-advisor-brief-metric-support">
              {metric.supportingText}
            </Text>
          </button>
        ))}
      </div>
    </PerformanceWorkspaceSection>
  );
}
