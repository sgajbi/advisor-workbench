import { formatDate } from "../formatters";

type PerformanceChartContextStripProps = {
  period: string;
  detailBasis: string;
  benchmarkContextValue: string;
  chartFrequency: string;
  reportStartDate?: string;
  reportEndDate?: string;
};

export default function PerformanceChartContextStrip({
  period,
  detailBasis,
  benchmarkContextValue,
  chartFrequency,
  reportStartDate,
  reportEndDate,
}: PerformanceChartContextStripProps) {
  const resolvedWindow =
    reportStartDate && reportEndDate
      ? `${formatDate(reportStartDate)} - ${formatDate(reportEndDate)}`
      : period;

  return (
    <div className="performance-chart-context-strip" role="group" aria-label="Return path context">
      <div className="performance-chart-context-field">
        <span className="performance-chart-context-label">Benchmark</span>
        <strong className="performance-chart-context-value">{benchmarkContextValue}</strong>
      </div>
      <div className="performance-chart-context-field">
        <span className="performance-chart-context-label">Window</span>
        <strong className="performance-chart-context-value">{resolvedWindow}</strong>
      </div>
      <div className="performance-chart-context-field">
        <span className="performance-chart-context-label">Basis</span>
        <strong className="performance-chart-context-value">{detailBasis === "GROSS" ? "Gross" : "Net"}</strong>
      </div>
      <div className="performance-chart-context-field">
        <span className="performance-chart-context-label">Frequency</span>
        <strong className="performance-chart-context-value">{chartFrequency === "quarterly" ? "Quarterly" : "Monthly"}</strong>
      </div>
    </div>
  );
}
