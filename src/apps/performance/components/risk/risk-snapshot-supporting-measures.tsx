import { Text } from "@/design-system";

import type { PerformanceRiskMetricCard } from "../../risk-workspace-view-model";
import RiskDetailSection from "./risk-detail-section";

export default function RiskSnapshotSupportingMeasures({
  metrics,
}: {
  metrics: PerformanceRiskMetricCard[];
}) {
  if (!metrics.length) {
    return null;
  }

  return (
    <RiskDetailSection
      title="Supporting risk measures"
      ariaLabel="Risk snapshot supporting risk measures"
      className="performance-risk-supporting-detail"
    >
      <div
        className="performance-risk-secondary-metrics performance-risk-snapshot-supporting-grid"
        aria-label="Risk snapshot supporting measures"
      >
        {metrics.map((metric) => (
          <div key={metric.key} className="performance-risk-secondary-metric">
            <div className="performance-risk-secondary-metric-copy">
              <Text variant="label">{metric.label}</Text>
              <Text variant="metadata">{metric.support}</Text>
            </div>
            <Text variant="cardTitle" className="performance-risk-secondary-metric-value">
              {metric.value}
            </Text>
          </div>
        ))}
      </div>
    </RiskDetailSection>
  );
}
