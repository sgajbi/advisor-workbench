import ProposalSimulateForm from "@/features/proposals/components/proposal-simulate-form";
import { isBusinessDateValue } from "@/design-system/utils/financial-formatters";
import ProposalWorkspaceShell, {
  resolveProposalPortfolioId,
} from "@/features/proposals/components/proposal-workspace-shell";
import { buildSimulationProposalWorkflowContext } from "@/features/proposals/proposal-workflow-context-view-model";
import {
  type ProposalRouteSearchParam,
  resolveSingleProposalSearchParam,
} from "@/features/proposals/proposal-route-search-params";

export default async function ProposalSimulatePage({
  searchParams,
}: {
  searchParams: Promise<{
    portfolioId?: ProposalRouteSearchParam;
    asOfDate?: ProposalRouteSearchParam;
  }>;
}) {
  const resolvedSearchParams = await searchParams;
  const portfolioId = resolveProposalPortfolioId(
    resolveSingleProposalSearchParam(resolvedSearchParams.portfolioId),
  );
  const requestedAsOfDate = resolveSingleProposalSearchParam(
    resolvedSearchParams.asOfDate,
  )?.trim();
  const initialAsOfDate = isBusinessDateValue(requestedAsOfDate)
    ? requestedAsOfDate ?? ""
    : "";
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
      <ProposalSimulateForm
        initialPortfolioId={portfolioId}
        initialAsOfDate={initialAsOfDate}
      />
    </ProposalWorkspaceShell>
  );
}
