import {
  buildReviewContextHref,
  parseReviewContext,
  scopeReviewContextForWorkspace,
} from "@/shell/review-context";

export function buildPortfolioContextHref({
  pathname,
  searchParams,
  portfolioId,
}: {
  pathname: string;
  searchParams: URLSearchParams | Readonly<URLSearchParams>;
  portfolioId: string;
}): string {
  const reviewContextResult = parseReviewContext(searchParams);
  if (reviewContextResult.status === "invalid") {
    return "/book";
  }
  const changesPortfolio =
    reviewContextResult.context.portfolioId !== undefined &&
    reviewContextResult.context.portfolioId !== portfolioId;
  const workspaceContext = {
    ...scopeReviewContextForWorkspace(reviewContextResult.context),
    portfolioId,
    ...(changesPortfolio ? { reportingCurrency: undefined } : {}),
  };
  const query = new URLSearchParams(searchParams.toString());

  if (pathname === "/book") {
    return buildReviewContextHref("/portfolio", {
      portfolioId,
      asOfDate: workspaceContext.asOfDate,
    });
  }

  const workbenchMatch = pathname.match(/^\/workbench\/[^/]+$/);
  if (workbenchMatch) {
    return buildReviewContextHref(
      withQuery(`/workbench/${encodeURIComponent(portfolioId)}`, query),
      workspaceContext,
    );
  }

  return buildReviewContextHref(
    withQuery(pathname || "/portfolio", query),
    workspaceContext,
  );
}

function withQuery(pathname: string, query: URLSearchParams): string {
  const suffix = query.toString();
  return suffix ? `${pathname}?${suffix}` : pathname;
}
