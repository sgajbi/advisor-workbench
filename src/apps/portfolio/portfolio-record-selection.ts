import {
  buildReviewContextHref,
  parseReviewContext,
  type ReviewContextSearchParams,
} from "@/shell/review-context";

export function buildPortfolioRecordSelectionHref({
  pathname,
  searchParams,
  portfolioId,
  selectedRecordId,
}: {
  pathname: string;
  searchParams: ReviewContextSearchParams & { toString(): string };
  portfolioId: string;
  selectedRecordId?: string;
}): string | null {
  const reviewContextResult = parseReviewContext(searchParams);
  if (reviewContextResult.status === "invalid") {
    return null;
  }

  const currentQuery = searchParams.toString();
  const currentHref = `${pathname}${currentQuery ? `?${currentQuery}` : ""}`;
  return buildReviewContextHref(currentHref, {
    ...reviewContextResult.context,
    portfolioId,
    selectedRecordId,
  });
}
