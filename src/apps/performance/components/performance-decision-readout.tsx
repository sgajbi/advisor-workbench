export default function PerformanceDecisionReadout({
  activeReturn,
  windowLabel,
  basisLabel,
  comparisonBasis,
  observationCadence,
}: {
  activeReturn: string;
  windowLabel: string;
  basisLabel: string;
  comparisonBasis: string;
  observationCadence: string;
}) {
  return (
    <section className="performance-chart-readout-strip" aria-label="Return decision readout">
      <div className="performance-chart-readout-highlight">
        <span className="performance-chart-readout-eyebrow">Active return</span>
        <strong>{activeReturn}</strong>
      </div>
      <dl className="performance-chart-readout-list">
        <div>
          <dt>Window</dt>
          <dd>{windowLabel}</dd>
        </div>
        <div>
          <dt>Basis</dt>
          <dd>{basisLabel}</dd>
        </div>
        <div>
          <dt>Series</dt>
          <dd>{comparisonBasis}</dd>
        </div>
        <div>
          <dt>Cadence</dt>
          <dd>{observationCadence}</dd>
        </div>
      </dl>
    </section>
  );
}
