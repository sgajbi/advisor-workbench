import type { PortfolioWorkspace } from "./types";

const HISTORICAL_REVIEW_REQUIRED_MODULES = [
  "workspace",
  "book",
  "liquidity",
  "allocations",
  "positions",
  "transactions",
  "income_summary",
  "activity_summary",
  "readiness",
  "workflow",
  "insights",
] as const;

/**
 * A partial aggregate capability can still support the Portfolio Review date
 * control when every dated module on that screen is source-confirmed. The
 * performance snapshot is fenced independently by its exact report window;
 * rebalance is intentionally the latest source run.
 */
export function canUsePortfolioHistoricalReview(
  workspace: PortfolioWorkspace | null,
): boolean {
  const capability = workspace?.control_capabilities?.historical_snapshots;
  if (
    !capability?.earliest_available_as_of_date ||
    !capability.latest_available_as_of_date
  ) {
    return false;
  }

  if (capability.state === "supported") {
    return true;
  }

  if (capability.state !== "partial") {
    return false;
  }

  const stateByModule = new Map(
    capability.module_capabilities.map(({ module, state }) => [module, state]),
  );
  return HISTORICAL_REVIEW_REQUIRED_MODULES.every(
    (module) => stateByModule.get(module) === "supported",
  );
}

export function isPortfolioHistoricalDateInRange(
  workspace: PortfolioWorkspace,
  asOfDate: string,
): boolean {
  const capability = workspace.control_capabilities?.historical_snapshots;
  return Boolean(
    canUsePortfolioHistoricalReview(workspace) &&
    capability?.earliest_available_as_of_date &&
    capability.latest_available_as_of_date &&
    asOfDate >= capability.earliest_available_as_of_date &&
    asOfDate <= capability.latest_available_as_of_date,
  );
}
