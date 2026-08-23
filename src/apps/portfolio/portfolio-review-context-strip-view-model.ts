import type { ReviewContextStripModel } from "@/design-system";

import { formatBookingCenter, formatBusinessDate, formatStatus } from "./formatters";
import type { PortfolioWorkspace } from "./types";

export type PortfolioReviewContextStripOptions = {
  businessDate?: string | null;
  reportingCurrency?: string | null;
  notice?: ReviewContextStripModel["notice"];
};

export function buildPortfolioReviewContextStrip(
  workspace: PortfolioWorkspace,
  options: PortfolioReviewContextStripOptions = {},
): ReviewContextStripModel {
  const mandateType = workspace.profile.portfolio_type
    ? formatStatus(workspace.profile.portfolio_type)
    : null;
  const bookingCenter = workspace.portfolio.booking_center_code
    ? formatBookingCenter(workspace.portfolio.booking_center_code)
    : null;
  const businessDate = options.businessDate ?? workspace.as_of_date;
  const reportingCurrency =
    options.reportingCurrency ?? workspace.portfolio.base_currency;
  const sourceState = [
    workspace.portfolio.client_id,
    mandateType,
    bookingCenter,
    businessDate,
    reportingCurrency,
  ].every(Boolean)
    ? "confirmed"
    : "partial";

  return {
    portfolioName:
      workspace.portfolio.display_name || workspace.portfolio.portfolio_id,
    portfolioId: workspace.portfolio.portfolio_id,
    clientId: workspace.portfolio.client_id,
    mandateType,
    bookingCenter,
    businessDate: businessDate ? formatBusinessDate(businessDate) : null,
    reportingCurrency,
    sourceState,
    notice: options.notice,
  };
}

export function buildUnavailablePortfolioReviewContextStrip(): ReviewContextStripModel {
  return {
    portfolioName: "Portfolio not confirmed",
    sourceState: "unavailable",
  };
}
