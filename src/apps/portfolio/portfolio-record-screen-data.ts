import { parseReviewContext } from "@/shell/review-context";

import {
  getPortfolioCatalog,
  getPortfolioWorkspaceDetailedDetails,
  getPortfolioWorkspaceShell,
  getPortfolioWorkspaceSummaryDetails,
  mergePortfolioWorkspace,
} from "./api";
import { resolveSelectedPortfolioId } from "./portfolio-selection";
import { resolvePortfolioReviewControls } from "./portfolio-workspace-controls";
import { resolvePortfolioRecordScreenWindow } from "./portfolio-record-screen-view-model";
import type { PortfolioWorkspace } from "./types";
import type { PortfolioTimeWindow } from "./view-model";

export type PortfolioRecordScreenData = {
  portfolioId: string | null;
  workspace: PortfolioWorkspace | null;
  startDate?: string;
  endDate?: string;
  timeWindow?: PortfolioTimeWindow;
  reviewContextError?: string;
};

export type PortfolioRecordScreenSearchParams = Record<
  string,
  string | readonly string[] | undefined
>;

export async function loadPortfolioRecordScreenData({
  searchParams,
}: {
  searchParams: Promise<PortfolioRecordScreenSearchParams>;
}): Promise<PortfolioRecordScreenData> {
  const resolvedSearch = await searchParams;
  const reviewContextResult = parseReviewContext(resolvedSearch);
  if (reviewContextResult.status === "invalid") {
    return {
      portfolioId: null,
      workspace: null,
      reviewContextError:
        "The record-view address contains repeated or unsupported review context. No portfolio records were requested.",
    };
  }
  if (!reviewContextResult.context.portfolioId) {
    return {
      portfolioId: null,
      workspace: null,
      reviewContextError:
        "Select a source-confirmed portfolio from My book before opening portfolio records. No default portfolio was substituted.",
    };
  }

  const portfolios = await getPortfolioCatalog();
  const selectedPortfolioId = resolveSelectedPortfolioId(
    portfolios,
    reviewContextResult.context.portfolioId,
  );
  const shell = selectedPortfolioId ? await getPortfolioWorkspaceShell(selectedPortfolioId) : null;

  if (!selectedPortfolioId || !shell) {
    return {
      portfolioId: selectedPortfolioId,
      workspace: null,
      reviewContextError:
        "The selected portfolio could not be confirmed for this record view. No alternative portfolio was substituted.",
    };
  }

  const controlResolution = resolvePortfolioReviewControls(
    shell,
    reviewContextResult.context,
  );
  if (controlResolution.status === "invalid") {
    return {
      portfolioId: selectedPortfolioId,
      workspace: null,
      reviewContextError:
        "The selected date, period, or reporting currency is not supported for these portfolio records.",
    };
  }

  const controls = controlResolution.controls;
  const window = resolvePortfolioRecordScreenWindow(
    controls.asOfDate,
    controls.timeWindow,
    shell.profile.open_date,
  );
  const [summaryDetails, detailedDetails] = await Promise.all([
    getPortfolioWorkspaceSummaryDetails(selectedPortfolioId, {
      asOfDate: controls.asOfDate,
      reportingCurrency: controls.reportingCurrency,
      includeProjected: true,
      timeWindow: controls.timeWindow,
      reportStartDate: window.startDate,
      reportEndDate: window.endDate,
      includeWorkflowActions: false,
    }),
    getPortfolioWorkspaceDetailedDetails(selectedPortfolioId, {
      asOfDate: controls.asOfDate,
      reportingCurrency: controls.reportingCurrency,
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
    timeWindow: controls.timeWindow,
  };
}
