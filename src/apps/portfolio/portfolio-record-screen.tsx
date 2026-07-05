import {
  getPortfolioCatalog,
  getPortfolioWorkspaceDetailedDetails,
  getPortfolioWorkspaceShell,
  getPortfolioWorkspaceSummaryDetails,
  mergePortfolioWorkspace,
} from "./api";
import PortfolioRecordScreenClient from "./components/portfolio-record-screen-client";
import { resolveSelectedPortfolioId } from "./portfolio-selection";
import {
  type PortfolioRecordScreenKind,
  resolvePortfolioRecordScreenWindow,
} from "./portfolio-record-screen-view-model";

export type { PortfolioRecordScreenKind } from "./portfolio-record-screen-view-model";

export default async function PortfolioRecordScreen({
  searchParams,
  screen,
}: {
  searchParams: Promise<{ portfolioId?: string }>;
  screen: PortfolioRecordScreenKind;
}) {
  const portfolios = await getPortfolioCatalog();
  const resolvedSearch = await searchParams;
  const selectedPortfolioId = resolveSelectedPortfolioId(portfolios, resolvedSearch.portfolioId);
  const shell = selectedPortfolioId ? await getPortfolioWorkspaceShell(selectedPortfolioId) : null;

  if (!selectedPortfolioId || !shell) {
    return <PortfolioRecordScreenClient screen={screen} portfolioId={selectedPortfolioId} workspace={null} />;
  }

  const window = resolvePortfolioRecordScreenWindow(shell.as_of_date);
  const [summaryDetails, detailedDetails] = await Promise.all([
    getPortfolioWorkspaceSummaryDetails(selectedPortfolioId, {
      asOfDate: shell.as_of_date,
      reportingCurrency: shell.portfolio.base_currency,
      includeProjected: true,
      timeWindow: "30D",
      reportStartDate: window.startDate,
      reportEndDate: window.endDate,
    }),
    getPortfolioWorkspaceDetailedDetails(selectedPortfolioId, {
      asOfDate: shell.as_of_date,
      reportingCurrency: shell.portfolio.base_currency,
      startDate: window.startDate,
      endDate: window.endDate,
    }),
  ]);

  const workspace = mergePortfolioWorkspace(shell, {
    ...(summaryDetails ?? {}),
    ...(detailedDetails ?? {}),
  });

  return (
    <PortfolioRecordScreenClient
      screen={screen}
      portfolioId={selectedPortfolioId}
      workspace={workspace}
      startDate={window.startDate}
      endDate={window.endDate}
    />
  );
}
