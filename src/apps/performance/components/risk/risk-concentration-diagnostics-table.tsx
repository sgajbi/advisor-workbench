import { AnalyticsTable, Text } from "@/design-system";

import type { PerformanceRiskConcentrationDiagnosticRow } from "../../risk-workspace-view-model";

export default function RiskConcentrationDiagnosticsTable({
  rows,
}: {
  rows: PerformanceRiskConcentrationDiagnosticRow[];
}) {
  return (
    <AnalyticsTable
      ariaLabel="Risk concentration diagnostic table"
      variant="analysis"
      density="comfortable"
      className="performance-risk-concentration-diagnostic-table"
      columns={[
        { key: "measure", label: "Measure" },
        { key: "reading", label: "Current Reading", align: "right" },
        { key: "interpretation", label: "Interpretation" },
      ]}
      rows={rows.map((row) => ({
        key: row.key,
        cells: [
          <Text
            key={`${row.key}-measure`}
            variant="body"
            className="performance-risk-concentration-diagnostic-measure"
          >
            {row.measure}
          </Text>,
          <Text
            key={`${row.key}-reading`}
            variant="metricValueCompact"
            className="performance-risk-concentration-diagnostic-reading"
          >
            {row.currentReading}
          </Text>,
          <Text
            key={`${row.key}-interpretation`}
            variant="secondary"
            className="performance-risk-concentration-diagnostic-interpretation"
          >
            {row.interpretation}
          </Text>,
        ],
      }))}
      emptyState={{
        title: "No concentration diagnostics available",
        body: "Stateful concentration diagnostics are not available for the selected portfolio context.",
      }}
    />
  );
}
