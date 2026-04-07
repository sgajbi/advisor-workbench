import { AnalyticsTable, SectionBlock, WorkbenchSummaryMetricStrip } from "@/design-system";

import type { PerformanceRiskViewModel } from "../../risk-workspace-view-model";

export default function RiskConcentrationPanel({
  viewModel,
}: {
  viewModel: PerformanceRiskViewModel;
}) {
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
