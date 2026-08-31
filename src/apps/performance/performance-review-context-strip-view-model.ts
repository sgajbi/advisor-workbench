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
import { getPerformanceDisplayCurrency } from "./performance-review-context";

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
    const displayCurrency = workspace
      ? getPerformanceDisplayCurrency(workspace, workspace.portfolio.base_currency)
      : portfolioSource.baseCurrency;
    return buildReviewContextStripModel(
      {
        ...portfolioSource,
        businessDate: workspace?.effective_as_of_date
          ? formatBusinessDateValue(workspace.effective_as_of_date, { nullDisplay: "" }) || null
          : portfolioSource.businessDate,
        baseCurrency:
          workspace?.portfolio.base_currency ?? portfolioSource.baseCurrency,
        acceptedReportingCurrency:
          workspace?.reporting_currency_state === "applied" ? displayCurrency : null,
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
        formatBusinessDateValue(workspace.effective_as_of_date, { nullDisplay: "" }) ||
        null,
      baseCurrency: workspace.portfolio.base_currency,
      acceptedReportingCurrency:
        workspace.reporting_currency_state === "applied"
          ? getPerformanceDisplayCurrency(workspace, workspace.portfolio.base_currency)
          : null,
    }, notice ?? {
        label: "Portfolio context limited",
        message:
          "Performance evidence is available, but supporting mandate context could not be confirmed.",
        tone: "attention",
      });
  }

  return buildUnavailableReviewContextStrip(notice);
}
