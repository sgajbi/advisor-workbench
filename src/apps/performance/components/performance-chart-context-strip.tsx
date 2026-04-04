import { formatDate } from "../formatters";

type PerformanceChartContextStripProps = {
  portfolioId: string;
  period: string;
  detailBasis: string;
  benchmarkContextValue: string;
  activeReturn: string;
  reportStartDate?: string;
  reportEndDate?: string;
};

export default function PerformanceChartContextStrip({
  portfolioId,
  period,
  detailBasis,
  benchmarkContextValue,
  activeReturn,
  reportStartDate,
  reportEndDate,
}: PerformanceChartContextStripProps) {
  const resolvedWindow =
    reportStartDate && reportEndDate
      ? `${formatDate(reportStartDate)} - ${formatDate(reportEndDate)}`
      : period;

  return (
    <div className="performance-chart-context-strip" role="group" aria-label="Return vs Benchmark">
      <div className="performance-chart-context-field">
        <span className="performance-chart-context-label">Portfolio</span>
        <strong className="performance-chart-context-value">{portfolioId}</strong>
      </div>
      <div className="performance-chart-context-field">
        <span className="performance-chart-context-label">Benchmark</span>
        <strong className="performance-chart-context-value">{benchmarkContextValue}</strong>
      </div>
      <div className="performance-chart-context-field">
        <span className="performance-chart-context-label">Active Return</span>
        <strong className="performance-chart-context-value">{activeReturn}</strong>
      </div>
      <div className="performance-chart-context-field">
        <span className="performance-chart-context-label">Period / Basis</span>
        <strong className="performance-chart-context-value">
          {`${resolvedWindow} • ${detailBasis === "GROSS" ? "Gross" : "Net"}`}
        </strong>
      </div>
    </div>
  );
}
