import {
  getPortfolioCatalog,
  getPortfolioWorkspaceDetailedDetails,
  getPortfolioWorkspaceShell,
  getPortfolioWorkspaceSummaryDetails,
  mergePortfolioWorkspace,
} from "./api";
import { resolveSelectedPortfolioId } from "./portfolio-selection";
import { resolvePortfolioRecordScreenWindow } from "./portfolio-record-screen-view-model";
import type { PortfolioWorkspace } from "./types";

export type PortfolioRecordScreenData = {
  portfolioId: string | null;
  workspace: PortfolioWorkspace | null;
  startDate?: string;
  endDate?: string;
};

export async function loadPortfolioRecordScreenData({
  searchParams,
}: {
  searchParams: Promise<{ portfolioId?: string }>;
}): Promise<PortfolioRecordScreenData> {
  const portfolios = await getPortfolioCatalog();
  const resolvedSearch = await searchParams;
  const selectedPortfolioId = resolveSelectedPortfolioId(portfolios, resolvedSearch.portfolioId);
  const shell = selectedPortfolioId ? await getPortfolioWorkspaceShell(selectedPortfolioId) : null;

  if (!selectedPortfolioId || !shell) {
    return {
      portfolioId: selectedPortfolioId,
      workspace: null,
    };
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
      includeWorkflowActions: false,
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
    record_data_availability: {
      positions: summaryDetails ? "ready" : "unavailable",
      liquidity: detailedDetails?.record_data_availability.liquidity ?? "unavailable",
      transactions: detailedDetails?.record_data_availability.transactions ?? "unavailable",
    },
  });

  return {
    portfolioId: selectedPortfolioId,
    workspace,
    startDate: window.startDate,
    endDate: window.endDate,
  };
}
