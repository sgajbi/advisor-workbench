import { StatusChip, WorkspaceHeader } from "@/design-system";

import { getPortfolioCatalog, getPortfolioWorkspace } from "./api";
import PortfolioUnavailableWorkspace from "./components/portfolio-unavailable-workspace";
import PortfolioWorkspaceView from "./components/portfolio-workspace";

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
    <main className="page-container">
      <WorkspaceHeader
        title="Portfolio"
        meta={
          <>
            <StatusChip>{portfolios.length} portfolios</StatusChip>
            <StatusChip tone={portfolios.length ? "success" : "warn"}>
              {portfolios.length ? "Catalog live" : "Catalog unavailable"}
            </StatusChip>
          </>
        }
      />

      {!portfolios.length ? (
        <PortfolioUnavailableWorkspace />
      ) : (
        <PortfolioWorkspaceView
          portfolios={portfolios}
          selectedPortfolioId={selectedPortfolioId}
          workspace={workspace}
        />
      )}
    </main>
  );
}
