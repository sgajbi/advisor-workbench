import { formatDate } from "../formatters";

type PerformanceChartContextStripProps = {
  portfolioId: string;
  period: string;
  detailBasis: string;
  benchmarkContextValue: string;
  activeReturn: string;
  relativeContextStatus: "available" | "partial" | "unavailable";
  reportStartDate?: string;
  reportEndDate?: string;
};

export default function PerformanceChartContextStrip({
  portfolioId,
  period,
  detailBasis,
  benchmarkContextValue,
  activeReturn,
  relativeContextStatus,
  reportStartDate,
  reportEndDate,
}: PerformanceChartContextStripProps) {
  const relativeContextLabel =
    relativeContextStatus.charAt(0).toUpperCase() + relativeContextStatus.slice(1);
  const resolvedWindow =
    reportStartDate && reportEndDate
      ? `${formatDate(reportStartDate)} - ${formatDate(reportEndDate)}`
      : period;

  return (
    <div className="performance-chart-context-strip" role="group" aria-label="Return path context">
      <span className="performance-chart-context-field">
        <span className="performance-chart-context-label">Portfolio</span>
        <strong className="performance-chart-context-value">{portfolioId}</strong>
      </span>
      <span className="performance-chart-context-field">
        <span className="performance-chart-context-label">Benchmark</span>
        <strong className="performance-chart-context-value">{benchmarkContextValue}</strong>
      </span>
      <span className="performance-chart-context-field">
        <span className="performance-chart-context-label">Active</span>
        <strong className="performance-chart-context-value">{`${activeReturn} • ${relativeContextLabel}`}</strong>
      </span>
      <span className="performance-chart-context-field">
        <span className="performance-chart-context-label">Window / Basis</span>
        <strong className="performance-chart-context-value">
          {`${resolvedWindow} • ${detailBasis === "GROSS" ? "Gross" : "Net"}`}
        </strong>
      </span>
    </div>
  );
}
