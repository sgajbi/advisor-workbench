import type { PortfolioWorkspaceControls } from "./view-model";

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
