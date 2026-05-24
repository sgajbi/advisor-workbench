import ProposalListView from "@/features/proposals/components/proposal-list-view";
import ProposalWorkspaceShell, {
  resolveProposalPortfolioId,
} from "@/features/proposals/components/proposal-workspace-shell";

export default async function RecommendationsAppPage({
  searchParams,
}: {
  searchParams: Promise<{ portfolioId?: string }>;
}) {
  const resolvedSearch = await searchParams;
  const portfolioId = resolveProposalPortfolioId(resolvedSearch.portfolioId);
  return (
    <ProposalWorkspaceShell
      portfolioId={portfolioId}
      activeScreen="advisory"
      activeMode="overview"
      title="Advisory Overview"
      subtitle="Review live advisory proposals, readiness gates, and next actions in the portfolio workflow."
    >
      <ProposalListView
        initialPortfolioId={portfolioId}
        title="Advisory Queue"
        subtitle="Prioritize advisor actions by workflow stage without leaving the front-office workbench."
        createDraftHref={`/proposals/simulate?portfolioId=${encodeURIComponent(portfolioId)}`}
      />
    </ProposalWorkspaceShell>
  );
}
