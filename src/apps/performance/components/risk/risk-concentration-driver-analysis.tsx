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
              <Text variant="eyebrow" className="performance-risk-concentration-driver-eyebrow">
                {row.eyebrow}
              </Text>
              <Text variant="body" className="performance-risk-concentration-driver-summary">
                {row.summary}
              </Text>
            </div>
            <div className="performance-risk-concentration-driver-metric">
              <Text variant="label" className="performance-risk-concentration-driver-metric-label">
                {row.supportingMetricLabel}
              </Text>
              <Text variant="metricValueCompact" className="performance-risk-concentration-driver-metric-value">
                {row.supportingMetricValue}
              </Text>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
