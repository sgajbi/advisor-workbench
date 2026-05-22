import ProposalDetailView from "@/features/proposals/components/proposal-detail-view";

type Props = {
  params: Promise<{
    proposalId: string;
  }>;
};

export default async function ProposalDetailPage({ params }: Props) {
  const resolvedParams = await params;
  return <ProposalDetailView proposalId={resolvedParams.proposalId} />;
}
