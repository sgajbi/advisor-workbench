import type { WorkspaceCapability } from "@/shell/workspace-capabilities";
import {
  partial,
  supported,
  unavailable,
} from "@/shell/workspace-capabilities";
import type { WorkbenchPerformanceWorkspace } from "@/features/workbench/types";

import {
  hasBenchmarkContext,
  hasPositionContributionRanking,
  hasUsableAttribution,
  hasUsableContribution,
} from "./view-model";

export type PerformanceWorkspaceCapabilities = {
  summaryKpis: WorkspaceCapability;
  returnPath: WorkspaceCapability;
  benchmarkComparison: WorkspaceCapability;
  multiHorizonReturns: WorkspaceCapability;
  contributionRanking: WorkspaceCapability;
  attributionDetail: WorkspaceCapability;
  contributionDetail: WorkspaceCapability;
  evidence: WorkspaceCapability;
};

export function getPerformanceWorkspaceCapabilities(
  workspace: WorkbenchPerformanceWorkspace
): PerformanceWorkspaceCapabilities {
  const hasBenchmark = hasBenchmarkContext(workspace);
  const hasHistory = workspace.net_chart.length > 0;
  const hasAttribution = hasUsableAttribution(workspace);
  const hasContribution = hasUsableContribution(workspace);
  const hasPositionRanking = hasPositionContributionRanking(workspace);
  const hasBenchmarkReturns =
    workspace.net_performance.benchmark_return_pct !== null &&
    workspace.net_performance.benchmark_return_pct !== undefined;

  return {
    summaryKpis: supported("The performance summary contract supports headline KPI rendering."),
    returnPath: hasHistory
      ? supported("Time-series return observations are available for the selected horizon.")
      : unavailable("Published return observations are not available for the selected horizon."),
    benchmarkComparison: hasBenchmark
      ? hasBenchmarkReturns
        ? supported("Benchmark-relative return metrics are available.")
        : partial("A benchmark is assigned, but benchmark-relative returns are incomplete.")
      : unavailable("No benchmark is assigned to this mandate."),
    multiHorizonReturns: hasBenchmark
      ? supported("The workspace supports benchmark-aware horizon comparisons.")
      : partial("Horizon comparisons remain available, but benchmark-relative output is unavailable."),
    contributionRanking: hasContribution
      ? hasPositionRanking
        ? supported("Position-level contribution ranking is available.")
        : partial("Contribution exists, but only aggregate rows are available.")
      : unavailable("Contribution analytics are not available for the current selection."),
    attributionDetail: hasAttribution
      ? supported("Benchmark-relative attribution detail is available.")
      : unavailable("Attribution detail is not available for the current selection."),
    contributionDetail: hasContribution
      ? supported("Contribution detail is available for the current selection.")
      : unavailable("Contribution detail is not available for the current selection."),
    evidence: unavailable("Evidence and lineage surfaces are not exposed by the current gateway contract."),
  };
}
