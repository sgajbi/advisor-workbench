import type {
  ContributionPositionView,
  ContributionRowView,
  PerformanceChartPoint,
  AttributionRowView,
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

export function hasPositionContributionRanking(
  workspace: WorkbenchPerformanceWorkspace
): boolean {
  return (workspace.contribution?.position_rows ?? []).length > 0;
}

export function getTopPositionContributionRows(
  workspace: WorkbenchPerformanceWorkspace,
  count = 5
): ContributionPositionView[] {
  const rows = workspace.contribution?.position_rows ?? [];
  return [...rows]
    .sort((left, right) => right.contribution_pct - left.contribution_pct)
    .slice(0, count);
}

export function getPositivePositionContributionRows(
  workspace: WorkbenchPerformanceWorkspace,
  count = 5
): ContributionPositionView[] {
  const rows = workspace.contribution?.position_rows ?? [];
  return [...rows]
    .filter((row) => row.contribution_pct > RETURN_TOLERANCE)
    .sort((left, right) => right.contribution_pct - left.contribution_pct)
    .slice(0, count);
}

export function getBottomPositionContributionRows(
  workspace: WorkbenchPerformanceWorkspace,
  count = 5
): ContributionPositionView[] {
  const rows = workspace.contribution?.position_rows ?? [];
  return [...rows]
    .sort((left, right) => left.contribution_pct - right.contribution_pct)
    .slice(0, count);
}

export function getNegativePositionContributionRows(
  workspace: WorkbenchPerformanceWorkspace,
  count = 5
): ContributionPositionView[] {
  const rows = workspace.contribution?.position_rows ?? [];
  return [...rows]
    .filter((row) => row.contribution_pct < -RETURN_TOLERANCE)
    .sort((left, right) => left.contribution_pct - right.contribution_pct)
    .slice(0, count);
}

export function getActiveWeightRows(
  workspace: WorkbenchPerformanceWorkspace,
  count = 8
): Array<
  AttributionRowView & {
    active_weight_pct: number;
  }
> {
  const rows = workspace.attribution?.levels?.[0]?.rows ?? [];
  return rows
    .filter(
      (row) =>
        row.portfolio_weight_avg_pct !== null &&
        row.portfolio_weight_avg_pct !== undefined &&
        row.benchmark_weight_avg_pct !== null &&
        row.benchmark_weight_avg_pct !== undefined
    )
    .map((row) => ({
      ...row,
      active_weight_pct:
        (row.portfolio_weight_avg_pct ?? 0) - (row.benchmark_weight_avg_pct ?? 0),
    }))
    .sort((left, right) => Math.abs(right.active_weight_pct) - Math.abs(left.active_weight_pct))
    .slice(0, count);
}

export function getTopAttributionEffectRows(
  workspace: WorkbenchPerformanceWorkspace,
  count = 8
): AttributionRowView[] {
  const rows = workspace.attribution?.levels?.[0]?.rows ?? [];
  return [...rows]
    .sort((left, right) => Math.abs(right.total_effect_pct) - Math.abs(left.total_effect_pct))
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

export type PerformanceWorkspacePresentation = {
  hasBenchmark: boolean;
  hasAttribution: boolean;
  hasContribution: boolean;
  hasHistory: boolean;
  primaryDriver: ContributionRowView | null;
  hasPositionRanking: boolean;
  hasMoneyWeightedReturn: boolean;
  suspiciousMoneyWeightedReturn: boolean;
  positivePositionContributors: ContributionPositionView[];
  negativePositionContributors: ContributionPositionView[];
  topContributors: ContributionRowView[];
  bottomContributors: ContributionRowView[];
  contributorScale: number;
};

export function getPerformanceWorkspacePresentation(
  workspace: WorkbenchPerformanceWorkspace
): PerformanceWorkspacePresentation {
  const hasBenchmark = hasBenchmarkContext(workspace);
  const hasAttribution = hasUsableAttribution(workspace);
  const hasContribution = hasUsableContribution(workspace);
  const hasHistory = hasMeaningfulHistory(workspace.net_chart);
  const primaryDriver = getPrimaryContributionRow(workspace);
  const hasPositionRanking = hasPositionContributionRanking(workspace);
  const hasMoneyWeightedReturn = Boolean(
    workspace.money_weighted_return?.money_weighted_return_pct !== null &&
      workspace.money_weighted_return?.money_weighted_return_pct !== undefined
  );
  const suspiciousMoneyWeightedReturn = isMoneyWeightedReturnSuspicious(workspace);
  const positivePositionContributors = getPositivePositionContributionRows(workspace);
  const negativePositionContributors = getNegativePositionContributionRows(workspace);
  const topContributors = getTopContributionRows(workspace);
  const bottomContributors = getBottomContributionRows(workspace);
  const contributorRows = hasPositionRanking
    ? [...positivePositionContributors, ...negativePositionContributors]
    : [...topContributors, ...bottomContributors];
  const contributorScale = Math.max(
    0.01,
    ...contributorRows.map((row) => Math.abs(row.contribution_pct))
  );

  return {
    hasBenchmark,
    hasAttribution,
    hasContribution,
    hasHistory,
    primaryDriver,
    hasPositionRanking,
    hasMoneyWeightedReturn,
    suspiciousMoneyWeightedReturn,
    positivePositionContributors,
    negativePositionContributors,
    topContributors,
    bottomContributors,
    contributorScale,
  };
}
