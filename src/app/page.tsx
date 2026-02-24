import Link from "next/link";

export default function Home() {
  return (
    <main className="page-container">
      <section className="page-header">
        <h1 className="page-title">Wealth Suite Control Center</h1>
        <p className="page-subtitle">
          Enterprise workspace for intake, analytics, and advisory decisions in one operational cockpit.
        </p>
      </section>

      <section className="section-card suite-hero">
        <div>
          <p className="pill">System Storyline</p>
          <h2>From Data Intake To Client-Ready Decision</h2>
          <p className="muted">
            Teams move from validated portfolio data, to analytics intelligence, to governed investment recommendations
            without leaving a single workflow shell.
          </p>
        </div>
        <div className="suite-pipeline">
          <div className="pipeline-node">Portfolio Data Hub</div>
          <div className="pipeline-arrow">-&gt;</div>
          <div className="pipeline-node">Analytics Intelligence</div>
          <div className="pipeline-arrow">-&gt;</div>
          <div className="pipeline-node">Advisory Workflow Engine</div>
          <div className="pipeline-arrow">-&gt;</div>
          <div className="pipeline-node">Client Decision Workspace</div>
        </div>
      </section>

      <section className="suite-grid">
        <article className="section-card suite-tile">
          <h3>Portfolio Intake</h3>
          <p className="muted">
            Capture positions, transactions, and instruments through guided forms and controlled file pipelines.
          </p>
          <Link href="/pas/intake" className="nav-link">
            Open Intake
          </Link>
        </article>
        <article className="section-card suite-tile">
          <h3>Analytics Studio</h3>
          <p className="muted">Review performance, attribution, and risk insights with portfolio-level drilldowns.</p>
          <Link href="/pa/analytics" className="nav-link">
            Open Analytics
          </Link>
        </article>
        <article className="section-card suite-tile">
          <h3>Advisory Pipeline</h3>
          <p className="muted">Run recommendation lifecycle, gate reviews, and approvals with full audit traceability.</p>
          <div className="toolbar">
            <Link href="/proposals" className="nav-link">
              Open Pipeline
            </Link>
            <Link href="/workbench" className="nav-link">
              Open Console
            </Link>
          </div>
        </article>
      </section>
    </main>
  );
}
