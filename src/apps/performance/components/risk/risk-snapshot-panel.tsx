import { SectionBlock, Text, WorkbenchSummaryMetricStrip } from "@/design-system";

import type { PerformanceRiskViewModel } from "../../risk-workspace-view-model";
import RiskContextList from "./risk-context-list";
import RiskExecutiveSummary from "./risk-executive-summary";

export default function RiskSnapshotPanel({
  viewModel,
}: {
  viewModel: PerformanceRiskViewModel;
}) {
  const primaryMetricKeys = ["VOLATILITY", "TRACKING_ERROR", "INFORMATION_RATIO", "BETA", "SHARPE"];
  const primaryMetrics = viewModel.snapshotMetrics.filter((metric) =>
    primaryMetricKeys.includes(metric.key)
  );
  const secondaryMetrics = viewModel.snapshotMetrics.filter(
    (metric) => !primaryMetricKeys.includes(metric.key)
  );

  return (
    <SectionBlock
      title="Risk Snapshot"
      subtitle="Core realized risk measures, benchmark-relative posture, and observation context."
      className="performance-risk-panel performance-risk-snapshot-panel"
    >
      {viewModel.snapshotExecutiveSummary ? (
        <RiskExecutiveSummary
          summary={viewModel.snapshotExecutiveSummary}
          ariaLabel="Risk snapshot business reading"
        />
      ) : null}
      <WorkbenchSummaryMetricStrip
        ariaLabel="Risk snapshot headline metrics"
        className="performance-risk-metric-strip"
        items={primaryMetrics.map((metric) => ({
          key: metric.key,
          label: metric.label,
          value: metric.value,
          support: metric.support,
          unavailable: metric.state === "unavailable",
        }))}
      />
      {secondaryMetrics.length ? (
        <div className="performance-risk-secondary-metrics" aria-label="Risk snapshot supporting measures">
          {secondaryMetrics.map((metric) => (
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
      ) : null}
      <RiskContextList rows={viewModel.snapshotContextRows} ariaLabel="Risk snapshot context" />
    </SectionBlock>
  );
}
