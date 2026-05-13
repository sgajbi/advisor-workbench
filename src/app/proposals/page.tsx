import ProposalListView from "@/features/proposals/components/proposal-list-view";

export default async function ProposalsPage({
  searchParams,
}: {
  searchParams?: Promise<{ portfolioId?: string }>;
}) {
  const resolvedSearchParams = searchParams ? await searchParams : {};
  return <ProposalListView initialPortfolioId={resolvedSearchParams.portfolioId} />;
}
