import {
  buildReviewContextNavigationHref,
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
