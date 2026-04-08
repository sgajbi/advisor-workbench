import type {
  PerformanceRiskMetricCard,
  PerformanceRiskRollingWindow,
} from "../../risk-workspace-view-model";
import RiskHeadlineMetricGrid from "./risk-headline-metric-grid";

const PRIORITY_METRICS = ["Volatility", "Tracking Error", "Beta", "Max Drawdown"];

export function selectRollingHeadlineMetrics(
  window: PerformanceRiskRollingWindow | null
): PerformanceRiskMetricCard[] {
  return (window?.headlineMetrics ?? []).filter((metric) => PRIORITY_METRICS.includes(metric.label));
}

export default function RiskRollingHeadlineMetrics({
  window,
  showMetadata = true,
}: {
  window: PerformanceRiskRollingWindow | null;
  showMetadata?: boolean;
}) {
  const metrics = selectRollingHeadlineMetrics(window);
  if (!metrics.length) {
    return null;
  }

  return (
    <RiskHeadlineMetricGrid
      ariaLabel="Rolling risk headline metrics"
      metrics={metrics}
      className="performance-risk-rolling-headline-grid"
      itemClassName="performance-risk-rolling-headline-card"
      supportMode="hidden"
      metadataMode={showMetadata ? "full" : "hidden"}
    />
  );
}
