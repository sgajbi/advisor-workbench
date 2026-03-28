import { getPortfolioCatalog, getPortfolioWorkspace } from "./api";
import PortfolioWorkspaceClient from "./components/portfolio-workspace-client";

export default async function PortfolioExperiencePage({
  searchParams,
}: {
  searchParams: Promise<{ portfolioId?: string }>;
}) {
  const portfolios = await getPortfolioCatalog();
  const resolvedSearch = await searchParams;
  const selectedPortfolioId =
    portfolios.find((item) => item.portfolio_id === resolvedSearch.portfolioId)?.portfolio_id ??
    portfolios[0]?.portfolio_id ??
    null;
  const workspace = selectedPortfolioId
    ? await getPortfolioWorkspace(selectedPortfolioId)
    : null;

  return (
    <PortfolioWorkspaceClient
      portfolios={portfolios}
      selectedPortfolioId={selectedPortfolioId}
      initialWorkspace={workspace}
    />
  );
}
