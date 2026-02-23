import Link from "next/link";

import ProposalDetailView from "@/features/proposals/components/proposal-detail-view";

type Props = {
  params: Promise<{
    proposalId: string;
  }>;
};

export default async function ProposalDetailPage({ params }: Props) {
  const { proposalId } = await params;
  return (
    <main className="page-container">
      <h1 className="page-title">Proposal Detail</h1>
      <p className="page-subtitle">Lifecycle status, approvals, and workflow events.</p>
      <p>
        <Link href="/proposals">Back to Proposal Workspace</Link>
      </p>
      <ProposalDetailView proposalId={proposalId} />
    </main>
  );
}
