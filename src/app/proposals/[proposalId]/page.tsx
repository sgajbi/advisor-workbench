import ProposalDetailView from "@/features/proposals/components/proposal-detail-view";
import { normalizeAdvisoryJourneyMode } from "@/features/proposals/advisory-journey-navigation";
import { resolveProposalPortfolioId } from "@/features/proposals/components/proposal-workspace-shell";
import { normalizeProposalLifecycleMode } from "@/features/proposals/proposal-lifecycle-workspace-view-model";

type Props = {
  params: Promise<{
    proposalId: string;
  }>;
  searchParams?: Promise<{
    portfolioId?: string;
    fromMode?: string;
  }>;
};

export default async function ProposalDetailPage({ params, searchParams }: Props) {
  const resolvedParams = await params;
  const resolvedSearchParams = searchParams ? await searchParams : {};
  const returnPortfolioId = resolveProposalPortfolioId(resolvedSearchParams.portfolioId);
  const returnMode = normalizeProposalLifecycleMode(
    normalizeAdvisoryJourneyMode(resolvedSearchParams.fromMode),
  );

  return (
    <ProposalDetailView
      proposalId={resolvedParams.proposalId}
      returnPortfolioId={returnPortfolioId}
      returnMode={returnMode}
    />
  );
}
