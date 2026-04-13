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
        <span className="performance-chart-readout-eyebrow">Current spread</span>
        <strong>{activeReturn}</strong>
      </div>
      <p className="performance-chart-readout-comparison" aria-label="Return comparison summary">
        <span>Portfolio</span>
        <strong>{portfolioReturn}</strong>
        <span className="performance-chart-readout-comparison-divider">vs</span>
        <span>Benchmark</span>
        <strong>{benchmarkReturn}</strong>
      </p>
      <div className="performance-chart-readout-meta" aria-label="Return series context">
        <span>{basisLabel} basis</span>
        <span>{observationCadence} cadence</span>
        <span>{comparisonBasis}</span>
      </div>
    </section>
  );
}
