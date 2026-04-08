import { AnalyticsTable, SectionBlock, Text, WorkbenchSummaryMetricStrip } from "@/design-system";

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
      subtitle="Core realized risk measures, benchmark-relative posture, and observation context."
      className="performance-risk-panel performance-risk-snapshot-panel"
    >
      {viewModel.snapshotExecutiveSummary ? (
        <section className="performance-risk-briefing-card" aria-label="Risk snapshot business reading">
          <Text variant="cardTitle">{viewModel.snapshotExecutiveSummary.heading}</Text>
          <Text variant="metricValueCompact" className="performance-risk-briefing-headline">
            {viewModel.snapshotExecutiveSummary.headline}
          </Text>
          <Text variant="secondary">{viewModel.snapshotExecutiveSummary.detail}</Text>
          {viewModel.snapshotExecutiveSummary.actionCue ? (
            <Text variant="metadata" className="performance-risk-briefing-cue">
              Next: {viewModel.snapshotExecutiveSummary.actionCue}
            </Text>
          ) : null}
        </section>
      ) : null}
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
      {viewModel.snapshotContextRows.length ? (
        <div className="performance-risk-context-card-grid" aria-label="Risk snapshot context">
          {viewModel.snapshotContextRows.map((row) => (
            <div key={row.key} className="performance-risk-context-card">
              <Text variant="label">{row.label}</Text>
              <Text variant="cardTitle">{row.value}</Text>
              <Text variant="metadata">{row.support}</Text>
            </div>
          ))}
        </div>
      ) : null}
      <AnalyticsTable
        ariaLabel="Risk snapshot metric table"
        variant="analysis"
        density="compact"
        columns={[
          { key: "metric", label: "Measure" },
          { key: "value", label: "Current Reading", align: "right" },
          { key: "support", label: "Interpretation" },
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
