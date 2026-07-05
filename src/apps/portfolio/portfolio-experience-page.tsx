import { getPortfolioCatalog, getPortfolioWorkspaceShell } from "./api";
import PortfolioWorkspaceClient from "./components/portfolio-workspace-client";
import { resolveSelectedPortfolioId } from "./portfolio-selection";

export default async function PortfolioExperiencePage({
  searchParams,
}: {
  searchParams: Promise<{ portfolioId?: string }>;
}) {
  const portfolios = await getPortfolioCatalog();
  const resolvedSearch = await searchParams;
  const selectedPortfolioId = resolveSelectedPortfolioId(portfolios, resolvedSearch.portfolioId);
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
