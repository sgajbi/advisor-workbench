import ProposalDetailView from "@/features/proposals/components/proposal-detail-view";
import { normalizeAdvisoryJourneyMode } from "@/features/proposals/advisory-journey-navigation";
import { resolveProposalPortfolioId } from "@/features/proposals/components/proposal-workspace-shell";
import { normalizeProposalLifecycleMode } from "@/features/proposals/proposal-lifecycle-workspace-view-model";

type SearchParamValue = string | string[] | undefined;

type Props = {
  params: Promise<{
    proposalId: string;
  }>;
  searchParams?: Promise<{
    portfolioId?: SearchParamValue;
    fromMode?: SearchParamValue;
  }>;
};

function singleSearchParam(value: SearchParamValue): string | undefined {
  return typeof value === "string" ? value : undefined;
}

export default async function ProposalDetailPage({ params, searchParams }: Props) {
  const resolvedParams = await params;
  const resolvedSearchParams = searchParams ? await searchParams : {};
  const returnPortfolioId = resolveProposalPortfolioId(
    singleSearchParam(resolvedSearchParams.portfolioId),
  );
  const returnMode = normalizeProposalLifecycleMode(
    normalizeAdvisoryJourneyMode(singleSearchParam(resolvedSearchParams.fromMode)),
  );

  return (
    <ProposalDetailView
      proposalId={resolvedParams.proposalId}
      returnPortfolioId={returnPortfolioId}
      returnMode={returnMode}
    />
  );
}
