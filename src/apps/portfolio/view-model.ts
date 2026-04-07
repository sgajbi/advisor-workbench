import {
  getWorkflowActionLabel,
  getWorkflowTaskLabel,
  mapWorkflowHref,
  WORKFLOW_DISPLAY_ORDER,
} from "./workspace-config";
import { formatDate } from "./formatters";
import type {
  PortfolioActivitySummaryView,
  PortfolioExceptionSummary,
  PortfolioHoldingsDrilldownFilter,
  PortfolioIncomeSummaryView,
  PortfolioInsight,
  PortfolioReadinessIndicator,
  PortfolioReadinessStatus,
  PortfolioTransactionDrilldownFilter,
  PortfolioWorkflowAction,
  PortfolioWorkflowCue,
  PortfolioWorkspace,
} from "./types";

export const PORTFOLIO_TIME_WINDOW_OPTIONS = ["7D", "30D", "MTD", "QTD", "YTD", "1Y", "SI"] as const;
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
  customStartDate: string;
  customEndDate: string;
  columnMode: PortfolioColumnMode;
  includeCash: boolean;
  assetClass: string;
  sector: string;
  region: string;
  positionStatus: string;
  transactionType: string;
  showOnlyNonZeroRows: boolean;
  showOnlyExceptions: boolean;
  hideEmptyModules: boolean;
  focusExceptions: boolean;
};

export type PortfolioWorkspaceContext = {
  selectedAsOfDate: string;
  selectedReportingCurrency: string;
  timeWindow: PortfolioTimeWindow;
  periodLabel: string;
  viewMode: PortfolioViewMode;
  columnMode: PortfolioColumnMode;
  hideEmptyModules: boolean;
  focusExceptions: boolean;
  effectivePeriodStartDate: string;
  effectivePeriodEndDate: string;
  usesCustomDateRange: boolean;
  hasHistoricalGap: boolean;
  currencyOptions: string[];
  supportsHistoricalSnapshots: boolean;
  supportsReportingCurrencyRestatement: boolean;
};

export type PortfolioUiTone = "neutral" | "success" | "warn" | "danger";

export type PortfolioFilterKey =
  | "asOfDate"
  | "reportingCurrency"
  | "includeCash"
  | "assetClass"
  | "sector"
  | "region"
  | "positionStatus"
  | "transactionType"
  | "timeWindow"
  | "showOnlyNonZeroRows"
  | "showOnlyExceptions";

export type PortfolioFilterChip = {
  key: PortfolioFilterKey;
  label: string;
  value: string;
};

export type PortfolioFilterOptions = {
  assetClasses: string[];
  sectors: string[];
  regions: string[];
  positionStatuses: string[];
  transactionTypes: string[];
};

const DEFAULT_PORTFOLIO_AS_OF_DATE = "2000-01-01";

export function buildInitialPortfolioControls(
  workspace: PortfolioWorkspace | null
): PortfolioWorkspaceControls {
  return {
    asOfDate: workspace?.as_of_date ?? DEFAULT_PORTFOLIO_AS_OF_DATE,
    reportingCurrency: getPortfolioCurrencyOptions(workspace)[0] ?? "USD",
    viewMode: "summary",
    timeWindow: "30D",
    customStartDate: "",
    customEndDate: "",
    columnMode: "essential",
    includeCash: true,
    assetClass: "ALL",
    sector: "ALL",
    region: "ALL",
    positionStatus: "ALL",
    transactionType: "ALL",
    showOnlyNonZeroRows: false,
    showOnlyExceptions: false,
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

  const effectivePeriod = resolveEffectivePeriod(
    selectedAsOfDate,
    controls.timeWindow,
    workspace?.profile.open_date,
    controls.viewMode === "detailed" ? controls.customStartDate : "",
    controls.viewMode === "detailed" ? controls.customEndDate : ""
  );

  return {
    selectedAsOfDate,
    selectedReportingCurrency,
    timeWindow: controls.timeWindow,
    periodLabel: effectivePeriod.label,
    viewMode: controls.viewMode,
    columnMode: controls.columnMode,
    hideEmptyModules: controls.hideEmptyModules,
    focusExceptions: controls.focusExceptions,
    effectivePeriodStartDate: effectivePeriod.startDate,
    effectivePeriodEndDate: effectivePeriod.endDate,
    usesCustomDateRange: effectivePeriod.isCustomRange,
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
  const effectivePeriod = resolveEffectivePeriod(
    selectedAsOfDate,
    controls.timeWindow,
    workspace.profile.open_date,
    controls.viewMode === "detailed" ? controls.customStartDate : "",
    controls.viewMode === "detailed" ? controls.customEndDate : ""
  );

  return {
    ...workspace,
    top_positions: workspace.top_positions.filter((position) =>
      includePosition(position, controls)
    ),
    positions: workspace.positions.filter((position) => includePosition(position, controls)),
    recent_transactions: workspace.recent_transactions.filter((transaction) => {
      const transactionDate = transaction.transaction_date.slice(0, 10);
      return (
        transactionDate >= effectivePeriod.startDate &&
        transactionDate <= effectivePeriod.endDate &&
        includeTransaction(transaction, controls)
      );
    }),
    cash_balances: controls.includeCash ? workspace.cash_balances : [],
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

export function buildPortfolioFilterOptions(
  workspace: PortfolioWorkspace | null
): PortfolioFilterOptions {
  if (!workspace) {
    return {
      assetClasses: [],
      sectors: [],
      regions: [],
      positionStatuses: ["ALL", "Active", "Unpriced", "Needs Attention"],
      transactionTypes: [],
    };
  }

  return {
    assetClasses: uniqueSorted(workspace.positions.map((position) => position.asset_class)),
    sectors: uniqueSorted(workspace.positions.map((position) => position.sector)),
    regions: uniqueSorted(workspace.positions.map((position) => position.country_of_risk)),
    positionStatuses: ["ALL", "Active", "Unpriced", "Needs Attention"],
    transactionTypes: uniqueSorted(
      workspace.recent_transactions.map((transaction) => transaction.transaction_type)
    ),
  };
}

export function buildPortfolioActiveFilterChips(
  controls: PortfolioWorkspaceControls
): PortfolioFilterChip[] {
  const chips: PortfolioFilterChip[] = [];

  if (!controls.includeCash) {
    chips.push({ key: "includeCash", label: "Include Cash", value: "No" });
  }
  if (controls.assetClass !== "ALL") {
    chips.push({ key: "assetClass", label: "Asset Class", value: controls.assetClass });
  }
  if (controls.sector !== "ALL") {
    chips.push({ key: "sector", label: "Sector", value: controls.sector });
  }
  if (controls.region !== "ALL") {
    chips.push({ key: "region", label: "Region", value: controls.region });
  }
  if (controls.positionStatus !== "ALL") {
    chips.push({ key: "positionStatus", label: "Position Status", value: controls.positionStatus });
  }
  if (controls.transactionType !== "ALL") {
    chips.push({ key: "transactionType", label: "Transaction Type", value: controls.transactionType });
  }
  if (controls.showOnlyNonZeroRows) {
    chips.push({ key: "showOnlyNonZeroRows", label: "Rows", value: "Non-zero only" });
  }
  if (controls.showOnlyExceptions) {
    chips.push({ key: "showOnlyExceptions", label: "Focus", value: "Exceptions only" });
  }
  if (controls.timeWindow !== "30D" || controls.customStartDate || controls.customEndDate) {
    const periodValue =
      controls.customStartDate || controls.customEndDate
        ? `${controls.customStartDate || "Open"} to ${controls.customEndDate || "As of"}`
        : controls.timeWindow;
    chips.push({
      key: "timeWindow",
      label: "Period",
      value: periodValue,
    });
  }

  return chips;
}

export function getActivePortfolioFilterCount(
  controls: PortfolioWorkspaceControls
): number {
  return buildPortfolioActiveFilterChips(controls).length;
}

export function getPortfolioDefaultFilterValue(
  key: PortfolioFilterKey,
  defaults: PortfolioWorkspaceControls
): string | boolean {
  return defaults[key];
}

export function resolveTimeWindowStartDate(
  asOfDate: string,
  timeWindow: PortfolioTimeWindow,
  inceptionDate?: string | null
): string {
  const asOf = new Date(`${asOfDate}T00:00:00Z`);
  const start = new Date(asOf);

  switch (timeWindow) {
    case "7D":
      start.setUTCDate(start.getUTCDate() - 7);
      break;
    case "30D":
      start.setUTCDate(start.getUTCDate() - 30);
      break;
    case "MTD":
      start.setUTCDate(1);
      break;
    case "QTD":
      start.setUTCMonth(resolveQuarterStartMonth(start.getUTCMonth()), 1);
      break;
    case "YTD":
      start.setUTCMonth(0, 1);
      break;
    case "1Y":
      start.setUTCFullYear(start.getUTCFullYear() - 1);
      start.setUTCDate(start.getUTCDate() + 1);
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

export function resolveEffectivePeriod(
  asOfDate: string,
  timeWindow: PortfolioTimeWindow,
  inceptionDate?: string | null,
  customStartDate?: string | null,
  customEndDate?: string | null
): {
  startDate: string;
  endDate: string;
  isCustomRange: boolean;
  label: string;
} {
  const endDate = clampDateToRange(customEndDate || asOfDate, inceptionDate, asOfDate);
  const presetStartDate = resolveTimeWindowStartDate(endDate, timeWindow, inceptionDate);
  const requestedCustomStart = customStartDate
    ? clampDateToRange(customStartDate, inceptionDate, endDate)
    : "";
  const usesCustomRange = Boolean(requestedCustomStart || customEndDate);
  const startDate = requestedCustomStart || presetStartDate;

  return {
    startDate,
    endDate,
    isCustomRange: usesCustomRange,
    label: usesCustomRange ? "Custom" : timeWindow,
  };
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
  const reportingFreshness = getReportingFreshnessSupport(workspace);

  if (workspace.operations?.controls_blocking) {
    return "Blocking controls active";
  }

  if (workspace.operations?.publish_allowed === false) {
    return "Publication currently blocked";
  }

  if (status === "Ready") {
    return reportingFreshness;
  }

  if (status === "Not Ready") {
    return "Missing core book coverage";
  }

  if (workspace.readiness.reporting.row_count > 0) {
    return reportingFreshness;
  }

  if (workspace.operations?.latest_booked_transaction_date) {
    return `Latest booking ${formatDate(workspace.operations.latest_booked_transaction_date)}`;
  }

  return `${workspace.partial_failures.length} active exception${workspace.partial_failures.length === 1 ? "" : "s"}`;
}

export function getReportingFreshnessSupport(workspace: PortfolioWorkspace): string {
  const reportingStatus = getReportingReadinessStatus(workspace);
  const rowCount = workspace.readiness.reporting.row_count;
  const generatedAt = workspace.readiness.reporting.generated_at_utc;
  const rowLabel = `${rowCount} report row${rowCount === 1 ? "" : "s"}`;

  if (reportingStatus === "Ready") {
    if (generatedAt && rowCount > 0) {
      return `Generated ${formatDate(generatedAt)} • ${rowLabel}`;
    }
    if (rowCount > 0) {
      return `${rowLabel} published`;
    }
    return "Published output ready";
  }

  if (reportingStatus === "Partial") {
    if (rowCount > 0) {
      return `${rowLabel} published`;
    }
    return "Reporting output pending";
  }

  if (reportingStatus === "Empty") {
    return "No published report rows";
  }

  return "Reporting output missing";
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

export function buildPortfolioExceptionSummaries(
  workspace: PortfolioWorkspace
): PortfolioExceptionSummary[] {
  const exceptions: PortfolioExceptionSummary[] = [];
  const holdingsStatus = getHoldingsReadinessStatus(workspace);
  const pricingStatus = getPricingReadinessStatus(workspace);
  const transactionStatus = getTransactionsReadinessStatus(workspace);
  const reportingStatus = getReportingReadinessStatus(workspace);

  if (holdingsStatus !== "Ready") {
    exceptions.push({
      key: "holdings",
      title: holdingsStatus === "Partial" ? "Holdings coverage incomplete" : "Missing holdings",
      detail:
        holdingsStatus === "Partial"
          ? "The holdings inventory is only partially available for this book."
          : "No positions are currently booked for this portfolio.",
      tone: holdingsStatus === "Partial" ? "warn" : "danger",
      href: "#portfolio-drilldown",
    });
  }

  if (pricingStatus !== "Ready") {
    exceptions.push({
      key: "pricing",
      title: pricingStatus === "Partial" ? "Pricing coverage incomplete" : "No priced positions",
      detail:
        pricingStatus === "Partial"
          ? "Some holdings lack complete valuation coverage."
          : "Valuation cannot run until priced positions are available.",
      tone: pricingStatus === "Partial" ? "warn" : "danger",
      href: "#portfolio-attention",
    });
  }

  if (transactionStatus !== "Ready") {
    exceptions.push({
      key: "transactions",
      title:
        transactionStatus === "Partial" ? "Transaction history incomplete" : "Empty transaction history",
      detail:
        transactionStatus === "Partial"
          ? "Booked transaction history is present but not fully available in the current view."
          : "No funding, trading, or cash activity has been recorded yet.",
      tone: transactionStatus === "Partial" ? "warn" : "danger",
      href: "#portfolio-drilldown",
    });
  }

  if (reportingStatus !== "Ready") {
    exceptions.push({
      key: "reporting",
      title:
        reportingStatus === "Partial"
          ? "Reporting output incomplete"
          : reportingStatus === "Empty"
            ? "Reporting output unavailable"
            : "Reporting output missing",
      detail:
        reportingStatus === "Partial"
          ? "Reporting output exists, but the current book is not fully reportable."
          : reportingStatus === "Empty"
            ? "Reporting has not produced any rows for this portfolio yet."
            : "Reporting coverage is not yet available for this portfolio.",
      tone: reportingStatus === "Partial" || reportingStatus === "Empty" ? "warn" : "danger",
      href: "#portfolio-health",
    });
  }

  if (workspace.operations?.controls_blocking) {
    exceptions.push({
      key: "controls_blocking",
      title: "Blocking controls active",
      detail: "Operational controls are currently preventing publication or downstream processing.",
      tone: "danger",
      href: "#portfolio-attention",
    });
  }

  workspace.partial_failures.forEach((failure) => {
    exceptions.push({
      key: `partial_failure_${failure.error_code}`,
      title: failure.error_code.replaceAll("_", " "),
      detail: failure.detail,
      tone: "warn",
      href: "#portfolio-attention",
    });
  });

  return exceptions;
}

export function buildPortfolioInsights(workspace: PortfolioWorkspace): PortfolioInsight[] {
  const insights: PortfolioInsight[] = [];
  const requestedWindowActivity = getRequestedWindowActivityAmount(workspace);
  const maxPositionWeight = Math.max(
    ...workspace.top_positions.map((position) => position.weight_pct ?? 0),
    0
  );

  if (!workspace.positions.length) {
    insights.push({
      key: "no-holdings-booked",
      title: "No holdings booked",
      detail: "Book the first position to activate holdings, allocation, and valuation views.",
      severity: "critical",
      href: "#portfolio-drilldown",
    });
  }

  if (!hasCashFundingEvidence(workspace)) {
    insights.push({
      key: "no-cash-funding",
      title: "No cash funding recorded",
      detail: "Add opening cash or a subscription so the portfolio can be funded and invested.",
      severity: "critical",
      href: "#portfolio-insights",
    });
  }

  if (getPricingReadinessStatus(workspace) !== "Ready") {
    insights.push({
      key: "pricing-not-published",
      title: "Pricing not yet published",
      detail: "Publish prices to complete valuation and unlock reliable reporting.",
      severity: "warning",
      href: "#portfolio-attention",
    });
  }

  if (getReportingReadinessStatus(workspace) !== "Ready") {
    insights.push({
      key: "reporting-unavailable",
      title: "Reporting cannot be generated yet",
      detail: "Reporting remains blocked until book coverage and valuation are complete.",
      severity: "warning",
      href: "#portfolio-health",
    });
  }

  if (maxPositionWeight >= 20) {
    insights.push({
      key: "equity-concentration-high",
      title: "Large position dominates portfolio risk",
      detail:
        "One holding has become large enough to dominate current portfolio concentration. Open Risk to review concentration pressure.",
      severity: "warning",
      href: mapWorkflowHref("risk", workspace.portfolio.portfolio_id),
    });
  }

  if ((workspace.summary.cash_weight_pct ?? 0) >= 15) {
    insights.push({
      key: "cash-above-target",
      title: "Cash exceeds target allocation",
      detail: "Available cash is elevated relative to invested assets.",
      severity: "info",
      href: "#portfolio-insights",
    });
  }

  if (requestedWindowActivity < 0) {
    insights.push({
      key: "net-outflows-window",
      title: "Net outflows in last 30 days",
      detail: "Recent activity is net negative over the selected reporting window.",
      severity: "warning",
      href: "#portfolio-changes",
    });
  }

  return insights;
}

export function getOrderedWorkflowCues(workspace: PortfolioWorkspace): PortfolioWorkflowCue[] {
  const supportedWorkflowKeys = new Set<string>(WORKFLOW_DISPLAY_ORDER);
  const portfolioId = workspace.portfolio.portfolio_id;

  return [...workspace.workflow_cues]
    .filter((cue) => supportedWorkflowKeys.has(cue.key))
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
    })
    .map((cue) => ({
      ...cue,
      href: mapWorkflowHref(cue.key, portfolioId),
    }));
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
    href: mapWorkflowHref(cue.key, workspace.portfolio.portfolio_id),
    cta_label: getWorkflowActionLabel(cue.key),
    recommended: index === 0,
  }));
}

export function getRelatedTransactionsForSecurity(
  workspace: PortfolioWorkspace,
  securityId: string
): PortfolioWorkspace["recent_transactions"] {
  return [...workspace.recent_transactions]
    .filter((transaction) => transaction.security_id === securityId)
    .sort((left, right) => right.transaction_date.localeCompare(left.transaction_date));
}

export function getPositionsNeedingPricing(
  workspace: PortfolioWorkspace
): PortfolioWorkspace["positions"] {
  return workspace.positions.filter(
    (position) =>
      position.market_price == null ||
      position.market_value_base == null ||
      (position.market_value_base ?? 0) <= 0
  );
}

export function filterTransactionsByActivityBucket(
  transactions: PortfolioWorkspace["recent_transactions"],
  bucket: string
): PortfolioWorkspace["recent_transactions"] {
  const normalizedBucket = normalizeFilterValue(bucket);

  return transactions.filter((transaction) => {
    const normalizedType = normalizeFilterValue(transaction.transaction_type);
    const normalizedComponent = normalizeFilterValue(transaction.component_type);
    const amount = transaction.net_cost_base ?? transaction.gross_amount ?? 0;

    switch (normalizedBucket) {
      case "INFLOWS":
        return amount > 0 && normalizedComponent !== "FEE";
      case "OUTFLOWS":
        return amount < 0 && normalizedComponent !== "FEE";
      case "FEES":
        return normalizedType.includes("FEE") || normalizedComponent.includes("FEE");
      case "INCOME":
        return ["DIVIDEND", "COUPON", "INTEREST"].includes(normalizedType);
      case "TRADES":
        return ["BUY", "SELL"].includes(normalizedType);
      default:
        return true;
    }
  });
}

export function filterTransactionsByDrilldown(
  transactions: PortfolioWorkspace["recent_transactions"],
  filter: PortfolioTransactionDrilldownFilter | null
): PortfolioWorkspace["recent_transactions"] {
  if (!filter) {
    return transactions;
  }

  if (filter.kind === "activity") {
    return filterTransactionsByActivityBucket(transactions, filter.bucket);
  }

  return transactions.filter((transaction) => transaction.security_id === filter.security_id);
}

export function filterPositionsByDrilldown(
  positions: PortfolioWorkspace["positions"],
  filter: PortfolioHoldingsDrilldownFilter | null
): PortfolioWorkspace["positions"] {
  if (!filter) {
    return positions;
  }

  return positions.filter((position) => {
    switch (filter.kind) {
      case "allocation":
        switch (filter.selection.dimension) {
          case "asset_class":
            return (
              normalizeFilterValue(position.asset_class) ===
              normalizeFilterValue(filter.selection.bucket)
            );
          case "currency":
            return (
              normalizeFilterValue(position.currency) ===
              normalizeFilterValue(filter.selection.bucket)
            );
          case "sector":
            return (
              normalizeFilterValue(position.sector) ===
              normalizeFilterValue(filter.selection.bucket)
            );
          case "region":
            return (
              normalizeFilterValue(position.country_of_risk) ===
              normalizeFilterValue(filter.selection.bucket)
            );
          default:
            return true;
        }
      case "security":
        return position.security_id === filter.security_id;
      case "status":
        return filter.status === "Unpriced"
          ? position.market_price == null || position.market_value_base == null
          : true;
      default:
        return true;
    }
  });
}

export function buildAllocationDrilldownLabel(dimension: string, bucket: string): string {
  return `${formatFilterDimension(dimension)}: ${bucket}`;
}

export function buildSecurityDrilldownLabel(
  instrumentName: string,
  target: "holdings" | "transactions"
): string {
  return target === "holdings"
    ? `Filtered by holding: ${instrumentName}`
    : `Filtered by security: ${instrumentName}`;
}

export function buildActivityDrilldownLabel(bucket: string): string {
  return `Filtered by activity: ${formatFilterDimension(bucket)}`;
}

export function buildHoldingsStatusDrilldownLabel(status: "Unpriced"): string {
  return status === "Unpriced" ? "Filtered by pricing exception: Unpriced holdings" : status;
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

function clampDateToRange(
  requested: string,
  lowerBound?: string | null,
  upperBound?: string | null
): string {
  const lower = lowerBound ?? requested;
  const upper = upperBound ?? requested;

  if (requested < lower) {
    return lower;
  }
  if (requested > upper) {
    return upper;
  }
  return requested;
}

function resolveQuarterStartMonth(month: number): number {
  if (month <= 2) {
    return 0;
  }
  if (month <= 5) {
    return 3;
  }
  if (month <= 8) {
    return 6;
  }
  return 9;
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
  if (
    workspace.recent_transactions.length > 0 ||
    getRequestedWindowActivityCount(workspace) > 0 ||
    getYearToDateActivityCount(workspace) > 0
  ) {
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

function hasCashFundingEvidence(workspace: PortfolioWorkspace): boolean {
  if ((workspace.cash_balances?.length ?? 0) > 0) {
    return true;
  }

  if ((workspace.summary.cash_balance_count ?? 0) > 0) {
    return true;
  }

  if ((workspace.summary.total_cash_base ?? 0) > 0) {
    return true;
  }

  const inflowBucket = workspace.activity_summary?.buckets.find(
    (bucket) => bucket.bucket.toUpperCase() === "INFLOWS"
  );
  if ((inflowBucket?.requested_window.transaction_count ?? 0) > 0) {
    return true;
  }

  return (inflowBucket?.requested_window.reporting_currency_amount ?? 0) > 0;
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
    default:
      return "Open the next available workflow for this portfolio.";
  }
}

function includePosition(
  position:
    | PortfolioWorkspace["positions"][number]
    | PortfolioWorkspace["top_positions"][number],
  controls: PortfolioWorkspaceControls
): boolean {
  if (
    controls.assetClass !== "ALL" &&
    normalizeFilterValue(position.asset_class) !== normalizeFilterValue(controls.assetClass)
  ) {
    return false;
  }

  if (
    "sector" in position &&
    controls.sector !== "ALL" &&
    normalizeFilterValue(position.sector) !== normalizeFilterValue(controls.sector)
  ) {
    return false;
  }

  if (
    "country_of_risk" in position &&
    controls.region !== "ALL" &&
    normalizeFilterValue(position.country_of_risk) !== normalizeFilterValue(controls.region)
  ) {
    return false;
  }

  if (
    controls.positionStatus !== "ALL" &&
    getPositionStatus(position) !== controls.positionStatus
  ) {
    return false;
  }

  if (controls.showOnlyNonZeroRows) {
    return (position.market_value_base ?? 0) !== 0 || (position.quantity ?? 0) !== 0;
  }

  return true;
}

function includeTransaction(
  transaction: PortfolioWorkspace["recent_transactions"][number],
  controls: PortfolioWorkspaceControls
): boolean {
  if (
    controls.transactionType !== "ALL" &&
    normalizeFilterValue(transaction.transaction_type) !==
      normalizeFilterValue(controls.transactionType)
  ) {
    return false;
  }

  if (controls.showOnlyNonZeroRows) {
    return (
      (transaction.net_cost_base ?? transaction.gross_amount ?? 0) !== 0 ||
      transaction.quantity !== 0
    );
  }

  return true;
}

function getPositionStatus(
  position:
    | PortfolioWorkspace["positions"][number]
    | PortfolioWorkspace["top_positions"][number]
): string {
  if ("reprocessing_status" in position && position.reprocessing_status) {
    return "Needs Attention";
  }

  if ((position.market_value_base ?? 0) <= 0) {
    return "Unpriced";
  }

  return "Active";
}

function uniqueSorted(values: Array<string | null | undefined>): string[] {
  return [...new Set(values.map((value) => (value ?? "").trim()).filter(Boolean))].sort();
}

function normalizeFilterValue(value: string | null | undefined): string {
  return (value ?? "").trim().toUpperCase();
}

function formatFilterDimension(value: string): string {
  return value
    .split("_")
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1).toLowerCase())
    .join(" ");
}
