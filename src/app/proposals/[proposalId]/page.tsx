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
      <section className="page-header">
        <h1 className="page-title">Proposal Detail</h1>
        <p className="page-subtitle">Lifecycle status, approvals, version lineage, and workflow events.</p>
      </section>
      <div className="action-strip">
        <Link href="/proposals" className="nav-link">
          Back to Proposal Workspace
        </Link>
      </div>
      <ProposalDetailView proposalId={proposalId} />
    </main>
  );
}
