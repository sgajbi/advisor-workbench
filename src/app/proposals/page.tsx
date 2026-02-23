import Link from "next/link";

import ProposalListView from "@/features/proposals/components/proposal-list-view";

export default function ProposalsPage() {
  return (
    <main className="page-container">
      <h1 className="page-title">Proposal Operations Workspace</h1>
      <p className="page-subtitle">
        Triage drafts, monitor review bottlenecks, and execute the next workflow step from a single board.
      </p>
      <p>
        <Link href="/proposals/simulate">Create Proposal Draft</Link>
      </p>
      <ProposalListView />
    </main>
  );
}
