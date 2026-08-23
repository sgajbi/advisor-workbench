import type { ReviewContextStripModel } from "@/design-system";
import { formatBusinessDateValue } from "@/design-system/utils/financial-formatters";
import { formatBusinessBookingCenter } from "@/features/workbench/business-label-formatters";
import type {
  WorkbenchPerformanceWorkspace,
  WorkbenchPerformanceWorkspaceSummary,
} from "@/features/workbench/types";
import type { PortfolioWorkspace } from "@/apps/portfolio/types";
import { buildPortfolioReviewContextStrip } from "@/apps/portfolio/portfolio-review-context-strip-view-model";

type PerformanceContextSource =
  | WorkbenchPerformanceWorkspace
  | WorkbenchPerformanceWorkspaceSummary;

export function buildPerformanceReviewContextStrip({
  workspace,
  portfolioContext,
  notice,
}: {
  workspace: PerformanceContextSource | null;
  portfolioContext: PortfolioWorkspace | null;
  notice?: ReviewContextStripModel["notice"];
}): ReviewContextStripModel {
  const performancePortfolioId = workspace?.portfolio_id ?? null;
  const contextMatchesPerformance =
    !performancePortfolioId ||
    portfolioContext?.portfolio.portfolio_id === performancePortfolioId;

  if (portfolioContext && contextMatchesPerformance) {
    return buildPortfolioReviewContextStrip(portfolioContext, {
      businessDate: workspace?.as_of_date ?? portfolioContext.as_of_date,
      reportingCurrency:
        workspace?.portfolio.base_currency ??
        portfolioContext.portfolio.base_currency,
      notice,
    });
  }

  if (workspace) {
    return {
      portfolioName: "Performance portfolio",
      portfolioId: workspace.portfolio_id,
      clientId: workspace.portfolio.client_id,
      bookingCenter: formatBusinessBookingCenter(
        workspace.portfolio.booking_center_code,
      ),
      businessDate: formatBusinessDateValue(workspace.as_of_date, {
        nullDisplay: "Not confirmed",
      }),
      reportingCurrency: workspace.portfolio.base_currency,
      sourceState: "partial",
      notice: notice ?? {
        label: "Portfolio context limited",
        message:
          "Performance evidence is available, but supporting mandate context could not be confirmed.",
        tone: "attention",
      },
    };
  }

  return {
    portfolioName: "Portfolio not confirmed",
    sourceState: "unavailable",
    notice,
  };
}
