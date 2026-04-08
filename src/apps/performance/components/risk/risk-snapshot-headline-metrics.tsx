import type { PerformanceRiskMetricCard } from "../../risk-workspace-view-model";
import RiskHeadlineMetricGrid from "./risk-headline-metric-grid";

export default function RiskSnapshotHeadlineMetrics({
  metrics,
}: {
  metrics: PerformanceRiskMetricCard[];
}) {
  if (!metrics.length) {
    return null;
  }

  return (
    <RiskHeadlineMetricGrid
      ariaLabel="Risk snapshot headline metrics"
      metrics={metrics}
      className="performance-risk-snapshot-headline-grid"
      itemClassName="performance-risk-snapshot-headline-card"
      supportMode="hidden"
    />
  );
}
