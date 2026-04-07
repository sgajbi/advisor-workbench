import { AnalyticsTable, SectionBlock, WorkbenchSummaryMetricStrip } from "@/design-system";

import type { PerformanceRiskViewModel } from "../../risk-workspace-view-model";

export default function RiskSnapshotPanel({
  viewModel,
}: {
  viewModel: PerformanceRiskViewModel;
}) {
  const rows = viewModel.snapshotMetrics.map((metric) => ({
    key: metric.key,
    cells: [metric.label, metric.value, metric.support],
  }));

  return (
    <SectionBlock
      title="Risk Snapshot"
      subtitle="Stateful volatility, drawdown-adjacent, and benchmark-relative risk indicators."
      className="performance-risk-panel performance-risk-snapshot-panel"
    >
      <WorkbenchSummaryMetricStrip
        ariaLabel="Risk snapshot headline metrics"
        className="performance-risk-metric-strip"
        items={viewModel.snapshotMetrics.slice(0, 4).map((metric) => ({
          key: metric.key,
          label: metric.label,
          value: metric.value,
          support: metric.support,
          unavailable: metric.state === "unavailable",
        }))}
      />
      <AnalyticsTable
        ariaLabel="Risk snapshot metric table"
        variant="analysis"
        density="compact"
        columns={[
          { key: "metric", label: "Metric" },
          { key: "value", label: "Value", align: "right" },
          { key: "support", label: "Supportability" },
        ]}
        rows={rows}
        emptyState={{
          title: "No risk metrics",
          body: "Stateful risk metrics are not available for this portfolio context.",
        }}
      />
    </SectionBlock>
  );
}
