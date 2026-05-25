import AdvisoryOverviewWorkspace from "@/features/proposals/components/advisory-overview-workspace";
import AdvisoryOpportunitiesWorkspace from "@/features/proposals/components/advisory-opportunities-workspace";
import { normalizeAdvisoryJourneyMode } from "@/features/proposals/advisory-journey-navigation";
import ProposalWorkspaceShell, {
  resolveProposalPortfolioId,
} from "@/features/proposals/components/proposal-workspace-shell";

export default async function RecommendationsAppPage({
  searchParams,
}: {
  searchParams: Promise<{ portfolioId?: string; mode?: string }>;
}) {
  const resolvedSearch = await searchParams;
  const portfolioId = resolveProposalPortfolioId(resolvedSearch.portfolioId);
  const requestedMode = normalizeAdvisoryJourneyMode(resolvedSearch.mode);
  const activeMode = requestedMode === "opportunities" ? "opportunities" : "overview";
  const title = activeMode === "opportunities" ? "Opportunities And Ideas" : "Advisory Overview";
  return (
    <ProposalWorkspaceShell
      portfolioId={portfolioId}
      activeScreen="advisory"
      activeMode={activeMode}
      title={title}
      subtitle="Review live advisory proposals, readiness gates, and next actions in the portfolio workflow."
    >
      {activeMode === "opportunities" ? (
        <AdvisoryOpportunitiesWorkspace portfolioId={portfolioId} />
      ) : (
        <AdvisoryOverviewWorkspace portfolioId={portfolioId} />
      )}
    </ProposalWorkspaceShell>
  );
}
