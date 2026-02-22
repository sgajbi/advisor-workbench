import Link from "next/link";

import ProposalListView from "@/features/proposals/components/proposal-list-view";

export default function ProposalsPage() {
  return (
    <main style={{ padding: "1rem", maxWidth: "960px", margin: "0 auto" }}>
      <h1>Advisory Proposals</h1>
      <p>
        <Link href="/proposals/simulate">Create Proposal Draft</Link>
      </p>
      <ProposalListView />
    </main>
  );
}
