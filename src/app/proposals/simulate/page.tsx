import ProposalSimulateForm from "@/features/proposals/components/proposal-simulate-form";
import ProposalWorkspaceShell from "@/features/proposals/components/proposal-workspace-shell";
import { buildSimulationProposalWorkflowContext } from "@/features/proposals/proposal-workflow-context-view-model";
import ReviewContextPageRecovery from "@/shell/review-context-page-recovery";
import {
  parseReviewContext,
  type ReviewContextSearchParams,
} from "@/shell/review-context";

export default async function ProposalSimulatePage({
  searchParams,
}: {
  searchParams: Promise<ReviewContextSearchParams>;
}) {
  const resolvedSearchParams = await searchParams;
  const reviewContextResult = parseReviewContext(resolvedSearchParams);
  if (reviewContextResult.status === "invalid") {
    return (
      <ReviewContextPageRecovery
        pageKey="proposal"
        pageTitle="Proposal Workspace"
        pageSubtitle="Build and test an advisor-use proposal before routing it for review."
        body="The proposal address contains repeated or unsupported review context. No portfolio was substituted and no proposal draft was opened."
        href="/book"
        actionLabel="Select a portfolio from My book"
      />
    );
  }

  const portfolioId = reviewContextResult.context.portfolioId;
  if (!portfolioId) {
    return (
      <ReviewContextPageRecovery
        pageKey="proposal"
        pageTitle="Proposal Workspace"
        pageSubtitle="Build and test an advisor-use proposal before routing it for review."
        body="Select a source-confirmed portfolio from My book before starting a proposal. No demo portfolio was substituted."
        href="/book"
        actionLabel="Select a portfolio from My book"
      />
    );
  }

  const initialAsOfDate = reviewContextResult.context.asOfDate ?? "";
  const initialReportingCurrency =
    reviewContextResult.context.reportingCurrency ?? "";
  return (
    <ProposalWorkspaceShell
      reviewContext={{ ...reviewContextResult.context, portfolioId }}
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
        initialReportingCurrency={initialReportingCurrency}
      />
    </ProposalWorkspaceShell>
  );
}
