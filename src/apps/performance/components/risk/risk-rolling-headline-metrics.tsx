import type {
  PerformanceRiskMetricCard,
  PerformanceRiskRollingWindow,
} from "../../risk-workspace-view-model";
import { Text } from "@/design-system";

import RiskTermLabel from "./risk-term-label";

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
    <section
      className="performance-risk-headline-section"
      aria-label="Rolling risk headline metrics"
    >
      <div className="performance-risk-metric-strip performance-risk-rolling-headline-grid">
        {metrics.map((metric) => (
          <article
            key={metric.key}
            className="performance-risk-rolling-headline-card"
            aria-label={`${metric.label} headline metric`}
          >
            <div className="performance-risk-rolling-headline-copy">
              {metric.definition ? (
                <RiskTermLabel label={metric.label} definition={metric.definition} />
              ) : (
                <Text variant="label">{metric.label}</Text>
              )}
              <Text variant="metricValue" className="performance-risk-rolling-headline-value">
                {metric.value}
              </Text>
              <Text variant="body" className="performance-risk-rolling-headline-support">
                {metric.support}
              </Text>
              {showMetadata && metric.metadata ? (
                <Text variant="metadata" className="performance-risk-rolling-headline-metadata">
                  {metric.metadata}
                </Text>
              ) : null}
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
