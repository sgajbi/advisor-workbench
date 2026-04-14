type PerformanceReturnPathSummaryProps = {
  portfolioReturn: string;
  benchmarkReturn: string;
  activeReturn: string;
};

export default function PerformanceReturnPathSummary({
  portfolioReturn,
  benchmarkReturn,
  activeReturn,
}: PerformanceReturnPathSummaryProps) {
  return (
    <section
      className="performance-chart-readout-strip performance-return-path-summary"
      aria-label="Return decision readout"
    >
      <div className="performance-chart-readout-primary">
        <span className="performance-chart-readout-eyebrow">Active Return</span>
        <strong>{activeReturn}</strong>
      </div>
      <div className="performance-chart-readout-primary">
        <span className="performance-chart-readout-eyebrow">Portfolio Return</span>
        <strong>{portfolioReturn}</strong>
      </div>
      <div className="performance-chart-readout-primary">
        <span className="performance-chart-readout-eyebrow">Benchmark Return</span>
        <strong>{benchmarkReturn}</strong>
      </div>
    </section>
  );
}
