import { AnalyticsTable } from "@/design-system";

import type { PerformanceAnalyticsTableModel } from "./performance-analytics-table-models";

export default function PerformanceObservationTrail({
  tableModel,
}: {
  tableModel: PerformanceAnalyticsTableModel;
}) {
  return (
    <details className="performance-chart-observation-coupling">
      <summary className="performance-chart-observation-header">
        <span>Observation trail</span>
        <strong>{`${tableModel.rows.length} published periods`}</strong>
      </summary>
      <AnalyticsTable
        ariaLabel="Return path observation table"
        columns={tableModel.columns}
        rows={tableModel.rows}
        density="compact"
        variant="observation"
        className="performance-chart-observation-table"
      />
    </details>
  );
}
