import { resolvePreferredPortfolioId } from "@/features/canonical-portfolio-selection";
import { getPortfolioCatalog, getPortfolioWorkspaceShell } from "./api";
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
    resolvePreferredPortfolioId(portfolios, (item) => item.portfolio_id);
  const workspace = selectedPortfolioId
    ? await getPortfolioWorkspaceShell(selectedPortfolioId)
    : null;

  return (
    <PortfolioWorkspaceClient
      portfolios={portfolios}
      selectedPortfolioId={selectedPortfolioId}
      initialWorkspace={workspace}
    />
  );
}
