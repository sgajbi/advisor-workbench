import { AnalyticsTable } from "@/design-system";

import type { PerformanceAnalyticsTableModel } from "./performance-analytics-table-models";

type PerformanceHorizonComparisonDisclosureProps = {
  tableModel: PerformanceAnalyticsTableModel;
};

export default function PerformanceHorizonComparisonDisclosure({
  tableModel,
}: PerformanceHorizonComparisonDisclosureProps) {
  return (
    <details className="performance-horizon-table-disclosure">
      <summary className="performance-horizon-table-disclosure-summary">
        <div className="performance-horizon-table-disclosure-copy">
          <strong>Detailed table</strong>
          <span>Open the full economics and return breakdown. Scroll horizontally for wide columns.</span>
        </div>
      </summary>
      <div
        className="performance-horizon-table-scroll"
        role="region"
        aria-label="Scrollable horizon comparison table"
        tabIndex={0}
      >
        <AnalyticsTable
          ariaLabel="Multi-horizon return table"
          columns={tableModel.columns}
          rows={tableModel.rows}
          density="compact"
          variant="observation"
          className="performance-horizon-table performance-chart-observation-table"
        />
      </div>
    </details>
  );
}
