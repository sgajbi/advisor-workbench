import type {
  ContributionRowView,
  PerformanceChartPoint,
  WorkbenchPerformanceWorkspace,
} from "@/features/workbench/types";

const RETURN_TOLERANCE = 0.0001;
const EXTREME_MWR_THRESHOLD = 50;

export function hasBenchmarkContext(workspace: WorkbenchPerformanceWorkspace): boolean {
  return Boolean(
    workspace.benchmark_code ||
      workspace.net_performance.benchmark_id ||
      workspace.gross_performance.benchmark_id ||
      workspace.attribution?.benchmark_id ||
      workspace.net_performance.benchmark_return_pct !== null ||
      workspace.gross_performance.benchmark_return_pct !== null
  );
}

export function hasMeaningfulHistory(points: PerformanceChartPoint[]): boolean {
  return points.length >= 2;
}

export function hasDistinctGrossPerformance(workspace: WorkbenchPerformanceWorkspace): boolean {
  if (
    Math.abs(
      (workspace.net_performance.portfolio_return_pct ?? 0) -
        (workspace.gross_performance.portfolio_return_pct ?? 0)
    ) > RETURN_TOLERANCE
  ) {
    return true;
  }

  if (workspace.net_chart.length !== workspace.gross_chart.length) {
    return true;
  }

  return workspace.net_chart.some((point, index) => {
    const grossPoint = workspace.gross_chart[index];
    return (
      grossPoint === undefined ||
      Math.abs(
        (point.cumulative_portfolio_return_pct ?? 0) -
          (grossPoint.cumulative_portfolio_return_pct ?? 0)
      ) > RETURN_TOLERANCE
    );
  });
}

export function hasUsableAttribution(workspace: WorkbenchPerformanceWorkspace): boolean {
  return (workspace.attribution?.levels ?? []).length > 0;
}

export function hasUsableContribution(workspace: WorkbenchPerformanceWorkspace): boolean {
  return (workspace.contribution?.levels ?? []).length > 0;
}

export function getPrimaryContributionRow(
  workspace: WorkbenchPerformanceWorkspace
): ContributionRowView | null {
  const rows = workspace.contribution?.levels?.[0]?.rows ?? [];
  if (!rows.length) {
    return null;
  }
  return [...rows].sort(
    (left, right) => Math.abs(right.contribution_pct) - Math.abs(left.contribution_pct)
  )[0] ?? null;
}

export function getTopContributionRows(
  workspace: WorkbenchPerformanceWorkspace,
  count = 5
): ContributionRowView[] {
  const rows = workspace.contribution?.levels?.[0]?.rows ?? [];
  return [...rows]
    .sort((left, right) => right.contribution_pct - left.contribution_pct)
    .slice(0, count);
}

export function getBottomContributionRows(
  workspace: WorkbenchPerformanceWorkspace,
  count = 5
): ContributionRowView[] {
  const rows = workspace.contribution?.levels?.[0]?.rows ?? [];
  return [...rows]
    .sort((left, right) => left.contribution_pct - right.contribution_pct)
    .slice(0, count);
}

export function isMoneyWeightedReturnSuspicious(
  workspace: WorkbenchPerformanceWorkspace
): boolean {
  const value = workspace.money_weighted_return?.money_weighted_return_pct;
  return value !== null && value !== undefined && Math.abs(value) >= EXTREME_MWR_THRESHOLD;
}

export function getCoverageLabel(workspace: WorkbenchPerformanceWorkspace): string {
  const coverage = workspace.contribution?.coverage_mv_pct;
  if (coverage === null || coverage === undefined) {
    return "Coverage unavailable";
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
  return "Low coverage";
}
