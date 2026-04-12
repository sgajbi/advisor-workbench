export default function PerformanceDecisionReadout({
  portfolioReturn,
  benchmarkReturn,
  activeReturn,
  basisLabel,
  comparisonBasis,
  observationCadence,
}: {
  portfolioReturn: string;
  benchmarkReturn: string;
  activeReturn: string;
  basisLabel: string;
  comparisonBasis: string;
  observationCadence: string;
}) {
  return (
    <section className="performance-chart-readout-strip" aria-label="Return decision readout">
      <dl className="performance-chart-readout-compare">
        <div>
          <dt>Portfolio</dt>
          <dd>{portfolioReturn}</dd>
        </div>
        <div>
          <dt>Benchmark</dt>
          <dd>{benchmarkReturn}</dd>
        </div>
        <div>
          <dt>Active</dt>
          <dd>{activeReturn}</dd>
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
