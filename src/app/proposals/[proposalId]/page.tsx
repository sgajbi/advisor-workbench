import ProposalDetailView from "@/features/proposals/components/proposal-detail-view";
import { normalizeAdvisoryJourneyMode } from "@/features/proposals/advisory-journey-navigation";
import { resolveProposalPortfolioId } from "@/features/proposals/components/proposal-workspace-shell";
import { normalizeProposalLifecycleMode } from "@/features/proposals/proposal-lifecycle-workspace-view-model";
import {
  type ProposalRouteSearchParam,
  resolveSingleProposalSearchParam,
} from "@/features/proposals/proposal-route-search-params";

type Props = {
  params: Promise<{
    proposalId: string;
  }>;
  searchParams?: Promise<{
    portfolioId?: ProposalRouteSearchParam;
    fromMode?: ProposalRouteSearchParam;
  }>;
};

export default async function ProposalDetailPage({ params, searchParams }: Props) {
  const resolvedParams = await params;
  const resolvedSearchParams = searchParams ? await searchParams : {};
  const returnPortfolioId = resolveProposalPortfolioId(
    resolveSingleProposalSearchParam(resolvedSearchParams.portfolioId),
  );
  const returnMode = normalizeProposalLifecycleMode(
    normalizeAdvisoryJourneyMode(
      resolveSingleProposalSearchParam(resolvedSearchParams.fromMode),
    ),
  );

  return (
    <ProposalDetailView
      proposalId={resolvedParams.proposalId}
      returnPortfolioId={returnPortfolioId}
      returnMode={returnMode}
    />
  );
}
