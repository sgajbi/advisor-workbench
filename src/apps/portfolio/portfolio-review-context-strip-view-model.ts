import type { ReviewContextStripModel } from "@/design-system";
import { formatBusinessBookingCenter } from "@/features/workbench/business-label-formatters";
import {
  buildReviewContextStripModel,
  type ReviewContextSource,
} from "@/shell/review-context-strip-view-model";

import { formatBusinessDate, formatStatus } from "./formatters";
import type { PortfolioWorkspace } from "./types";

export type PortfolioReviewContextStripOptions = {
  notice?: ReviewContextStripModel["notice"];
};

export function buildPortfolioReviewContextStrip(
  workspace: PortfolioWorkspace,
  options: PortfolioReviewContextStripOptions = {},
): ReviewContextStripModel {
  return buildReviewContextStripModel(
    buildPortfolioReviewContextSource(workspace),
    options.notice,
  );
}

export function buildPortfolioReviewContextSource(
  workspace: PortfolioWorkspace,
): ReviewContextSource {
  const mandateType = workspace.profile.portfolio_type
    ? formatStatus(workspace.profile.portfolio_type)
    : null;
  const bookingCenter = workspace.portfolio.booking_center_code
    ? formatBusinessBookingCenter(workspace.portfolio.booking_center_code)
    : null;
  return {
    portfolioName:
      workspace.portfolio.display_name || workspace.portfolio.portfolio_id,
    portfolioId: workspace.portfolio.portfolio_id,
    clientId: workspace.portfolio.client_id,
    mandateType,
    bookingCenter,
    businessDate: workspace.as_of_date
      ? formatBusinessDate(workspace.as_of_date)
      : null,
    baseCurrency: workspace.portfolio.base_currency,
    acceptedReportingCurrency: resolveAcceptedReportingCurrency(workspace),
  };
}

function resolveAcceptedReportingCurrency(
  workspace: PortfolioWorkspace,
): string | null {
  const capability = workspace.control_capabilities?.reporting_currency_restatement;
  if (
    capability?.state === "supported" &&
    capability.requested_reporting_currency &&
    capability.effective_reporting_currency === capability.requested_reporting_currency
  ) {
    return capability.effective_reporting_currency;
  }

  const sourceCurrencies = [
    workspace.income_summary?.reporting_currency,
    workspace.activity_summary?.reporting_currency,
  ].filter((currency): currency is string => Boolean(currency));
  return sourceCurrencies.length > 0 && sourceCurrencies.every(
    (currency) => currency === sourceCurrencies[0],
  )
    ? sourceCurrencies[0]
    : null;
}
