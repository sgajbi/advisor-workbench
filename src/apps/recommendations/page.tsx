import AdvisoryOverviewWorkspace from "@/features/proposals/components/advisory-overview-workspace";
import AdvisoryCopilotWorkspace from "@/features/proposals/components/advisory-copilot-workspace";
import AdvisoryOpportunitiesWorkspace from "@/features/proposals/components/advisory-opportunities-workspace";
import AdvisorCockpitWorkspace from "@/features/proposals/components/advisor-cockpit-workspace";
import BankDemoProofWorkspace from "@/features/proposals/components/bank-demo-proof-workspace";
import {
  getAdvisoryJourneyDefinition,
  normalizeAdvisoryJourneyMode,
} from "@/features/proposals/advisory-journey-navigation";
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
  const activeMode =
    requestedMode === "opportunities" ||
    requestedMode === "cockpit" ||
    requestedMode === "copilot" ||
    requestedMode === "proof"
      ? requestedMode
      : "overview";
  const definition = getAdvisoryJourneyDefinition(activeMode);
  return (
    <ProposalWorkspaceShell
      portfolioId={portfolioId}
      activeScreen="advisory"
      activeMode={activeMode}
      title={definition.title}
      subtitle={definition.description}
    >
      {activeMode === "cockpit" ? (
        <AdvisorCockpitWorkspace portfolioId={portfolioId} />
      ) : activeMode === "copilot" ? (
        <AdvisoryCopilotWorkspace portfolioId={portfolioId} />
      ) : activeMode === "proof" ? (
        <BankDemoProofWorkspace portfolioId={portfolioId} />
      ) : activeMode === "opportunities" ? (
        <AdvisoryOpportunitiesWorkspace portfolioId={portfolioId} />
      ) : (
        <AdvisoryOverviewWorkspace portfolioId={portfolioId} />
      )}
    </ProposalWorkspaceShell>
  );
}
