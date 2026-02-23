import Link from "next/link";

export default function Home() {
  return (
    <main className="page-container">
      <h1 className="page-title">Wealth Suite Control Center</h1>
      <p className="page-subtitle">
        Unified UI for PAS intake, PA analytics, and DPM advisory workflows through a single BFF experience.
      </p>

      <section className="section-card suite-hero">
        <div>
          <p className="pill">System Storyline</p>
          <h2>From Data Intake To Advisory Decisioning</h2>
          <p className="muted">
            PAS manages canonical portfolio and market data, PA derives advanced analytics, and DPM runs portfolio
            construction and recommendation workflows.
          </p>
        </div>
        <div className="suite-pipeline">
          <div className="pipeline-node">PAS Core Platform</div>
          <div className="pipeline-arrow">-&gt;</div>
          <div className="pipeline-node">PA Analytics</div>
          <div className="pipeline-arrow">-&gt;</div>
          <div className="pipeline-node">DPM Workflows</div>
          <div className="pipeline-arrow">-&gt;</div>
          <div className="pipeline-node">Advisor UI + BFF</div>
        </div>
      </section>

      <section className="suite-grid">
        <article className="section-card suite-tile">
          <h3>PAS Intake</h3>
          <p className="muted">
            Upload positions, transactions, and instruments through guided forms and file pipelines.
          </p>
          <Link href="/pas/intake" className="nav-link">
            Open PAS Intake
          </Link>
        </article>
        <article className="section-card suite-tile">
          <h3>PA Analytics</h3>
          <p className="muted">Review performance, attribution, and risk insights built on PAS outputs.</p>
          <Link href="/pa/analytics" className="nav-link">
            Open PA Analytics
          </Link>
        </article>
        <article className="section-card suite-tile">
          <h3>DPM Workbench</h3>
          <p className="muted">Run proposal lifecycle, review gates, and approval actions using live DPM integration.</p>
          <div className="toolbar">
            <Link href="/proposals" className="nav-link">
              Proposals
            </Link>
            <Link href="/workbench/PF_1001" className="nav-link">
              Workbench
            </Link>
          </div>
        </article>
      </section>
    </main>
  );
}
