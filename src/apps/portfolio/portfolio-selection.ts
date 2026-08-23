type PortfolioCatalogIdentity = {
  portfolio_id: string;
};

type PortfolioWorkspaceIdentity = {
  portfolio: PortfolioCatalogIdentity;
};

export function resolveSelectedPortfolioId(
  portfolios: PortfolioCatalogIdentity[],
  requestedPortfolioId: string | null | undefined,
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

export function isPortfolioWorkspaceIdentityConfirmed(
  workspace: PortfolioWorkspaceIdentity | null | undefined,
  selectedPortfolioId: string | null | undefined,
): workspace is PortfolioWorkspaceIdentity {
  return Boolean(
    workspace &&
    selectedPortfolioId &&
    workspace.portfolio.portfolio_id === selectedPortfolioId,
  );
}
