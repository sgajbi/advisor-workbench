import Link from "next/link";

import ProposalSimulateForm from "@/features/proposals/components/proposal-simulate-form";

export default function ProposalSimulatePage() {
  return (
    <main className="page-container">
      <section className="page-header">
        <h1 className="page-title">Advisory Proposals</h1>
        <p className="page-subtitle">Run proposal simulation and persist advisor-ready drafts.</p>
      </section>
      <div className="action-strip">
        <Link href="/proposals" className="nav-link">
          Go to Proposal Workspace
        </Link>
      </div>
      <ProposalSimulateForm />
    </main>
  );
}
