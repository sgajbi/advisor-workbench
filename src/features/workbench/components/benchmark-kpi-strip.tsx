type Props = {
  returnPct: number | null;
  benchmarkReturnPct: number;
  projectedCoveragePct: number;
};

function formatPct(value: number | null): string {
  if (value === null) {
    return "N/A";
  }
  return `${value.toFixed(2)}%`;
}

export default function BenchmarkKpiStrip(props: Props) {
  const activeReturn =
    props.returnPct === null ? null : props.returnPct - props.benchmarkReturnPct;

  return (
    <section className="section-card">
      <h3>Benchmark Relative Snapshot</h3>
      <div className="kpi-grid">
        <div className="kpi-box">
          <p className="kpi-label">Portfolio Return</p>
          <p className="kpi-value">{formatPct(props.returnPct)}</p>
        </div>
        <div className="kpi-box">
          <p className="kpi-label">Benchmark Return</p>
          <p className="kpi-value">{formatPct(props.benchmarkReturnPct)}</p>
        </div>
        <div className="kpi-box">
          <p className="kpi-label">Active Return</p>
          <p className="kpi-value">{formatPct(activeReturn)}</p>
        </div>
        <div className="kpi-box">
          <p className="kpi-label">Simulation Coverage</p>
          <p className="kpi-value">{formatPct(props.projectedCoveragePct)}</p>
        </div>
      </div>
    </section>
  );
}
