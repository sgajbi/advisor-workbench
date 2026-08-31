import {
  buildReviewContextHref,
  parseReviewContext,
  type ReviewContext,
  type ReviewContextSearchParams,
} from "@/shell/review-context";

import type { PortfolioWorkspace } from "./types";
import { isPortfolioHistoricalDateInRange } from "./portfolio-control-capabilities";
import {
  isPortfolioPerformanceWindowCurrent,
  type PortfolioPerformanceWindowRequest,
} from "./portfolio-performance-window";
import {
  buildInitialPortfolioControls,
  getPortfolioCurrencyOptions,
  PORTFOLIO_TIME_WINDOW_OPTIONS,
  type PortfolioTimeWindow,
  type PortfolioWorkspaceControls,
} from "./view-model";

export type PortfolioReviewControlIssue =
  | "unsupported_as_of_date"
  | "unsupported_period"
  | "unsupported_reporting_currency";

export type PortfolioReviewControlResolution =
  | Readonly<{
      status: "valid";
      controls: PortfolioWorkspaceControls;
    }>
  | Readonly<{
      status: "invalid";
      issues: readonly PortfolioReviewControlIssue[];
    }>;

export function resolvePortfolioReviewControls(
  workspace: PortfolioWorkspace,
  reviewContext: ReviewContext,
): PortfolioReviewControlResolution {
  return resolvePortfolioControls(workspace, reviewContext, canUsePortfolioAsOfDate);
}

export function resolvePortfolioRecordReviewControls(
  workspace: PortfolioWorkspace,
  reviewContext: ReviewContext,
): PortfolioReviewControlResolution {
  return resolvePortfolioControls(workspace, reviewContext, canUsePortfolioRecordAsOfDate);
}

function resolvePortfolioControls(
  workspace: PortfolioWorkspace,
  reviewContext: ReviewContext,
  canUseAsOfDate: (workspace: PortfolioWorkspace, asOfDate: string) => boolean,
): PortfolioReviewControlResolution {
  const controls = buildInitialPortfolioControls(workspace);
  const issues: PortfolioReviewControlIssue[] = [];

  if (reviewContext.period) {
    if (
      (PORTFOLIO_TIME_WINDOW_OPTIONS as readonly string[]).includes(
        reviewContext.period,
      )
    ) {
      controls.timeWindow = reviewContext.period as PortfolioTimeWindow;
    } else {
      issues.push("unsupported_period");
    }
  }

  if (reviewContext.asOfDate) {
    if (canUseAsOfDate(workspace, reviewContext.asOfDate)) {
      controls.asOfDate = reviewContext.asOfDate;
    } else {
      issues.push("unsupported_as_of_date");
    }
  }

  if (reviewContext.reportingCurrency) {
    if (
      canUsePortfolioReportingCurrency(
        workspace,
        reviewContext.reportingCurrency,
      )
    ) {
      controls.reportingCurrency = reviewContext.reportingCurrency;
    } else {
      issues.push("unsupported_reporting_currency");
    }
  }

  return issues.length > 0
    ? { status: "invalid", issues }
    : { status: "valid", controls };
}

/**
 * Applies only the control changes the advisor requested. Switching a review
 * date, period, or currency must not silently discard the chosen workspace
 * detail or column density.
 */
export function applyPortfolioControlPatch(
  current: PortfolioWorkspaceControls,
  patch: Partial<PortfolioWorkspaceControls>,
): PortfolioWorkspaceControls {
  const next = { ...current, ...patch };

  if (
    patch.timeWindow !== undefined &&
    patch.customStartDate === undefined &&
    patch.customEndDate === undefined
  ) {
    next.customStartDate = "";
    next.customEndDate = "";
  }

  return next;
}

/**
 * Restores only source-owned review selectors to the portfolio shell identity.
 * Presentation preferences stay intact because they do not change analytical
 * evidence and should not be lost when a source context cannot be confirmed.
 */
export function restorePortfolioSourceControls(
  current: PortfolioWorkspaceControls,
  workspace: PortfolioWorkspace,
): PortfolioWorkspaceControls {
  const confirmed = buildInitialPortfolioControls(workspace);
  return {
    ...current,
    asOfDate: confirmed.asOfDate,
    reportingCurrency: confirmed.reportingCurrency,
    timeWindow: confirmed.timeWindow,
    customStartDate: confirmed.customStartDate,
    customEndDate: confirmed.customEndDate,
  };
}

export function hasPortfolioSourceControlOverride(
  current: PortfolioWorkspaceControls,
  workspace: PortfolioWorkspace,
): boolean {
  const confirmed = restorePortfolioSourceControls(current, workspace);
  return (
    current.asOfDate !== confirmed.asOfDate ||
    current.reportingCurrency !== confirmed.reportingCurrency ||
    current.timeWindow !== confirmed.timeWindow ||
    current.customStartDate !== confirmed.customStartDate ||
    current.customEndDate !== confirmed.customEndDate
  );
}

/**
 * Admits analytical evidence only when dated book evidence and every available
 * reporting-currency and performance sources confirm the control transaction.
 * A source may be absent in a partial response; that module remains visibly
 * unavailable rather than blocking dated holdings that did confirm identity.
 */
export function isPortfolioReviewResponseCurrent<
  Response extends Readonly<{
    as_of_date?: string;
    portfolio?: Readonly<{ portfolio_id: string }>;
    income_summary?: Readonly<{ reporting_currency: string }> | null;
    activity_summary?: Readonly<{ reporting_currency: string }> | null;
    performance?: Readonly<{
      period: string;
      report_start_date?: string | null;
      report_end_date?: string | null;
    }> | null;
  }>,
>(
  response: Response | null,
  controls: Pick<
    PortfolioWorkspaceControls,
    "asOfDate" | "reportingCurrency" | "timeWindow"
  >,
  performanceWindow: PortfolioPerformanceWindowRequest,
  expectedPortfolioId: string,
): response is Response & Readonly<{ as_of_date: string }> {
  if (
    response?.portfolio?.portfolio_id !== expectedPortfolioId ||
    response.as_of_date !== controls.asOfDate
  ) {
    return false;
  }
  if (
    response.performance &&
    !isPortfolioPerformanceWindowCurrent(
      response.performance,
      performanceWindow,
    )
  ) {
    return false;
  }

  const confirmedCurrencies = [
    response.income_summary?.reporting_currency,
    response.activity_summary?.reporting_currency,
  ].filter((currency): currency is string => Boolean(currency));
  return (
    confirmedCurrencies.length === 0 ||
    confirmedCurrencies.every(
      (currency) => currency === controls.reportingCurrency,
    )
  );
}

export function buildPortfolioReviewHref({
  pathname,
  searchParams,
  portfolioId,
  controls,
}: {
  pathname: string;
  searchParams: ReviewContextSearchParams & { toString(): string };
  portfolioId: string;
  controls: PortfolioWorkspaceControls;
}): string {
  const reviewContextResult = parseReviewContext(searchParams);
  if (reviewContextResult.status === "invalid") {
    throw new TypeError("Cannot navigate with invalid review context.");
  }

  const currentQuery = searchParams.toString();
  const href = `${pathname}${currentQuery ? `?${currentQuery}` : ""}`;
  return buildReviewContextHref(href, {
    ...reviewContextResult.context,
    portfolioId,
    asOfDate: controls.asOfDate,
    period: controls.timeWindow,
    reportingCurrency: controls.reportingCurrency,
  });
}

function canUsePortfolioAsOfDate(
  workspace: PortfolioWorkspace,
  asOfDate: string,
): boolean {
  return asOfDate === workspace.as_of_date;
}

function canUsePortfolioRecordAsOfDate(
  workspace: PortfolioWorkspace,
  asOfDate: string,
): boolean {
  return (
    canUsePortfolioAsOfDate(workspace, asOfDate) ||
    isPortfolioHistoricalDateInRange(workspace, asOfDate)
  );
}

function canUsePortfolioReportingCurrency(
  workspace: PortfolioWorkspace,
  reportingCurrency: string,
): boolean {
  const defaultCurrency = buildInitialPortfolioControls(workspace).reportingCurrency;
  if (reportingCurrency === defaultCurrency) {
    return true;
  }

  return Boolean(
    workspace.control_capabilities?.reporting_currency_restatement.state ===
      "supported" &&
      getPortfolioCurrencyOptions(workspace).includes(reportingCurrency),
  );
}
