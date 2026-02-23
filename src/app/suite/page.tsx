import Link from "next/link";

import { advisoryQueue, analyticsHighlights, intakeBatches } from "@/features/suite/mock-data";

export default function SuitePage() {
  return (
    <main className="page-container">
      <h1 className="page-title">Suite Operations Storyboard</h1>
      <p className="page-subtitle">
        PAS and PA are currently mocked for UX visualization. DPM workflows are connected through the active BFF path.
      </p>

      <section className="section-card">
        <h2>Live Status</h2>
        <div className="kpi-grid">
          <div className="kpi-box">
            <p className="kpi-label">PAS Connection</p>
            <p className="kpi-value">Mock Mode</p>
          </div>
          <div className="kpi-box">
            <p className="kpi-label">PA Connection</p>
            <p className="kpi-value">Mock Mode</p>
          </div>
          <div className="kpi-box">
            <p className="kpi-label">DPM Connection</p>
            <p className="kpi-value">Live via BFF</p>
          </div>
        </div>
      </section>

      <section className="suite-grid">
        <article className="section-card suite-panel">
          <h3>PAS Intake Queue</h3>
          {intakeBatches.map((batch) => (
            <div key={batch.batchId} className="suite-row">
              <div>
                <strong>{batch.batchId}</strong>
                <p className="muted">
                  {batch.portfolioId} • {batch.source}
                </p>
              </div>
              <div>
                <p>{batch.status}</p>
                <p className="muted">{batch.records} records</p>
              </div>
            </div>
          ))}
          <Link href="/pas/intake" className="nav-link">
            Open PAS Intake Workspace
          </Link>
        </article>

        <article className="section-card suite-panel">
          <h3>PA Analytics Snapshot</h3>
          {analyticsHighlights.map((item) => (
            <div key={item.label} className="suite-row">
              <span>{item.label}</span>
              <strong>{item.value}</strong>
            </div>
          ))}
          <Link href="/pa/analytics" className="nav-link">
            Open PA Analytics Workspace
          </Link>
        </article>

        <article className="section-card suite-panel">
          <h3>DPM Advisory Queue</h3>
          {advisoryQueue.map((item) => (
            <div key={item.proposalId} className="suite-row">
              <div>
                <strong>{item.proposalId}</strong>
                <p className="muted">{item.portfolioId}</p>
              </div>
              <div>
                <p>{item.state}</p>
                <p className="muted">{item.owner}</p>
              </div>
            </div>
          ))}
          <div className="toolbar">
            <Link href="/proposals" className="nav-link">
              Open DPM Proposals
            </Link>
            <Link href="/workbench/PF_1001" className="nav-link">
              Open DPM Workbench
            </Link>
          </div>
        </article>
      </section>
    </main>
  );
}
