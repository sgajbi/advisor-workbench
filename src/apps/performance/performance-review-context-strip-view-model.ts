import type { ReviewContextStripModel } from "@/design-system";
import { formatBusinessDateValue } from "@/design-system/utils/financial-formatters";
import { formatBusinessBookingCenter } from "@/features/workbench/business-label-formatters";
import {
  buildReviewContextStripModel,
  buildUnavailableReviewContextStrip,
} from "@/shell/review-context-strip-view-model";
import type {
  WorkbenchPerformanceWorkspace,
  WorkbenchPerformanceWorkspaceSummary,
} from "@/features/workbench/types";
import type { PortfolioWorkspace } from "@/apps/portfolio/types";
import { buildPortfolioReviewContextSource } from "@/apps/portfolio/portfolio-review-context-strip-view-model";

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
    const portfolioSource = buildPortfolioReviewContextSource(portfolioContext);
    return buildReviewContextStripModel(
      {
        ...portfolioSource,
        businessDate: workspace?.as_of_date
          ? formatBusinessDateValue(workspace.as_of_date, { nullDisplay: "" }) || null
          : portfolioSource.businessDate,
        baseCurrency:
          workspace?.portfolio.base_currency ?? portfolioSource.baseCurrency,
        acceptedReportingCurrency: null,
      },
      notice,
    );
  }

  if (workspace) {
    return buildReviewContextStripModel({
      portfolioName: workspace.portfolio_id,
      portfolioId: workspace.portfolio_id,
      clientId: workspace.portfolio.client_id,
      bookingCenter: formatBusinessBookingCenter(
        workspace.portfolio.booking_center_code,
      ),
      businessDate:
        formatBusinessDateValue(workspace.as_of_date, { nullDisplay: "" }) ||
        null,
      baseCurrency: workspace.portfolio.base_currency,
    }, notice ?? {
        label: "Portfolio context limited",
        message:
          "Performance evidence is available, but supporting mandate context could not be confirmed.",
        tone: "attention",
      });
  }

  return buildUnavailableReviewContextStrip(notice);
}
