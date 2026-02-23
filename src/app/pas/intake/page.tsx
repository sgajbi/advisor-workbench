import { intakeBatches } from "@/features/suite/mock-data";

export default function PasIntakePage() {
  return (
    <main className="page-container">
      <h1 className="page-title">PAS Portfolio Intake</h1>
      <p className="page-subtitle">
        Mocked UX for intake orchestration: manual entry, CSV/Excel upload, validation, and commit lifecycle.
      </p>

      <section className="section-card">
        <h2>Import Actions</h2>
        <div className="toolbar">
          <button type="button" className="btn">
            New Manual Intake
          </button>
          <button type="button" className="btn btn-secondary">
            Upload CSV
          </button>
          <button type="button" className="btn btn-secondary">
            Upload Excel
          </button>
        </div>
      </section>

      <section className="suite-grid">
        <article className="section-card suite-panel">
          <h3>Manual Entry Draft (Mock)</h3>
          <div className="suite-form-grid">
            <label>
              <span className="field-label">Portfolio ID</span>
              <input className="input" defaultValue="PF_1001" />
            </label>
            <label>
              <span className="field-label">Instrument</span>
              <input className="input" defaultValue="US0378331005" />
            </label>
            <label>
              <span className="field-label">Position Quantity</span>
              <input className="input" defaultValue="3500" />
            </label>
            <label>
              <span className="field-label">Market Value</span>
              <input className="input" defaultValue="708400.00" />
            </label>
          </div>
          <div className="toolbar">
            <button type="button" className="btn">
              Validate Draft
            </button>
            <button type="button" className="btn btn-secondary">
              Save For Review
            </button>
          </div>
        </article>

        <article className="section-card suite-panel">
          <h3>Batch Pipeline (Mock)</h3>
          {intakeBatches.map((batch) => (
            <div key={batch.batchId} className="suite-row">
              <div>
                <strong>{batch.batchId}</strong>
                <p className="muted">
                  {batch.source} • {batch.portfolioId}
                </p>
              </div>
              <div>
                <p>{batch.status}</p>
                <p className="muted">{batch.records} rows</p>
              </div>
            </div>
          ))}
        </article>
      </section>
    </main>
  );
}
