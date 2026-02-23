import Link from "next/link";

export default function Home() {
  return (
    <main className="page-container">
      <h1 className="page-title">Unified Advisor Workbench</h1>
      <p className="page-subtitle">
        Enterprise workspace for proposal simulation, lifecycle approvals, and portfolio decisioning.
      </p>
      <section className="section-card">
        <h2>Modules</h2>
        <div className="toolbar">
          <Link href="/proposals" className="nav-link">
            Proposal Workspace
          </Link>
          <Link href="/proposals/simulate" className="nav-link">
            Proposal Simulation
          </Link>
          <Link href="/workbench/PF_1001" className="nav-link">
            Advisor Workbench
          </Link>
        </div>
      </section>
    </main>
  );
}
