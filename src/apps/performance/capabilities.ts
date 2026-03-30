import type { WorkspaceCapability } from "@/shell/workspace-capabilities";
import {
  partial,
  supported,
  unavailable,
} from "@/shell/workspace-capabilities";
import type { WorkbenchPerformanceWorkspace } from "@/features/workbench/types";
import type { PerformanceModuleCapability } from "@/features/workbench/types";

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

function mapBackendCapability(
  capability?: PerformanceModuleCapability
): WorkspaceCapability | null {
  if (!capability) {
    return null;
  }
  if (capability.state === "supported") {
    return {
      ...supported(capability.reason ?? "Supported by the current performance contract."),
      coverageLevel: capability.coverage_level ?? undefined,
      fallbackAvailable: capability.fallback_available ?? undefined,
      earliestAvailableDate: capability.earliest_available_date ?? undefined,
      latestAvailableDate: capability.latest_available_date ?? undefined,
    };
  }
  if (capability.state === "partial") {
    return {
      ...partial(capability.reason ?? "Available with partial coverage."),
      coverageLevel: capability.coverage_level ?? undefined,
      fallbackAvailable: capability.fallback_available ?? undefined,
      earliestAvailableDate: capability.earliest_available_date ?? undefined,
      latestAvailableDate: capability.latest_available_date ?? undefined,
    };
  }
  return {
    ...unavailable(capability.reason ?? "Unavailable for the current selection."),
    coverageLevel: capability.coverage_level ?? undefined,
    fallbackAvailable: capability.fallback_available ?? undefined,
    earliestAvailableDate: capability.earliest_available_date ?? undefined,
    latestAvailableDate: capability.latest_available_date ?? undefined,
  };
}

export function getPerformanceWorkspaceCapabilities(
  workspace: WorkbenchPerformanceWorkspace
): PerformanceWorkspaceCapabilities {
  if (workspace.capabilities) {
    return {
      summaryKpis: mapBackendCapability(workspace.capabilities.summary_kpis)!,
      returnPath: mapBackendCapability(workspace.capabilities.return_path)!,
      benchmarkComparison: mapBackendCapability(workspace.capabilities.benchmark_comparison)!,
      multiHorizonReturns: mapBackendCapability(workspace.capabilities.multi_horizon_returns)!,
      contributionRanking: mapBackendCapability(workspace.capabilities.contribution_ranking)!,
      attributionDetail: mapBackendCapability(workspace.capabilities.attribution_detail)!,
      contributionDetail: mapBackendCapability(workspace.capabilities.contribution_detail)!,
      evidence: mapBackendCapability(workspace.capabilities.evidence)!,
    };
  }

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
