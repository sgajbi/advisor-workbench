import { analyticsHighlights } from "@/features/suite/mock-data";

export default function PaAnalyticsPage() {
  return (
    <main className="page-container">
      <h1 className="page-title">PA Advanced Analytics</h1>
      <p className="page-subtitle">
        Mocked PA views for performance, attribution, and risk analytics on top of PAS canonical data.
      </p>

      <section className="section-card">
        <h2>Analytics Snapshot</h2>
        <div className="kpi-grid">
          {analyticsHighlights.map((item) => (
            <div key={item.label} className="kpi-box">
              <p className="kpi-label">{item.label}</p>
              <p className="kpi-value">{item.value}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="suite-grid">
        <article className="section-card suite-panel">
          <h3>Attribution Breakdown (Mock)</h3>
          <div className="suite-row">
            <span>Allocation Effect</span>
            <strong>+64 bps</strong>
          </div>
          <div className="suite-row">
            <span>Selection Effect</span>
            <strong>+41 bps</strong>
          </div>
          <div className="suite-row">
            <span>FX Effect</span>
            <strong>+16 bps</strong>
          </div>
        </article>

        <article className="section-card suite-panel">
          <h3>Risk Signals (Mock)</h3>
          <div className="suite-row">
            <span>Volatility (1Y)</span>
            <strong>11.8%</strong>
          </div>
          <div className="suite-row">
            <span>Max Drawdown</span>
            <strong>-7.2%</strong>
          </div>
          <div className="suite-row">
            <span>Beta vs Benchmark</span>
            <strong>0.92</strong>
          </div>
        </article>
      </section>
    </main>
  );
}
