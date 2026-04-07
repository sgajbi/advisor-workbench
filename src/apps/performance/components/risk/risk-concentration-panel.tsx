import { AnalyticsTable, SectionBlock, Text, WorkbenchSummaryMetricStrip } from "@/design-system";

import type { PerformanceRiskViewModel } from "../../risk-workspace-view-model";

export default function RiskConcentrationPanel({
  viewModel,
}: {
  viewModel: PerformanceRiskViewModel;
}) {
  const [hhiMetric, topPositionMetric, topIssuerMetric, coverageMetric] = viewModel.concentrationMetrics;

  return (
    <SectionBlock
      title="Concentration"
      subtitle="Current stateful concentration pressure and issuer coverage diagnostics."
      className="performance-risk-panel performance-risk-concentration-panel"
    >
      <WorkbenchSummaryMetricStrip
        ariaLabel="Risk concentration headline metrics"
        className="performance-risk-metric-strip"
        items={viewModel.concentrationMetrics.map((metric) => ({
          key: metric.key,
          label: metric.label,
          value: metric.value,
          support: metric.support,
        }))}
      />
      <div className="performance-risk-concentration-context" aria-label="Risk concentration interpretation">
        <div className="performance-risk-note-card">
          <div className="performance-risk-note-copy">
            <Text variant="label">Portfolio posture</Text>
            <Text variant="body">
            {hhiMetric?.value ?? "N/A"} HHI indicates the current concentration profile for the live book.
            </Text>
          </div>
        </div>
        <div className="performance-risk-note-card">
          <div className="performance-risk-note-copy">
            <Text variant="label">Largest exposures</Text>
            <Text variant="body">
            Top position {topPositionMetric?.value ?? "N/A"} and top issuer {topIssuerMetric?.value ?? "N/A"} frame the
            main concentration points for review.
            </Text>
          </div>
        </div>
        <div className="performance-risk-note-card">
          <div className="performance-risk-note-copy">
            <Text variant="label">Coverage</Text>
            <Text variant="body">{coverageMetric?.value ?? "N/A"} issuers enriched. {coverageMetric?.support ?? ""}</Text>
          </div>
        </div>
      </div>
      <AnalyticsTable
        ariaLabel="Risk concentration diagnostic table"
        variant="analysis"
        density="compact"
        columns={[
          { key: "metric", label: "Metric" },
          { key: "value", label: "Value", align: "right" },
          { key: "support", label: "Meaning" },
        ]}
        rows={viewModel.concentrationMetrics.map((metric) => ({
          key: metric.key,
          cells: [metric.label, metric.value, metric.support],
        }))}
        emptyState={{
          title: "No concentration diagnostics",
          body: "Stateful concentration analytics are not available for this portfolio context.",
        }}
      />
    </SectionBlock>
  );
}
