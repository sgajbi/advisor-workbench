import ProposalListView from "@/features/proposals/components/proposal-list-view";

export default async function RecommendationsAppPage({
  searchParams,
}: {
  searchParams: Promise<{ portfolioId?: string }>;
}) {
  const resolvedSearch = await searchParams;
  return (
    <ProposalListView
      initialPortfolioId={resolvedSearch.portfolioId}
      title="Advisory Workspace"
      subtitle="Review live advisory proposals, readiness gates, and next actions without leaving the advisor workflow."
      createDraftHref={
        resolvedSearch.portfolioId
          ? `/proposals/simulate?portfolioId=${encodeURIComponent(resolvedSearch.portfolioId)}`
          : "/proposals/simulate"
      }
    />
  );
}
