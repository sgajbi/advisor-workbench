import ProposalSimulateForm from "@/features/proposals/components/proposal-simulate-form";
import ProposalWorkspaceShell, {
  resolveProposalPortfolioId,
} from "@/features/proposals/components/proposal-workspace-shell";
import { buildSimulationProposalWorkflowContext } from "@/features/proposals/proposal-workflow-context-view-model";

export default async function ProposalSimulatePage({
  searchParams,
}: {
  searchParams: Promise<{ portfolioId?: string }>;
}) {
  const resolvedSearchParams = await searchParams;
  const portfolioId = resolveProposalPortfolioId(
    resolvedSearchParams.portfolioId,
  );
  return (
    <ProposalWorkspaceShell
      portfolioId={portfolioId}
      activeScreen="proposal"
      activeMode="proposal-builder"
      title="Proposal Workspace"
      subtitle="Build and test an advisor-use proposal before routing it for review."
      workflowContext={buildSimulationProposalWorkflowContext({ portfolioId })}
      workflowContextPresentation="inline-boundary"
    >
      <ProposalSimulateForm initialPortfolioId={portfolioId} />
    </ProposalWorkspaceShell>
  );
}
