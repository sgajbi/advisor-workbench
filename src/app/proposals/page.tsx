import ProposalListView from "@/features/proposals/components/proposal-list-view";
import ProposalWorkspaceShell, {
  resolveProposalPortfolioId,
} from "@/features/proposals/components/proposal-workspace-shell";

export default async function ProposalsPage({
  searchParams,
}: {
  searchParams?: Promise<{ portfolioId?: string }>;
}) {
  const resolvedSearchParams = searchParams ? await searchParams : {};
  const portfolioId = resolveProposalPortfolioId(resolvedSearchParams.portfolioId);
  return (
    <ProposalWorkspaceShell
      portfolioId={portfolioId}
      activeScreen="proposal"
      title="Proposal Workspace"
      subtitle="Manage proposal drafts, lifecycle posture, and advisor-ready next actions."
    >
      <ProposalListView
        initialPortfolioId={portfolioId}
        title="Proposal Queue"
        subtitle="Review advisor-use proposal drafts by portfolio and workflow stage."
        createDraftHref={`/proposals/simulate?portfolioId=${encodeURIComponent(portfolioId)}`}
      />
    </ProposalWorkspaceShell>
  );
}
