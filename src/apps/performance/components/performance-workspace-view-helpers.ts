import type { WorkbenchPerformanceWorkspace } from "@/features/workbench/types";

import { formatLabel } from "../formatters";

export const NOT_ADDITIVE_CELL = "—";

export const summaryLabelSx = {
  display: "block",
  mb: 1,
  fontSize: "0.6875rem",
  fontWeight: 800,
  letterSpacing: "0.08em",
  textTransform: "uppercase",
  color: "text.secondary",
} as const;

export const inlineControlLabelSx = {
  display: "block",
  mb: 0.5,
  fontSize: "0.6875rem",
  fontWeight: 800,
  letterSpacing: "0.08em",
  textTransform: "uppercase",
  color: "text.secondary",
} as const;

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

function sumOptional(values: Array<number | null | undefined>): number | null {
  const numericValues = values.filter((value): value is number => value != null);
  if (!numericValues.length) {
    return null;
  }
  return numericValues.reduce((sum, value) => sum + value, 0);
}
