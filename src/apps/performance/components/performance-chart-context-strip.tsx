import { WorkbenchSummaryToolbar } from "@/design-system";

type PerformanceChartContextStripProps = {
  period: string;
  detailBasis: string;
  benchmarkLabel: string;
  benchmarkAssigned: boolean;
  activeReturn: string;
  relativeContextStatus: "available" | "partial" | "unavailable";
};

export default function PerformanceChartContextStrip({
  period,
  detailBasis,
  benchmarkLabel,
  benchmarkAssigned,
  activeReturn,
  relativeContextStatus,
}: PerformanceChartContextStripProps) {
  const relativeContextLabel =
    relativeContextStatus.charAt(0).toUpperCase() + relativeContextStatus.slice(1);

  return (
    <WorkbenchSummaryToolbar
      className="performance-chart-context-strip"
      role="group"
      aria-label="Return path context"
    >
      <span className="performance-chart-context-item">
        Portfolio line <strong>Portfolio</strong>
      </span>
      <span className="performance-chart-context-item">
        Benchmark line <strong>{benchmarkAssigned ? benchmarkLabel : "Unassigned"}</strong>
      </span>
      <span className="performance-chart-context-item">
        Active context <strong>{`${activeReturn} • ${relativeContextLabel}`}</strong>
      </span>
      <span className="performance-chart-context-item">
        Window / basis <strong>{`${period} • ${detailBasis === "GROSS" ? "Gross" : "Net"}`}</strong>
      </span>
    </WorkbenchSummaryToolbar>
  );
}
