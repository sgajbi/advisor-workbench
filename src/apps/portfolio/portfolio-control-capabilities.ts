import type { PortfolioWorkspace } from "./types";

/**
 * Historical Portfolio Review is available only when Gateway confirms the
 * aggregate capability. A partial capability is not sufficient because the
 * refresh contract does not replace every module carried by the workspace
 * shell atomically.
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

  return capability.state === "supported";
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
