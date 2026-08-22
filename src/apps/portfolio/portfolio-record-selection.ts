import {
  buildReviewContextHref,
  buildReviewContextNavigationHref,
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
  return buildReviewContextNavigationHref({
    pathname,
    searchParams,
    patch: {
      portfolioId,
      selectedRecordId,
    },
  });
}

export function buildPortfolioRelatedRecordHref({
  destinationPathname,
  sourceHref,
  portfolioId,
}: {
  destinationPathname: string;
  sourceHref: string;
  portfolioId: string;
}): string | null {
  const sourceUrl = new URL(sourceHref, "http://workbench.local");
  const reviewContextResult = parseReviewContext(sourceUrl.searchParams);
  if (reviewContextResult.status === "invalid") {
    return null;
  }

  return buildReviewContextHref(destinationPathname, {
    ...reviewContextResult.context,
    portfolioId,
    selectedRecordId: undefined,
    batchId: undefined,
  });
}
