import {
  getWorkflowTaskLabel,
  WORKFLOW_DISPLAY_ORDER,
} from "./workspace-config";
import type {
  PortfolioActivitySummaryView,
  PortfolioIncomeSummaryView,
  PortfolioReadinessIndicator,
  PortfolioReadinessStatus,
  PortfolioWorkflowAction,
  PortfolioWorkflowCue,
  PortfolioWorkspace,
} from "./types";

export const PORTFOLIO_TIME_WINDOW_OPTIONS = ["1M", "3M", "6M", "YTD", "1Y", "SI"] as const;
export const PORTFOLIO_VIEW_MODE_OPTIONS = ["summary", "detailed"] as const;
export const PORTFOLIO_COLUMN_MODE_OPTIONS = ["essential", "expanded"] as const;

export type PortfolioTimeWindow = (typeof PORTFOLIO_TIME_WINDOW_OPTIONS)[number];
export type PortfolioViewMode = (typeof PORTFOLIO_VIEW_MODE_OPTIONS)[number];
export type PortfolioColumnMode = (typeof PORTFOLIO_COLUMN_MODE_OPTIONS)[number];

export type PortfolioWorkspaceControls = {
  asOfDate: string;
  reportingCurrency: string;
  viewMode: PortfolioViewMode;
  timeWindow: PortfolioTimeWindow;
  columnMode: PortfolioColumnMode;
  hideEmptyModules: boolean;
  focusExceptions: boolean;
};

export type PortfolioWorkspaceContext = {
  selectedAsOfDate: string;
  selectedReportingCurrency: string;
  timeWindow: PortfolioTimeWindow;
  viewMode: PortfolioViewMode;
  columnMode: PortfolioColumnMode;
  hideEmptyModules: boolean;
  focusExceptions: boolean;
  timeWindowStartDate: string;
  hasHistoricalGap: boolean;
  currencyOptions: string[];
  supportsHistoricalSnapshots: boolean;
  supportsReportingCurrencyRestatement: boolean;
};

export type PortfolioUiTone = "neutral" | "success" | "warn" | "danger";

export function buildInitialPortfolioControls(
  workspace: PortfolioWorkspace | null
): PortfolioWorkspaceControls {
  return {
    asOfDate: workspace?.as_of_date ?? new Date().toISOString().slice(0, 10),
    reportingCurrency: getPortfolioCurrencyOptions(workspace)[0] ?? "USD",
    viewMode: "summary",
    timeWindow: "1M",
    columnMode: "essential",
    hideEmptyModules: false,
    focusExceptions: false,
  };
}

export function getPortfolioCurrencyOptions(workspace: PortfolioWorkspace | null): string[] {
  if (!workspace) {
    return [];
  }

  const options = new Set<string>();
  if (workspace.portfolio.base_currency) {
    options.add(workspace.portfolio.base_currency);
  }
  if (workspace.income_summary?.reporting_currency) {
    options.add(workspace.income_summary.reporting_currency);
  }
  if (workspace.activity_summary?.reporting_currency) {
    options.add(workspace.activity_summary.reporting_currency);
  }
  workspace.cash_balances?.forEach((balance) => {
    if (balance.currency) {
      options.add(balance.currency);
    }
  });

  return [...options];
}

export function buildPortfolioWorkspaceContext(
  workspace: PortfolioWorkspace | null,
  controls: PortfolioWorkspaceControls
): PortfolioWorkspaceContext {
  const selectedAsOfDate = clampAsOfDate(workspace, controls.asOfDate);
  const selectedReportingCurrency =
    getPortfolioCurrencyOptions(workspace).find((option) => option === controls.reportingCurrency) ??
    workspace?.portfolio.base_currency ??
    controls.reportingCurrency;

  return {
    selectedAsOfDate,
    selectedReportingCurrency,
    timeWindow: controls.timeWindow,
    viewMode: controls.viewMode,
    columnMode: controls.columnMode,
    hideEmptyModules: controls.hideEmptyModules,
    focusExceptions: controls.focusExceptions,
    timeWindowStartDate: resolveTimeWindowStartDate(
      selectedAsOfDate,
      controls.timeWindow,
      workspace?.profile.open_date
    ),
    hasHistoricalGap: Boolean(workspace && selectedAsOfDate !== workspace.as_of_date),
    currencyOptions: getPortfolioCurrencyOptions(workspace),
    supportsHistoricalSnapshots: false,
    supportsReportingCurrencyRestatement: false,
  };
}

export function derivePortfolioWorkspace(
  workspace: PortfolioWorkspace | null,
  controls: PortfolioWorkspaceControls
): PortfolioWorkspace | null {
  if (!workspace) {
    return null;
  }

  const selectedAsOfDate = clampAsOfDate(workspace, controls.asOfDate);
  const timeWindowStartDate = resolveTimeWindowStartDate(
    selectedAsOfDate,
    controls.timeWindow,
    workspace.profile.open_date
  );

  return {
    ...workspace,
    recent_transactions: workspace.recent_transactions.filter((transaction) => {
      const transactionDate = transaction.transaction_date.slice(0, 10);
      return transactionDate >= timeWindowStartDate && transactionDate <= selectedAsOfDate;
    }),
    cashflow_outlook: workspace.cashflow_outlook
      ? {
          ...workspace.cashflow_outlook,
          upcoming_points: workspace.cashflow_outlook.upcoming_points.filter(
            (point) => point.projection_date >= selectedAsOfDate
          ),
        }
      : null,
  };
}

export function resolveTimeWindowStartDate(
  asOfDate: string,
  timeWindow: PortfolioTimeWindow,
  inceptionDate?: string | null
): string {
  const asOf = new Date(`${asOfDate}T00:00:00Z`);
  const start = new Date(asOf);

  switch (timeWindow) {
    case "1M":
      start.setUTCMonth(start.getUTCMonth() - 1);
      break;
    case "3M":
      start.setUTCMonth(start.getUTCMonth() - 3);
      break;
    case "6M":
      start.setUTCMonth(start.getUTCMonth() - 6);
      break;
    case "YTD":
      start.setUTCMonth(0, 1);
      break;
    case "1Y":
      start.setUTCFullYear(start.getUTCFullYear() - 1);
      break;
    case "SI":
      return inceptionDate ?? asOfDate;
  }

  const resolved = start.toISOString().slice(0, 10);
  if (inceptionDate && resolved < inceptionDate) {
    return inceptionDate;
  }
  return resolved;
}

export function getIncomeDisplayCurrency(
  summary: PortfolioIncomeSummaryView | null | undefined,
  selectedReportingCurrency: string,
  baseCurrency: string
): string {
  if (!summary) {
    return selectedReportingCurrency || baseCurrency;
  }
  return selectedReportingCurrency === summary.reporting_currency
    ? summary.reporting_currency
    : summary.reporting_currency;
}

export function getActivityDisplayCurrency(
  summary: PortfolioActivitySummaryView | null | undefined,
  selectedReportingCurrency: string,
  baseCurrency: string
): string {
  if (!summary) {
    return selectedReportingCurrency || baseCurrency;
  }
  return selectedReportingCurrency === summary.reporting_currency
    ? summary.reporting_currency
    : summary.reporting_currency;
}

export function buildPortfolioExportPayload(
  workspace: PortfolioWorkspace | null,
  context: PortfolioWorkspaceContext
): Record<string, unknown> | null {
  if (!workspace) {
    return null;
  }

  return {
    exported_at: new Date().toISOString(),
    context,
    portfolio: workspace.portfolio,
    summary: workspace.summary,
    readiness: workspace.readiness,
    warnings: workspace.warnings,
    partial_failures: workspace.partial_failures,
    top_positions: workspace.top_positions,
    recent_transactions: workspace.recent_transactions,
  };
}

export function getInvestedAssetWeight(workspace: PortfolioWorkspace): number | null {
  const marketValue = workspace.summary.market_value_base ?? 0;
  const investedValue = workspace.summary.invested_market_value_base ?? 0;

  if (!marketValue) {
    return null;
  }

  return (investedValue / marketValue) * 100;
}

export function getRequestedWindowActivityAmount(workspace: PortfolioWorkspace): number {
  return (
    workspace.activity_summary?.buckets.reduce(
      (total, bucket) => total + bucket.requested_window.reporting_currency_amount,
      0
    ) ?? 0
  );
}

export function getRequestedWindowActivityCount(workspace: PortfolioWorkspace): number {
  return (
    workspace.activity_summary?.buckets.reduce(
      (total, bucket) => total + bucket.requested_window.transaction_count,
      0
    ) ?? 0
  );
}

export function getYearToDateActivityAmount(workspace: PortfolioWorkspace): number {
  return (
    workspace.activity_summary?.buckets.reduce(
      (total, bucket) => total + bucket.year_to_date.reporting_currency_amount,
      0
    ) ?? 0
  );
}

export function getYearToDateActivityCount(workspace: PortfolioWorkspace): number {
  return (
    workspace.activity_summary?.buckets.reduce(
      (total, bucket) => total + bucket.year_to_date.transaction_count,
      0
    ) ?? 0
  );
}

export function getBookReadinessStatus(workspace: PortfolioWorkspace): "Not Ready" | "Partial" | "Ready" {
  const reportingReady = isReportingReady(workspace.readiness.reporting.status);
  const publishAllowed = Boolean(workspace.operations?.publish_allowed);
  const controlsBlocking = Boolean(workspace.operations?.controls_blocking);
  const hasPositions = workspace.readiness.has_positions;
  const hasExceptions = workspace.partial_failures.length > 0;

  if (hasPositions && reportingReady && publishAllowed && !controlsBlocking && !hasExceptions) {
    return "Ready";
  }

  if (!hasPositions && !reportingReady && !publishAllowed) {
    return "Not Ready";
  }

  return "Partial";
}

export function getBookReadinessSupport(workspace: PortfolioWorkspace): string {
  const status = getBookReadinessStatus(workspace);

  if (status === "Ready") {
    return "Reportable and publishable";
  }

  if (status === "Not Ready") {
    return "Missing core book coverage";
  }

  return `${workspace.partial_failures.length} active exception${workspace.partial_failures.length === 1 ? "" : "s"}`;
}

export function getBookReadinessTone(workspace: PortfolioWorkspace): PortfolioUiTone {
  switch (getBookReadinessStatus(workspace)) {
    case "Ready":
      return "success";
    case "Not Ready":
      return "danger";
    default:
      return "warn";
  }
}

export function getNetFlowTone(workspace: PortfolioWorkspace): PortfolioUiTone {
  const amount = getRequestedWindowActivityAmount(workspace);

  if (amount > 0) {
    return "success";
  }
  if (amount < 0) {
    return "warn";
  }
  return "neutral";
}

export function buildPortfolioReadinessIndicators(
  workspace: PortfolioWorkspace,
  viewMode: PortfolioViewMode
): PortfolioReadinessIndicator[] {
  return [
    {
      key: "holdings",
      label: "Holdings",
      status: getHoldingsReadinessStatus(workspace),
      href: viewMode === "detailed" ? "#portfolio-drilldown" : "#portfolio-insights",
    },
    {
      key: "pricing",
      label: "Pricing",
      status: getPricingReadinessStatus(workspace),
      href: "#portfolio-attention",
    },
    {
      key: "transactions",
      label: "Transactions",
      status: getTransactionsReadinessStatus(workspace),
      href: viewMode === "detailed" ? "#portfolio-drilldown" : "#portfolio-insights",
    },
    {
      key: "reporting",
      label: "Reporting",
      status: getReportingReadinessStatus(workspace),
      href: "#portfolio-health",
    },
  ];
}

export function getReadinessTone(status: PortfolioReadinessStatus): PortfolioUiTone {
  switch (status) {
    case "Ready":
      return "success";
    case "Partial":
    case "Empty":
      return "warn";
    case "Missing":
      return "danger";
    default:
      return "neutral";
  }
}

export function getOrderedWorkflowCues(workspace: PortfolioWorkspace): PortfolioWorkflowCue[] {
  return [...workspace.workflow_cues]
    .filter(
      (cue, index, cues) => cues.findIndex((candidate) => candidate.key === cue.key) === index
    )
    .sort((left, right) => {
      const leftOrder = WORKFLOW_DISPLAY_ORDER.indexOf(
        left.key as (typeof WORKFLOW_DISPLAY_ORDER)[number]
      );
      const rightOrder = WORKFLOW_DISPLAY_ORDER.indexOf(
        right.key as (typeof WORKFLOW_DISPLAY_ORDER)[number]
      );

      return (leftOrder === -1 ? Number.MAX_SAFE_INTEGER : leftOrder) -
        (rightOrder === -1 ? Number.MAX_SAFE_INTEGER : rightOrder);
    });
}

export function buildPortfolioWorkflowActions(
  workspace: PortfolioWorkspace
): PortfolioWorkflowAction[] {
  const portfolioOperationsHref = `/workbench?portfolioId=${encodeURIComponent(
    workspace.portfolio.portfolio_id
  )}`;
  const isEmptyPortfolio =
    !workspace.positions.length &&
    !workspace.recent_transactions.length &&
    !workspace.cash_balances?.length;

  if (isEmptyPortfolio) {
    return [
      {
        sequence: 1,
        title: "Fund portfolio",
        impact:
          "Create opening liquidity so balances, allocation, and readiness checks become meaningful.",
        target: "Target: cash funding and opening balance setup",
        href: portfolioOperationsHref,
        cta_label: "Fund now",
        recommended: true,
      },
      {
        sequence: 2,
        title: "Book first trade",
        impact: "Activate the holdings book and create the first investable position.",
        target: "Target: transaction entry and execution workflow",
        href: portfolioOperationsHref,
        cta_label: "Book trade",
        recommended: false,
      },
      {
        sequence: 3,
        title: "Publish pricing",
        impact: "Enable valuation, allocation, and downstream reporting coverage.",
        target: "Target: pricing publication and valuation refresh",
        href: portfolioOperationsHref,
        cta_label: "Publish prices",
        recommended: false,
      },
      {
        sequence: 4,
        title: "Review holdings",
        impact: "Confirm the funded book, position weights, and coverage after valuation.",
        target: "Target: holdings and allocation review",
        href: "#portfolio-insights",
        cta_label: "Open holdings",
        recommended: false,
      },
      {
        sequence: 5,
        title: "Open performance",
        impact: "Review return analytics once holdings are funded and valued.",
        target: "Target: performance workspace after valuation is available",
        href: "/performance",
        cta_label: "Open performance",
        recommended: false,
      },
    ];
  }

  return getOrderedWorkflowCues(workspace).map((cue, index) => ({
    sequence: index + 1,
    title: getWorkflowTaskLabel(cue.key),
    impact: getWorkflowImpactLabel(cue.key),
    target: `Target: ${cue.label} workflow for this portfolio`,
    href: cue.href,
    cta_label: cue.label,
    recommended: index === 0,
  }));
}

function clampAsOfDate(workspace: PortfolioWorkspace | null, requested: string): string {
  if (!workspace) {
    return requested;
  }

  const lowerBound = workspace.profile.open_date ?? requested;
  const upperBound = workspace.as_of_date;

  if (requested < lowerBound) {
    return lowerBound;
  }
  if (requested > upperBound) {
    return upperBound;
  }
  return requested;
}

function getHoldingsReadinessStatus(workspace: PortfolioWorkspace): PortfolioReadinessStatus {
  if (workspace.readiness.has_positions && workspace.positions.length > 0) {
    return "Ready";
  }

  if (workspace.summary.position_count > 0 || workspace.top_positions.length > 0) {
    return "Partial";
  }

  return "Missing";
}

function getPricingReadinessStatus(workspace: PortfolioWorkspace): PortfolioReadinessStatus {
  const allocationViews = workspace.allocation_views ?? [];
  const hasValuedHoldings =
    workspace.positions.length > 0 &&
    workspace.positions.some((position) => (position.market_value_base ?? 0) > 0);

  if (hasValuedHoldings && allocationViews.length > 0) {
    return "Ready";
  }

  if (workspace.positions.length > 0 || allocationViews.length > 0) {
    return "Partial";
  }

  return "Missing";
}

function getTransactionsReadinessStatus(workspace: PortfolioWorkspace): PortfolioReadinessStatus {
  if (workspace.recent_transactions.length > 0) {
    return "Ready";
  }

  if (workspace.operations?.latest_booked_transaction_date) {
    return "Partial";
  }

  return "Missing";
}

function getReportingReadinessStatus(workspace: PortfolioWorkspace): PortfolioReadinessStatus {
  const normalized = workspace.readiness.reporting.status.toUpperCase();

  if (normalized === "READY" || normalized === "COMPLETE") {
    return "Ready";
  }

  if (normalized === "EMPTY") {
    return "Empty";
  }

  if (normalized === "PENDING" || workspace.readiness.reporting.row_count > 0) {
    return "Partial";
  }

  return "Missing";
}

function isReportingReady(status: string): boolean {
  const normalized = status.toUpperCase();
  return normalized === "READY" || normalized === "COMPLETE";
}

function getWorkflowImpactLabel(key: string): string {
  switch (key) {
    case "performance":
      return "Review portfolio return, benchmark context, and contribution once the book is valued.";
    case "risk":
      return "Validate suitability, exposure, and mandate fit before the next client action.";
    case "proposal":
      return "Prepare the next recommended portfolio action or client proposal.";
    default:
      return "Open the next available workflow for this portfolio.";
  }
}
