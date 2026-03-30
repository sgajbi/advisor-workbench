import { WorkbenchSummaryToolbar } from "@/design-system";

type PerformanceChartContextStripProps = {
  period: string;
  benchmarkLabel: string;
  benchmarkAssigned: boolean;
  activeReturn: string;
};

export default function PerformanceChartContextStrip({
  period,
  benchmarkLabel,
  benchmarkAssigned,
  activeReturn,
}: PerformanceChartContextStripProps) {
  return (
    <WorkbenchSummaryToolbar
      className="performance-chart-context-strip"
      role="group"
      aria-label="Return path context"
    >
      <span className="performance-chart-context-item">
        Selected period <strong>{period}</strong>
      </span>
      <span className="performance-chart-context-item">
        Compared against <strong>{benchmarkAssigned ? benchmarkLabel : "Unassigned"}</strong>
      </span>
      <span className="performance-chart-context-item">
        Active return <strong>{activeReturn}</strong>
      </span>
      <span className="performance-chart-context-item">
        Relative context <strong>{benchmarkAssigned ? "Available" : "Unavailable"}</strong>
      </span>
    </WorkbenchSummaryToolbar>
  );
}
