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
        <span className="performance-chart-readout-eyebrow">Active</span>
        <strong>{activeReturn}</strong>
      </div>
      <dl className="performance-chart-readout-secondary">
        <div>
          <dt>Portfolio</dt>
          <dd>{portfolioReturn}</dd>
        </div>
        <div>
          <dt>Benchmark</dt>
          <dd>{benchmarkReturn}</dd>
        </div>
      </dl>
      <div className="performance-chart-readout-meta" aria-label="Return series context">
        <span>{basisLabel} basis</span>
        <span>{observationCadence} cadence</span>
        <span>{comparisonBasis}</span>
      </div>
    </section>
  );
}
