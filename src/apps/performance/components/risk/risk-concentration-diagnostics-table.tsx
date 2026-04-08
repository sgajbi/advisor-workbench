import { AnalyticsTable } from "@/design-system";

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
      columns={[
        { key: "measure", label: "Measure" },
        { key: "reading", label: "Current Reading", align: "right" },
        { key: "interpretation", label: "Interpretation" },
      ]}
      rows={rows.map((row) => ({
        key: row.key,
        cells: [row.measure, row.currentReading, row.interpretation],
      }))}
      emptyState={{
        title: "No concentration diagnostics available",
        body: "Stateful concentration diagnostics are not available for the selected portfolio context.",
      }}
    />
  );
}
