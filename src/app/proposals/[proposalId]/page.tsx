import ProposalDetailView from "@/features/proposals/components/proposal-detail-view";
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
  const returnPortfolioId =
    reviewContextResult.status === "valid"
      ? reviewContextResult.context.portfolioId
      : undefined;
  const requestedReturnMode =
    reviewContextResult.status === "valid" &&
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
      returnMode={returnMode}
    />
  );
}
