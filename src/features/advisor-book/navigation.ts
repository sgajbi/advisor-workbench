export function buildPortfolioContextHref({
  pathname,
  searchParams,
  portfolioId,
}: {
  pathname: string;
  searchParams: URLSearchParams | Readonly<URLSearchParams>;
  portfolioId: string;
}): string {
  const query = new URLSearchParams(searchParams.toString());
  query.delete("portfolioId");

  if (pathname === "/book") {
    const portfolioQuery = new URLSearchParams();
    const asOfDate = query.get("asOfDate");
    if (asOfDate) {
      portfolioQuery.set("asOfDate", asOfDate);
    }
    portfolioQuery.set("portfolioId", portfolioId);
    return withQuery("/portfolio", portfolioQuery);
  }

  const workbenchMatch = pathname.match(/^\/workbench\/[^/]+$/);
  if (workbenchMatch) {
    return withQuery(`/workbench/${encodeURIComponent(portfolioId)}`, query);
  }

  query.set("portfolioId", portfolioId);
  return withQuery(pathname || "/portfolio", query);
}

function withQuery(pathname: string, query: URLSearchParams): string {
  const suffix = query.toString();
  return suffix ? `${pathname}?${suffix}` : pathname;
}
