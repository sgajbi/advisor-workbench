import type { PerformanceRiskMetricCard } from "../../risk-workspace-view-model";
import RiskDetailSection from "./risk-detail-section";
import RiskMetricCard from "./risk-metric-card";

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
      density="compact"
    >
      <div
        className="performance-risk-secondary-metrics performance-risk-snapshot-supporting-grid"
        aria-label="Risk snapshot supporting measures"
      >
        {metrics.map((metric) => (
          <RiskMetricCard
            key={metric.key}
            label={metric.label}
            value={metric.value}
            support={metric.support}
            density="compact"
            className="performance-risk-secondary-metric"
          />
        ))}
      </div>
    </RiskDetailSection>
  );
}
