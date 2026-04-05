import type { WorkbenchStatusStripItem } from "@/design-system";
import type { WorkbenchPerformanceWorkspace } from "@/features/workbench/types";
import type { PerformanceWorkspaceCapabilities } from "../capabilities";
import type { WorkspaceCapability } from "@/shell/workspace-capabilities";

import { formatDate, formatLabel, formatPct } from "../formatters";

export const NOT_ADDITIVE_CELL = "—";

export function shouldShowContributionLocalFx(
  level: NonNullable<WorkbenchPerformanceWorkspace["contribution"]>["levels"][number],
  workspace: WorkbenchPerformanceWorkspace
): boolean {
  if (
    workspace.contribution?.portfolio_local_contribution_pct !== null &&
    workspace.contribution?.portfolio_local_contribution_pct !== undefined
  ) {
    return true;
  }
  if (
    workspace.contribution?.portfolio_fx_contribution_pct !== null &&
    workspace.contribution?.portfolio_fx_contribution_pct !== undefined
  ) {
    return true;
  }
  return level.rows.some(
    (row) => row.local_contribution_pct != null || row.fx_contribution_pct != null
  );
}

export function getBenchmarkLabel(
  workspace: WorkbenchPerformanceWorkspace,
  benchmarkCode?: string
): string | null {
  if (!benchmarkCode) {
    return null;
  }
  return (
    workspace.benchmark_options?.find((option) => option.benchmark_code === benchmarkCode)
      ?.benchmark_name ??
    formatLabel(benchmarkCode)
  );
}

export function getContributionTotals(
  workspace: WorkbenchPerformanceWorkspace,
  level: NonNullable<WorkbenchPerformanceWorkspace["contribution"]>["levels"][number]
): {
  portfolioContributionPct: number | null;
  weightAvgPct: number | null;
  localContributionPct: number | null;
  fxContributionPct: number | null;
} | null {
  if (!workspace.contribution) {
    return null;
  }
  return {
    portfolioContributionPct: workspace.contribution.portfolio_contribution_pct,
    weightAvgPct: level.rows.reduce((sum, row) => sum + (row.weight_avg_pct ?? 0), 0),
    localContributionPct: workspace.contribution.portfolio_local_contribution_pct,
    fxContributionPct: workspace.contribution.portfolio_fx_contribution_pct,
  };
}

export function getAttributionTotals(
  level: NonNullable<WorkbenchPerformanceWorkspace["attribution"]>["levels"][number]
): {
  portfolioWeightAvgPct: number | null;
  benchmarkWeightAvgPct: number | null;
  portfolioReturnPct: number | null;
  benchmarkReturnPct: number | null;
  allocationPct: number;
  selectionPct: number;
  interactionPct: number;
  totalEffectPct: number | null;
} {
  const rows = level.rows;
  return {
    portfolioWeightAvgPct: sumOptional(rows.map((row) => row.portfolio_weight_avg_pct)),
    benchmarkWeightAvgPct: sumOptional(rows.map((row) => row.benchmark_weight_avg_pct)),
    portfolioReturnPct: null,
    benchmarkReturnPct: null,
    allocationPct: rows.reduce((sum, row) => sum + row.allocation_pct, 0),
    selectionPct: rows.reduce((sum, row) => sum + row.selection_pct, 0),
    interactionPct: rows.reduce((sum, row) => sum + row.interaction_pct, 0),
    totalEffectPct:
      level.total_effect_pct ?? rows.reduce((sum, row) => sum + row.total_effect_pct, 0),
  };
}

export type PerformanceTrustStripPresentation = {
  items: WorkbenchStatusStripItem[];
};

export type PerformanceControlNormalizationNotice = {
  title: string;
  message: string;
};

export function getPerformanceTrustStripPresentation({
  capabilities,
}: {
  capabilities: PerformanceWorkspaceCapabilities;
}): PerformanceTrustStripPresentation {
  return {
    items: [
      mapCapabilityToTrustItem("Benchmark", capabilities.benchmarkComparison, {
        supported: "Assigned",
        partial: "Partial",
        unavailable: "Unassigned",
      }),
      mapCapabilityToTrustItem("Return History", capabilities.returnPath, {
        supported: "Ready",
        partial: "Partial",
        unavailable: "Unavailable",
      }),
      mapCapabilityToTrustItem("Contribution", capabilities.contributionDetail, {
        supported: "Ready",
        partial: "Partial",
        unavailable: "Unavailable",
      }),
      mapCapabilityToTrustItem("Attribution", capabilities.attributionDetail, {
        supported: "Ready",
        partial: "Partial",
        unavailable: "Unavailable",
      }),
      mapCapabilityToTrustItem("Evidence", capabilities.evidence, {
        supported: "Available",
        partial: "Pending",
        unavailable: "Pending",
      }),
    ],
  };
}

export function getContributionCoverageAssessment(
  contribution: WorkbenchPerformanceWorkspace["contribution"]
): string | null {
  const coverage = contribution?.coverage_mv_pct;
  if (coverage === null || coverage === undefined) {
    return null;
  }
  if (coverage >= 99) {
    return "Full coverage";
  }
  if (coverage >= 95) {
    return "High coverage";
  }
  if (coverage >= 90) {
    return "Partial coverage";
  }
  return "Limited coverage";
}

export function getContributionReconciliationAssessment(
  contribution: WorkbenchPerformanceWorkspace["contribution"]
): string | null {
  if (!contribution) {
    return null;
  }
  if (
    contribution.portfolio_contribution_pct === null ||
    contribution.portfolio_contribution_pct === undefined ||
    contribution.total_portfolio_return_pct === null ||
    contribution.total_portfolio_return_pct === undefined
  ) {
    return null;
  }

  const delta =
    contribution.total_portfolio_return_pct - contribution.portfolio_contribution_pct;

  if (Math.abs(delta) < 0.005) {
    return "Reconciles to return";
  }

  return `Gap ${formatPct(delta)} vs return`;
}

export function getPerformanceControlNormalizationNotice(
  workspace: WorkbenchPerformanceWorkspace
): PerformanceControlNormalizationNotice | null {
  const normalizedControls: string[] = [];

  if (workspace.requested_chart_frequency_supported === false) {
    normalizedControls.push(`frequency reset to ${formatLabel(workspace.chart_frequency)}`);
  }
  if (workspace.requested_contribution_dimension_supported === false) {
    normalizedControls.push(
      `contribution view reset to ${formatLabel(workspace.contribution_dimension)}`
    );
  }
  if (workspace.requested_attribution_dimension_supported === false) {
    normalizedControls.push(
      `attribution view reset to ${formatLabel(workspace.attribution_dimension)}`
    );
  }

  if (normalizedControls.length === 0) {
    return null;
  }

  return {
    title: "Selection adjusted",
    message: `Unsupported controls were replaced with supported defaults: ${normalizedControls.join(
      " • "
    )}.`,
  };
}

function mapCapabilityToTrustItem(
  label: string,
  capability: WorkspaceCapability,
  labels: {
    supported: string;
    partial: string;
    unavailable: string;
  }
) {
  if (capability.state === "supported") {
    return {
      label,
      value: labels.supported,
      support: getFirstPaintCapabilitySupport(label, capability),
      tone: "default" as const,
    };
  }
  if (capability.state === "partial") {
    return {
      label,
      value: labels.partial,
      support: getFirstPaintCapabilitySupport(label, capability),
      tone: "warn" as const,
    };
  }
  return {
    label,
    value: labels.unavailable,
    support: getFirstPaintCapabilitySupport(label, capability),
    tone: label === "Evidence" ? ("default" as const) : ("danger" as const),
  };
}

function getFirstPaintCapabilitySupport(
  label: string,
  capability: WorkspaceCapability,
  fallback?: string
): string | undefined {
  switch (label) {
    case "Benchmark":
      if (capability.state === "supported") {
        return capability.latestAvailableDate
          ? `Benchmark context through ${formatDate(capability.latestAvailableDate)}`
          : "Benchmark context ready";
      }
      if (capability.state === "partial") {
        return capability.latestAvailableDate
          ? `Relative returns incomplete through ${formatDate(capability.latestAvailableDate)}`
          : "Relative returns incomplete";
      }
      return "Benchmark not assigned";
    case "Return History":
      if (capability.state === "supported") {
        return capability.latestAvailableDate
          ? `Published through ${formatDate(capability.latestAvailableDate)}`
          : "Published observations ready";
      }
      if (capability.state === "partial") {
        return "Observations only partly published";
      }
      return "Published observations unavailable";
    case "Contribution":
      if (capability.state === "supported") {
        return capability.coverageLevel === "position"
          ? "Position-level contribution ready"
          : "Contribution detail ready";
      }
      if (capability.state === "partial") {
        return capability.fallbackAvailable
          ? "Aggregate fallback ready"
          : "Only aggregate contribution available";
      }
      return "Contribution detail unavailable";
    case "Attribution":
      if (capability.state === "supported") {
        return "Attribution detail ready";
      }
      if (capability.state === "partial") {
        return "Attribution detail partial";
      }
      return "Attribution detail unavailable";
    case "Evidence":
      if (capability.state === "supported") {
        return "Evidence surfaces available";
      }
      if (capability.state === "partial") {
        return "Evidence surfaces still settling";
      }
      return "Evidence not exposed by contract";
    default:
      return capability.reason ?? fallback;
  }
}

function sumOptional(values: Array<number | null | undefined>): number | null {
  const numericValues = values.filter((value): value is number => value != null);
  if (!numericValues.length) {
    return null;
  }
  return numericValues.reduce((sum, value) => sum + value, 0);
}

