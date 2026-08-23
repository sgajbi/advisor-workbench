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
  acceptedReportingCurrency?: string | null;
};

export function buildPortfolioReviewContextStrip(
  workspace: PortfolioWorkspace,
  options: PortfolioReviewContextStripOptions = {},
): ReviewContextStripModel {
  return buildReviewContextStripModel(
    buildPortfolioReviewContextSource(
      workspace,
      options.acceptedReportingCurrency,
    ),
    options.notice,
  );
}

export function buildPortfolioReviewContextSource(
  workspace: PortfolioWorkspace,
  acceptedReportingCurrency?: string | null,
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
    acceptedReportingCurrency: resolveAcceptedReportingCurrency(
      workspace,
      acceptedReportingCurrency,
    ),
  };
}

function resolveAcceptedReportingCurrency(
  workspace: PortfolioWorkspace,
  acceptedReportingCurrency?: string | null,
): string | null {
  if (acceptedReportingCurrency) {
    return acceptedReportingCurrency;
  }

  const capability = workspace.control_capabilities?.reporting_currency_restatement;
  const requestedReportingCurrency = capability?.requested_reporting_currency;
  if (
    capability?.state === "supported" &&
    requestedReportingCurrency &&
    capability.effective_reporting_currency === requestedReportingCurrency
  ) {
    return capability.effective_reporting_currency;
  }

  if (!requestedReportingCurrency) {
    return null;
  }

  const sourceCurrencies = [
    workspace.income_summary?.reporting_currency,
    workspace.activity_summary?.reporting_currency,
  ].filter((currency): currency is string => Boolean(currency));
  return sourceCurrencies.length > 0 && sourceCurrencies.every(
    (currency) => currency === requestedReportingCurrency,
  )
    ? requestedReportingCurrency
    : null;
}
