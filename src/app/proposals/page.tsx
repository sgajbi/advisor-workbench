import Link from "next/link";

import ProposalListView from "@/features/proposals/components/proposal-list-view";

export default function ProposalsPage() {
  return (
    <main className="page-container">
      <h1 className="page-title">Advisory Proposals</h1>
      <p className="page-subtitle">Proposal drafts, status transitions, and approval workflow.</p>
      <p>
        <Link href="/proposals/simulate">Create Proposal Draft</Link>
      </p>
      <ProposalListView />
    </main>
  );
}
