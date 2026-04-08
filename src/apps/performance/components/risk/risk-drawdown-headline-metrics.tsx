import type { PerformanceRiskMetricCard } from "../../risk-workspace-view-model";
import RiskHeadlineMetricGrid from "./risk-headline-metric-grid";

export default function RiskDrawdownHeadlineMetrics({
  metrics,
}: {
  metrics: PerformanceRiskMetricCard[];
}) {
  if (!metrics.length) {
    return null;
  }

  return (
    <RiskHeadlineMetricGrid
      ariaLabel="Risk drawdown headline metrics"
      metrics={metrics}
      className="performance-risk-drawdown-headline-grid"
      itemClassName="performance-risk-drawdown-headline-card"
    />
  );
}
