type PortfolioCatalogIdentity = {
  portfolio_id: string;
};

export function resolveSelectedPortfolioId(
  portfolios: PortfolioCatalogIdentity[],
  requestedPortfolioId: string | null | undefined
): string | null {
  const normalizedRequestedPortfolioId = requestedPortfolioId?.trim();
  if (!normalizedRequestedPortfolioId) {
    return null;
  }

  return portfolios.some(
    (portfolio) => portfolio.portfolio_id === normalizedRequestedPortfolioId,
  )
    ? normalizedRequestedPortfolioId
    : null;
}
