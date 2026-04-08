import { Text } from "@/design-system";

import type { PerformanceRiskViewModel } from "../../risk-workspace-view-model";
import RiskContextList from "./risk-context-list";
import RiskDetailSection from "./risk-detail-section";
import RiskExecutiveSummary from "./risk-executive-summary";
import RiskHeadlineMetricGrid from "./risk-headline-metric-grid";
import RiskModuleShell from "./risk-module-shell";

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
    <RiskModuleShell
      title="Risk Snapshot"
      subtitle="Core realized risk measures, benchmark-relative posture, and observation context."
      className="performance-risk-snapshot-panel"
      businessReading={
        viewModel.snapshotExecutiveSummary ? (
          <RiskExecutiveSummary
            summary={viewModel.snapshotExecutiveSummary}
            ariaLabel="Risk snapshot business reading"
          />
        ) : null
      }
      headlineMetrics={
        <RiskHeadlineMetricGrid
          ariaLabel="Risk snapshot headline metrics"
          metrics={primaryMetrics}
        />
      }
      detail={
        secondaryMetrics.length ? (
          <RiskDetailSection
            title="Supporting measures"
            ariaLabel="Risk snapshot detail"
            className="performance-risk-supporting-detail"
          >
            <div
              className="performance-risk-secondary-metrics"
              aria-label="Risk snapshot supporting measures"
            >
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
          </RiskDetailSection>
        ) : null
      }
      context={
        <RiskContextList
          rows={viewModel.snapshotContextRows}
          ariaLabel="Risk snapshot context"
          title="Context and methodology"
        />
      }
    />
  );
}
