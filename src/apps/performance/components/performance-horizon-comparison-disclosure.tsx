import { AnalyticsTable } from "@/design-system";

import type { PerformanceAnalyticsTableModel } from "./performance-analytics-table-models";
import PerformanceModuleDisclosure from "./performance-module-disclosure";

type PerformanceHorizonComparisonDisclosureProps = {
  tableModel: PerformanceAnalyticsTableModel;
  observationCount?: number;
};

export default function PerformanceHorizonComparisonDisclosure({
  tableModel,
  observationCount,
}: PerformanceHorizonComparisonDisclosureProps) {
  const isSingleObservation = observationCount === 1;
  return (
    <PerformanceModuleDisclosure
      className="performance-horizon-table-disclosure"
      summaryClassName="performance-horizon-table-disclosure-summary"
      titleClassName="performance-horizon-table-disclosure-title"
      title={isSingleObservation ? "Return evidence" : "Detailed table"}
    >
      <div
        className="performance-horizon-table-scroll"
        role="region"
        aria-label={
          isSingleObservation
            ? "Scrollable horizon evidence table"
            : "Scrollable horizon comparison table"
        }
        tabIndex={0}
      >
        <AnalyticsTable
          ariaLabel={
            isSingleObservation ? "Single-horizon return table" : "Multi-horizon return table"
          }
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
