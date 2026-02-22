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
    <main style={{ padding: "1rem", maxWidth: "960px", margin: "0 auto" }}>
      <p>
        <Link href="/proposals">Back to Proposal Workspace</Link>
      </p>
      <ProposalDetailView proposalId={proposalId} />
    </main>
  );
}
