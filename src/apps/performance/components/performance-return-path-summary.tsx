type PerformanceReturnPathSummaryProps = {
  portfolioReturn: string;
  benchmarkReturn: string;
  activeReturn: string;
  basisLabel: string;
  comparisonBasis: string;
  observationCadence: string;
};

export default function PerformanceReturnPathSummary({
  portfolioReturn,
  benchmarkReturn,
  activeReturn,
  basisLabel,
  comparisonBasis,
  observationCadence,
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
      <div className="performance-chart-readout-comparison" aria-label="Return comparison summary">
        <div className="performance-chart-readout-comparison-row">
          <span className="performance-chart-readout-comparison-label">Portfolio Return</span>
          <strong>{portfolioReturn}</strong>
        </div>
        <div className="performance-chart-readout-comparison-row">
          <span className="performance-chart-readout-comparison-label">Benchmark Return</span>
          <strong>{benchmarkReturn}</strong>
        </div>
      </div>
      <div className="performance-chart-readout-meta" aria-label="Return series context">
        <span>{basisLabel} basis</span>
        <span>{observationCadence} cadence</span>
        <span>{comparisonBasis}</span>
      </div>
    </section>
  );
}
