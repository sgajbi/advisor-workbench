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
    <aside className="performance-chart-readout-panel" aria-label="Return decision readout">
      <span className="performance-chart-readout-eyebrow">Decision readout</span>
      <strong>{activeReturn} active return</strong>
      <p>{`${windowLabel} • ${basisLabel}`}</p>
      <dl className="performance-chart-readout-list">
        <div>
          <dt>Basis</dt>
          <dd>{comparisonBasis}</dd>
        </div>
        <div>
          <dt>Cadence</dt>
          <dd>{observationCadence}</dd>
        </div>
      </dl>
    </aside>
  );
}
