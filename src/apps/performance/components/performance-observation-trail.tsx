import { AnalyticsTable } from "@/design-system";

import type { PerformanceAnalyticsTableModel } from "./performance-analytics-table-models";
import PerformanceModuleDisclosure from "./performance-module-disclosure";
import styles from "./performance-observation-trail.module.css";

export default function PerformanceObservationTrail({
  tableModel,
}: {
  tableModel: PerformanceAnalyticsTableModel;
}) {
  const periodLabel = `${tableModel.rows.length} ${
    tableModel.rows.length === 1 ? "period" : "periods"
  }`;
  const columns = tableModel.columns.map((column, index) => {
    if (index === 0) {
      return { ...column, width: "4.75rem", stickyOffset: 0 };
    }
    if (index === 1) {
      return { ...column, width: "8.75rem", stickyOffset: "4.75rem" };
    }
    return column;
  });

  return (
    <PerformanceModuleDisclosure
      className="performance-chart-observation-coupling"
      summaryClassName="performance-chart-observation-header"
      copyClassName="performance-chart-observation-header-copy"
      titleClassName="performance-chart-observation-header-title"
      title="Return history"
      meta={periodLabel}
      metaClassName="performance-chart-observation-header-meta"
    >
      <p className={styles.scrollHint}>
        Period and window remain visible while you review cumulative results.
      </p>
      <AnalyticsTable
        ariaLabel="Return path observation table"
        columns={columns}
        rows={tableModel.rows}
        density="compact"
        variant="observation"
        className={styles.table}
        scrollRegionLabel="Return history columns"
        tableMinWidth="36rem"
      />
    </PerformanceModuleDisclosure>
  );
}
