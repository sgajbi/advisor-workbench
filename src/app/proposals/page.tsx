import ProposalLifecycleWorkspace from "@/features/proposals/components/proposal-lifecycle-workspace";
import { normalizeAdvisoryJourneyMode } from "@/features/proposals/advisory-journey-navigation";
import {
  getProposalLifecycleModeDefinition,
  normalizeProposalLifecycleMode,
} from "@/features/proposals/proposal-lifecycle-workspace-view-model";
import ProposalWorkspaceShell, {
  resolveProposalPortfolioId,
} from "@/features/proposals/components/proposal-workspace-shell";

export default async function ProposalsPage({
  searchParams,
}: {
  searchParams?: Promise<{ portfolioId?: string; mode?: string }>;
}) {
  const resolvedSearchParams = searchParams ? await searchParams : {};
  const portfolioId = resolveProposalPortfolioId(
    resolvedSearchParams.portfolioId,
  );
  const activeMode = normalizeAdvisoryJourneyMode(resolvedSearchParams.mode);
  const lifecycleMode = normalizeProposalLifecycleMode(activeMode);
  const lifecycleDefinition = getProposalLifecycleModeDefinition(lifecycleMode);
  return (
    <ProposalWorkspaceShell
      portfolioId={portfolioId}
      activeScreen="proposal"
      activeMode={lifecycleMode}
      title={lifecycleDefinition.title}
      subtitle={lifecycleDefinition.subtitle}
      workflowContextPresentation={
        lifecycleMode === "suitability" ? "inline-boundary" : "rail"
      }
    >
      <ProposalLifecycleWorkspace
        key={`${portfolioId}:${lifecycleMode}`}
        portfolioId={portfolioId}
        mode={lifecycleMode}
      />
    </ProposalWorkspaceShell>
  );
}
