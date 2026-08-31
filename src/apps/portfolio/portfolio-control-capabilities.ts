import type { PortfolioWorkspace } from "./types";

/**
 * Historical Portfolio Review remains unavailable until the Workbench refresh
 * contract replaces and identity-checks every module carried by the shell.
 * Gateway capability alone cannot make a partial browser refresh coherent.
 */
export function canUsePortfolioHistoricalReview(
  _workspace: PortfolioWorkspace | null,
): boolean {
  return false;
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
