import { AnalyticsTable } from "@/design-system";

import type { PerformanceAnalyticsTableModel } from "./performance-analytics-table-models";
import PerformanceModuleDisclosure from "./performance-module-disclosure";

type PerformanceHorizonComparisonDisclosureProps = {
  tableModel: PerformanceAnalyticsTableModel;
};

export default function PerformanceHorizonComparisonDisclosure({
  tableModel,
}: PerformanceHorizonComparisonDisclosureProps) {
  return (
    <PerformanceModuleDisclosure
      className="performance-horizon-table-disclosure"
      summaryClassName="performance-horizon-table-disclosure-summary"
      titleClassName="performance-horizon-table-disclosure-title"
      title="Detailed table"
    >
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
    </PerformanceModuleDisclosure>
  );
}
