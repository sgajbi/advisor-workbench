import Link from "next/link";

import ProposalListView from "@/features/proposals/components/proposal-list-view";

export default function ProposalsPage() {
  return (
    <main className="page-container">
      <section className="page-header">
        <h1 className="page-title">Proposal Operations Workspace</h1>
        <p className="page-subtitle">
          Triage drafts, monitor review bottlenecks, and execute the next workflow step from a single board.
        </p>
      </section>
      <div className="action-strip">
        <Link href="/proposals/simulate" className="nav-link">
          Create Proposal Draft
        </Link>
      </div>
      <ProposalListView />
    </main>
  );
}
