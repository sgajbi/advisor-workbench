import { resolvePreferredPortfolioId } from "@/features/canonical-portfolio-selection";

type PortfolioCatalogIdentity = {
  portfolio_id: string;
};

export function resolveSelectedPortfolioId(
  portfolios: PortfolioCatalogIdentity[],
  requestedPortfolioId: string | null | undefined
): string | null {
  const normalizedRequestedPortfolioId = requestedPortfolioId?.trim();
  if (normalizedRequestedPortfolioId) {
    return normalizedRequestedPortfolioId;
  }

  return resolvePreferredPortfolioId(portfolios, (item) => item.portfolio_id);
}
