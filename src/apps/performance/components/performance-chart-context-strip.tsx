import { WorkbenchChartContextRow } from "@/design-system";

type PerformanceChartContextStripProps = {
  period: string;
  detailBasis: string;
  benchmarkLabel: string;
  benchmarkSourceLabel: string | null;
  benchmarkAssigned: boolean;
  activeReturn: string;
  relativeContextStatus: "available" | "partial" | "unavailable";
};

export default function PerformanceChartContextStrip({
  period,
  detailBasis,
  benchmarkLabel,
  benchmarkSourceLabel,
  benchmarkAssigned,
  activeReturn,
  relativeContextStatus,
}: PerformanceChartContextStripProps) {
  const relativeContextLabel =
    relativeContextStatus.charAt(0).toUpperCase() + relativeContextStatus.slice(1);

  return (
    <WorkbenchChartContextRow
      className="performance-chart-context-strip"
      label="Return path context"
      items={[
        { key: "portfolio", label: "Portfolio line", value: "Portfolio" },
        {
          key: "benchmark",
          label: "Benchmark line",
          value: benchmarkAssigned
            ? benchmarkSourceLabel
              ? `${benchmarkLabel} • ${benchmarkSourceLabel}`
              : benchmarkLabel
            : "Unassigned",
        },
        {
          key: "active",
          label: "Active context",
          value: `${activeReturn} • ${relativeContextLabel}`,
        },
        {
          key: "window",
          label: "Window / basis",
          value: `${period} • ${detailBasis === "GROSS" ? "Gross" : "Net"}`,
        },
      ]}
    />
  );
}
