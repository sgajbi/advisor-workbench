export default function PerformanceDecisionReadout({
  activeReturn,
  windowLabel,
  basisLabel,
  benchmark,
  comparisonBasis,
  observationCadence,
}: {
  activeReturn: string;
  windowLabel: string;
  basisLabel: string;
  benchmark: string;
  comparisonBasis: string;
  observationCadence: string;
}) {
  return (
    <aside className="performance-chart-readout-panel" aria-label="Return decision readout">
      <span className="performance-chart-readout-eyebrow">Decision readout</span>
      <strong>{activeReturn} active return</strong>
      <p>{`${windowLabel} • ${basisLabel}`}</p>
      <dl className="performance-chart-readout-list">
        <div>
          <dt>Benchmark</dt>
          <dd>{benchmark}</dd>
        </div>
        <div>
          <dt>Comparison basis</dt>
          <dd>{comparisonBasis}</dd>
        </div>
        <div>
          <dt>Observation cadence</dt>
          <dd>{observationCadence}</dd>
        </div>
      </dl>
    </aside>
  );
}
