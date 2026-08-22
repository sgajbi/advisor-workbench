import {
  buildReviewContextHref,
  parseReviewContext,
  type ReviewContext,
  type ReviewContextSearchParams,
} from "@/shell/review-context";

import type { PortfolioWorkspace } from "./types";
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
    if (canUsePortfolioAsOfDate(workspace, reviewContext.asOfDate)) {
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
 * Admits analytical evidence only when the source confirms the same valuation
 * date as the control transaction. This keeps delayed or tolerant responses
 * from being merged under a newer review context.
 */
export function isPortfolioReviewResponseCurrent<
  Response extends Readonly<{ as_of_date?: string }>,
>(
  response: Response | null,
  controls: Pick<PortfolioWorkspaceControls, "asOfDate">,
): response is Response & Readonly<{ as_of_date: string }> {
  return response?.as_of_date === controls.asOfDate;
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
  if (asOfDate === workspace.as_of_date) {
    return true;
  }

  const capability = workspace.control_capabilities?.historical_snapshots;
  return Boolean(
    capability?.state === "supported" &&
      capability.earliest_available_as_of_date &&
      capability.latest_available_as_of_date &&
      asOfDate >= capability.earliest_available_as_of_date &&
      asOfDate <= capability.latest_available_as_of_date,
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
