import ProposalDetailView from "@/features/proposals/components/proposal-detail-view";
import ReviewContextPageRecovery from "@/shell/review-context-page-recovery";
import { normalizeAdvisoryJourneyMode } from "@/features/proposals/advisory-journey-navigation";
import { normalizeProposalLifecycleMode } from "@/features/proposals/proposal-lifecycle-workspace-view-model";
import {
  parseReviewContext,
  type ReviewContextSearchParams,
} from "@/shell/review-context";
import { parseProposalSourceWindowContext } from "@/features/proposals/proposal-source-window-navigation";

type Props = {
  params: Promise<{
    proposalId: string;
  }>;
  searchParams?: Promise<
    ReviewContextSearchParams & {
      fromMode?: string | readonly string[];
      cursor?: string | readonly string[];
      sourceWindow?: string | readonly string[];
    }
  >;
};

export default async function ProposalDetailPage({ params, searchParams }: Props) {
  const resolvedParams = await params;
  const resolvedSearchParams = searchParams ? await searchParams : {};
  const reviewContextResult = parseReviewContext(resolvedSearchParams);
  if (reviewContextResult.status === "invalid") {
    return (
      <ReviewContextPageRecovery
        pageKey="proposal"
        pageTitle="Proposal Review"
        pageSubtitle="Review proposal evidence, decisions, and lifecycle posture."
        body="The proposal address contains repeated or unsupported review context. No proposal record was requested."
        href="/book"
        actionLabel="Select a portfolio from My book"
      />
    );
  }
  const returnPortfolioId =
    reviewContextResult.context.portfolioId;
  const sourceWindowResult =
    parseProposalSourceWindowContext(resolvedSearchParams);
  if (sourceWindowResult.status === "invalid") {
    return (
      <ReviewContextPageRecovery
        pageKey="proposal"
        pageTitle="Proposal Review"
        pageSubtitle="Review proposal evidence, decisions, and lifecycle status."
        body="The proposal address contains an unsupported source window. No proposal record was requested."
        href="/book"
        actionLabel="Select a portfolio from My book"
      />
    );
  }
  const requestedReturnMode =
    typeof resolvedSearchParams.fromMode === "string"
      ? resolvedSearchParams.fromMode
      : undefined;
  const normalizedReturnMode = requestedReturnMode
    ? normalizeAdvisoryJourneyMode(requestedReturnMode)
    : undefined;
  const returnMode =
    requestedReturnMode?.trim().toLowerCase() === "overview"
      ? "overview"
      : normalizedReturnMode
        ? normalizeProposalLifecycleMode(normalizedReturnMode)
        : undefined;

  return (
    <ProposalDetailView
      proposalId={resolvedParams.proposalId}
      returnPortfolioId={returnPortfolioId}
      returnReviewContext={reviewContextResult.context}
      returnMode={returnMode}
      returnSourceWindow={sourceWindowResult.context}
    />
  );
}
