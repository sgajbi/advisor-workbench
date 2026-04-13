import { AnalyticsTable } from "@/design-system";

import type { PerformanceAnalyticsTableModel } from "./performance-analytics-table-models";

export default function PerformanceObservationTrail({
  tableModel,
}: {
  tableModel: PerformanceAnalyticsTableModel;
}) {
  const periodLabel = `${tableModel.rows.length} ${
    tableModel.rows.length === 1 ? "period" : "periods"
  }`;

  return (
    <details className="performance-chart-observation-coupling">
      <summary className="performance-chart-observation-header">
        <div className="performance-chart-observation-header-copy">
          <span>Observation trail</span>
          <strong>{periodLabel}</strong>
        </div>
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
