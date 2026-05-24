import AdvisoryOverviewWorkspace from "@/features/proposals/components/advisory-overview-workspace";
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
      <AdvisoryOverviewWorkspace portfolioId={portfolioId} />
    </ProposalWorkspaceShell>
  );
}
