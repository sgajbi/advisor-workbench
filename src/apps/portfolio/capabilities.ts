import type { WorkspaceCapability } from "@/shell/workspace-capabilities";
import {
  hidden,
  partial,
  supported,
  unavailable,
} from "@/shell/workspace-capabilities";

import type { PortfolioWorkspace } from "./types";
import type { PortfolioViewMode } from "./view-model";

export type PortfolioWorkspaceCapabilities = {
  summaryKpis: WorkspaceCapability;
  readinessIndicators: WorkspaceCapability;
  allocation: WorkspaceCapability;
  topHoldings: WorkspaceCapability;
  income: WorkspaceCapability;
  activity: WorkspaceCapability;
  projectedCashflow: WorkspaceCapability;
  holdingsDrilldown: WorkspaceCapability;
  transactionsDrilldown: WorkspaceCapability;
  performanceSnapshot: WorkspaceCapability;
};

export function getPortfolioWorkspaceCapabilities(
  workspace: PortfolioWorkspace,
  options: {
    viewMode: PortfolioViewMode;
    hideEmptyModules: boolean;
  }
): PortfolioWorkspaceCapabilities {
  const hideEmptyUnavailable = (capability: WorkspaceCapability): WorkspaceCapability =>
    options.hideEmptyModules && capability.state === "unavailable"
      ? hidden("Hidden because empty portfolio modules are suppressed.")
      : capability;

  const allocation = hideEmptyUnavailable(
    workspace.allocation_views?.length
      ? supported("Allocation views are present in the portfolio payload.")
      : workspace.summary.position_count > 0 || workspace.positions.length > 0
        ? partial("Holdings exist, but allocation views are not available in the current contract.")
        : unavailable("No valued holdings are available to produce allocation output.")
  );

  const topHoldings = hideEmptyUnavailable(
    workspace.top_positions.length
      ? supported("Ranked top positions are present in the positions payload.")
      : workspace.summary.position_count > 0 || workspace.positions.length > 0
        ? partial("Positions exist, but ranked holdings are not available in the current contract.")
        : unavailable("No holdings are available to rank.")
  );

  const income = hideEmptyUnavailable(
    workspace.income_summary
      ? supported("Income summary is available in the portfolio summary details payload.")
      : workspace.recent_transactions.length > 0
        ? partial("Transactions exist, but income aggregation is not available for the current selection.")
        : unavailable("No income activity is available in the current reporting window.")
  );

  const activity = hideEmptyUnavailable(
    workspace.activity_summary
      ? supported("Activity summary is available in the portfolio summary details payload.")
      : workspace.recent_transactions.length > 0
        ? partial("Transactions exist, but activity aggregation is not available for the current selection.")
        : unavailable("No activity summary is available in the current reporting window.")
  );

  const projectedCashflowBase = workspace.cashflow_outlook
    ? supported("Projected cashflow is available in the liquidity payload.")
    : unavailable("No projected cashflow outlook is available in the current contract.");

  const projectedCashflow =
    options.viewMode === "detailed"
      ? hideEmptyUnavailable(projectedCashflowBase)
      : hidden("Projected cashflow is not shown outside detailed drill-down mode.");

  const holdingsDrilldown =
    options.viewMode !== "detailed"
      ? hidden("Holdings drill-down is only available in detailed mode.")
      : workspace.positions.length > 0
        ? supported("Detailed position rows are available for drill-down.")
        : workspace.summary.position_count > 0 || workspace.top_positions.length > 0
          ? partial("The book reports holdings, but detailed position rows are incomplete.")
          : unavailable("No holdings are available for drill-down.");

  const transactionsDrilldown =
    options.viewMode !== "detailed"
      ? hidden("Transactions drill-down is only available in detailed mode.")
      : workspace.recent_transactions.length > 0
        ? supported("Detailed transaction rows are available for drill-down.")
        : workspace.operations?.latest_booked_transaction_date
          ? partial("Transaction history exists, but detailed rows are incomplete for the current selection.")
          : unavailable("No transactions are available for drill-down.");

  return {
    summaryKpis: supported("Portfolio summary payload supports headline KPI rendering."),
    readinessIndicators: workspace.readiness_indicators?.length
      ? supported("Source-backed readiness indicators are available.")
      : partial("Readiness must fall back to UI-derived supportability indicators."),
    allocation,
    topHoldings,
    income,
    activity,
    projectedCashflow,
    holdingsDrilldown,
    transactionsDrilldown,
    performanceSnapshot: workspace.performance
      ? supported("Performance snapshot is available in the portfolio workspace payload.")
      : unavailable("Performance snapshot data is not available in the current portfolio contract."),
  };
}
