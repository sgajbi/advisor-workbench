import ProposalLifecycleWorkspace from "@/features/proposals/components/proposal-lifecycle-workspace";
import { normalizeAdvisoryJourneyMode } from "@/features/proposals/advisory-journey-navigation";
import {
  getProposalLifecycleModeDefinition,
  normalizeProposalLifecycleMode,
} from "@/features/proposals/proposal-lifecycle-workspace-view-model";
import ProposalWorkspaceShell from "@/features/proposals/components/proposal-workspace-shell";
import ReviewContextPageRecovery from "@/shell/review-context-page-recovery";
import {
  parseReviewContext,
  type ReviewContextSearchParams,
} from "@/shell/review-context";
import { parseProposalSourceWindowContext } from "@/features/proposals/proposal-source-window-navigation";

export default async function ProposalsPage({
  searchParams,
}: {
  searchParams?: Promise<
    ReviewContextSearchParams & {
      mode?: string | readonly string[];
      cursor?: string | readonly string[];
      sourceWindow?: string | readonly string[];
    }
  >;
}) {
  const resolvedSearchParams = searchParams ? await searchParams : {};
  const reviewContextResult = parseReviewContext(resolvedSearchParams);
  if (reviewContextResult.status === "invalid") {
    return (
      <ReviewContextPageRecovery
        pageKey="proposal"
        pageTitle="Proposal Lifecycle"
        pageSubtitle="Review proposal readiness, decisions, and governed handoffs."
        body="The proposal-worklist address contains repeated or unsupported review context. No proposal queue was requested."
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
        pageTitle="Proposal Lifecycle"
        pageSubtitle="Review proposal readiness, decisions, and governed handoffs."
        body="Select a source-confirmed portfolio from My book before opening its proposal worklist. No demo portfolio was substituted."
        href="/book"
        actionLabel="Select a portfolio from My book"
      />
    );
  }

  const sourceWindowResult =
    parseProposalSourceWindowContext(resolvedSearchParams);
  if (sourceWindowResult.status === "invalid") {
    return (
      <ReviewContextPageRecovery
        pageKey="proposal"
        pageTitle="Proposal Lifecycle"
        pageSubtitle="Review proposal readiness, decisions, and permitted handoffs."
        body="The proposal-worklist address contains an unsupported source window. No proposal queue was requested."
        href="/book"
        actionLabel="Select a portfolio from My book"
      />
    );
  }

  const requestedMode =
    typeof resolvedSearchParams.mode === "string"
      ? resolvedSearchParams.mode
      : undefined;
  const activeMode = normalizeAdvisoryJourneyMode(requestedMode);
  const lifecycleMode = normalizeProposalLifecycleMode(activeMode);
  const lifecycleDefinition = getProposalLifecycleModeDefinition(lifecycleMode);
  return (
    <ProposalWorkspaceShell
      reviewContext={{ ...reviewContextResult.context, portfolioId }}
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
        reviewContext={{ ...reviewContextResult.context, portfolioId }}
        mode={lifecycleMode}
        initialSourceWindow={sourceWindowResult.context}
      />
    </ProposalWorkspaceShell>
  );
}
