import { Text } from "@/design-system";

import type { PerformanceRiskConcentrationDriverAnalysisRow } from "../../risk-workspace-view-model";

export default function RiskConcentrationDriverAnalysis({
  rows,
}: {
  rows: PerformanceRiskConcentrationDriverAnalysisRow[];
}) {
  return (
    <section
      className="performance-risk-concentration-driver-analysis"
      aria-label="Risk concentration driver analysis"
    >
      <div className="performance-risk-concentration-section-header">
        <Text variant="cardTitle">Driver analysis</Text>
      </div>
      <div className="performance-risk-concentration-driver-list">
        {rows.map((row) => (
          <div key={row.key} className="performance-risk-concentration-driver-row">
            <div className="performance-risk-concentration-driver-copy">
              <Text variant="label">{row.title}</Text>
              <Text variant="body">{row.summary}</Text>
            </div>
            <div className="performance-risk-concentration-driver-metric">
              <Text variant="metadata">{row.supportingMetricLabel}</Text>
              <Text variant="metricValueCompact">{row.supportingMetricValue}</Text>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
