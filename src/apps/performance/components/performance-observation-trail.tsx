import { AnalyticsTable } from "@/design-system";

import type { PerformanceAnalyticsTableModel } from "./performance-analytics-table-models";
import PerformanceModuleDisclosure from "./performance-module-disclosure";

export default function PerformanceObservationTrail({
  tableModel,
}: {
  tableModel: PerformanceAnalyticsTableModel;
}) {
  const periodLabel = `${tableModel.rows.length} ${
    tableModel.rows.length === 1 ? "period" : "periods"
  }`;

  return (
    <PerformanceModuleDisclosure
      className="performance-chart-observation-coupling"
      summaryClassName="performance-chart-observation-header"
      copyClassName="performance-chart-observation-header-copy"
      titleClassName="performance-chart-observation-header-title"
      title="Observation trail"
      meta={periodLabel}
      metaClassName="performance-chart-observation-header-meta"
    >
      <AnalyticsTable
        ariaLabel="Return path observation table"
        columns={tableModel.columns}
        rows={tableModel.rows}
        density="compact"
        variant="observation"
        className="performance-chart-observation-table"
      />
    </PerformanceModuleDisclosure>
  );
}
