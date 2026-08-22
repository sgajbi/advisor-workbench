import ProposalDetailView from "@/features/proposals/components/proposal-detail-view";
import ReviewContextRecovery from "@/shell/review-context-recovery";
import { normalizeAdvisoryJourneyMode } from "@/features/proposals/advisory-journey-navigation";
import { normalizeProposalLifecycleMode } from "@/features/proposals/proposal-lifecycle-workspace-view-model";
import {
  parseReviewContext,
  type ReviewContextSearchParams,
} from "@/shell/review-context";

type Props = {
  params: Promise<{
    proposalId: string;
  }>;
  searchParams?: Promise<
    ReviewContextSearchParams & {
      fromMode?: string | readonly string[];
    }
  >;
};

export default async function ProposalDetailPage({ params, searchParams }: Props) {
  const resolvedParams = await params;
  const resolvedSearchParams = searchParams ? await searchParams : {};
  const reviewContextResult = parseReviewContext(resolvedSearchParams);
  if (reviewContextResult.status === "invalid") {
    return (
      <ReviewContextRecovery
        body="The proposal address contains repeated or unsupported review context. No proposal record was requested."
        href="/book"
        actionLabel="Select a portfolio from My book"
      />
    );
  }
  const returnPortfolioId =
    reviewContextResult.context.portfolioId;
  const requestedReturnMode =
    typeof resolvedSearchParams.fromMode === "string"
      ? resolvedSearchParams.fromMode
      : undefined;
  const returnMode = requestedReturnMode
    ? normalizeProposalLifecycleMode(
        normalizeAdvisoryJourneyMode(requestedReturnMode),
      )
    : undefined;

  return (
    <ProposalDetailView
      proposalId={resolvedParams.proposalId}
      returnPortfolioId={returnPortfolioId}
      returnReviewContext={reviewContextResult.context}
      returnMode={returnMode}
    />
  );
}
