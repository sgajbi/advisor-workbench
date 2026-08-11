import {
  recordAnalyticsUiPanelState,
  type WorkbenchAnalyticsUiObservationContext,
} from "@/features/analytics-observability/metrics";

export const PORTFOLIO_SHELL_RECOVERY_OBSERVATION = {
  route: "workbench.portfolio",
  panel: "portfolio-workspace-shell-recovery",
  operation: "portfolio.workspace.shell.recovery",
} as const satisfies WorkbenchAnalyticsUiObservationContext;

export type PortfolioShellRecoveryLifecycle =
  | "automatic_attempt"
  | "ready"
  | "unavailable";

export function recordPortfolioShellRecoveryLifecycle(
  lifecycle: PortfolioShellRecoveryLifecycle,
): void {
  recordAnalyticsUiPanelState({
    context: PORTFOLIO_SHELL_RECOVERY_OBSERVATION,
    state:
      lifecycle === "automatic_attempt"
        ? "loading"
        : lifecycle === "ready"
          ? "ready"
          : "error",
    reason: "source_state",
  });
}
