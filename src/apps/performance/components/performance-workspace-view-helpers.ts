import type { WorkbenchStatusStripItem } from "@/design-system";
import type { WorkbenchPerformanceWorkspace } from "@/features/workbench/types";
import type { PerformanceWorkspaceCapabilities } from "../capabilities";
import type { WorkspaceCapability } from "@/shell/workspace-capabilities";

import { formatDate, formatLabel } from "../formatters";

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

type SummaryMetricCard = {
  label: string;
  value: string | number;
  support?: string;
  emphasize?: boolean;
  unavailable?: boolean;
};

export type PerformanceExecutiveReturnPresentation = {
  cards: SummaryMetricCard[];
};

export type PerformanceTrustStripPresentation = {
  items: WorkbenchStatusStripItem[];
};

export function getPerformanceSummaryHeaderPresentation({
  workspace,
  detailBasis,
  capabilities,
  selectedBenchmarkCode,
  selectedBenchmarkLabel,
  selectedPerformance,
  hasMoneyWeightedReturn,
  suspiciousMoneyWeightedReturn,
}: {
  workspace: WorkbenchPerformanceWorkspace;
  detailBasis: string;
  capabilities: PerformanceWorkspaceCapabilities;
  selectedBenchmarkCode?: string;
  selectedBenchmarkLabel?: string | null;
  selectedPerformance:
    | WorkbenchPerformanceWorkspace["net_performance"]
    | WorkbenchPerformanceWorkspace["gross_performance"]
    | undefined;
  hasMoneyWeightedReturn: boolean;
  suspiciousMoneyWeightedReturn: boolean;
}) {
  const hasBenchmark = capabilities.benchmarkComparison.state !== "unavailable";
  const hasHistory = capabilities.returnPath.state === "supported";
  const benchmarkValue = hasBenchmark ? selectedBenchmarkLabel ?? "Assigned" : "Unassigned";
  const benchmarkHint =
    capabilities.benchmarkComparison.state === "supported"
      ? "Relative analytics are active for this mandate."
      : capabilities.benchmarkComparison.state === "partial"
        ? capabilities.benchmarkComparison.reason ?? "Benchmark-relative analytics are partially available."
        : "Assign a benchmark to enable relative analytics.";

  const primaryReturnCard = buildMetricCard({
    label: "Portfolio Return",
    value:
      selectedPerformance?.portfolio_return_pct != null
        ? `${selectedPerformance.portfolio_return_pct.toFixed(2)}%`
        : "Unavailable",
    support:
      capabilities.benchmarkComparison.state === "supported"
        ? `Active ${formatCompactPctValue(selectedPerformance?.active_return_pct ?? null)} versus benchmark`
        : "Absolute performance for the selected mandate and horizon.",
    emphasize: true,
    unavailable: selectedPerformance?.portfolio_return_pct == null,
  });

  const benchmarkCard = buildMetricCard({
    label: "Benchmark Return",
    value:
      capabilities.benchmarkComparison.state === "supported" &&
      selectedPerformance?.benchmark_return_pct != null
        ? `${selectedPerformance.benchmark_return_pct.toFixed(2)}%`
        : "Unavailable",
    support:
      capabilities.benchmarkComparison.reason ?? "Benchmark comparison for the selected period.",
    unavailable:
      capabilities.benchmarkComparison.state !== "supported" ||
      selectedPerformance?.benchmark_return_pct == null,
  });

  const activeCard = buildMetricCard({
    label: "Active Return",
    value:
      capabilities.benchmarkComparison.state === "supported" &&
      selectedPerformance?.active_return_pct != null
        ? `${selectedPerformance.active_return_pct.toFixed(2)}%`
        : "Unavailable",
    support:
      capabilities.benchmarkComparison.state === "supported"
        ? "Relative portfolio performance versus the assigned benchmark."
        : capabilities.benchmarkComparison.reason ??
          "Requires an assigned benchmark and published benchmark returns.",
    unavailable:
      capabilities.benchmarkComparison.state !== "supported" ||
      selectedPerformance?.active_return_pct == null,
  });

  const moneyWeightedCard = buildMetricCard({
    label: "Money-Weighted",
    value:
      workspace.money_weighted_return?.money_weighted_return_pct != null
        ? `${workspace.money_weighted_return.money_weighted_return_pct.toFixed(2)}%`
        : "Unavailable",
    support: hasMoneyWeightedReturn
      ? workspace.money_weighted_return?.annualized_return_pct != null
        ? `Annualized ${formatCompactPctValue(workspace.money_weighted_return.annualized_return_pct)}${
            suspiciousMoneyWeightedReturn ? " • review cash-flow timing" : ""
          }`
        : workspace.money_weighted_return?.method ?? "Cash-flow aware return"
      : "Requires cash-flow history across the selected period.",
    unavailable: workspace.money_weighted_return?.money_weighted_return_pct == null,
  });

  const contextCards: SummaryMetricCard[] = [
    buildMetricCard({
      label: "Basis",
      value: detailBasis === "GROSS" ? "Gross" : "Net",
      support: "Selected return basis.",
    }),
    buildMetricCard({
      label: "Period",
      value: workspace.period,
      support: `${formatDate(workspace.report_start_date)} - ${formatDate(workspace.report_end_date)}`,
    }),
    buildMetricCard({
      label: "Benchmark",
      value: benchmarkValue,
      support: benchmarkHint,
      unavailable: !hasBenchmark,
    }),
  ];

  return {
    hasBenchmark,
    hasHistory,
    benchmarkValue,
    benchmarkHint,
    selectedBenchmarkCode,
    primaryReturnCard,
    benchmarkCard,
    activeCard,
    moneyWeightedCard,
    contextCards,
  };
}

export function getPerformanceExecutiveReturnPresentation({
  workspace,
  detailBasis,
  selectedPerformance,
  selectedBenchmarkLabel,
  capabilities,
}: {
  workspace: WorkbenchPerformanceWorkspace;
  detailBasis: string;
  selectedPerformance:
    | WorkbenchPerformanceWorkspace["net_performance"]
    | WorkbenchPerformanceWorkspace["gross_performance"]
    | undefined;
  selectedBenchmarkLabel?: string | null;
  capabilities: PerformanceWorkspaceCapabilities;
}): PerformanceExecutiveReturnPresentation {
  const hasBenchmark = capabilities.benchmarkComparison.state !== "unavailable";

  return {
    cards: [
      buildMetricCard({
        label: "Portfolio Return",
        value: formatPctValue(selectedPerformance?.portfolio_return_pct),
        support: "Performance over the selected period.",
        emphasize: true,
        unavailable: selectedPerformance?.portfolio_return_pct == null,
      }),
      buildMetricCard({
        label: "Benchmark Return",
        value:
          hasBenchmark && selectedPerformance?.benchmark_return_pct != null
            ? formatPctValue(selectedPerformance.benchmark_return_pct)
            : "Unavailable",
        support:
          capabilities.benchmarkComparison.reason ?? "Benchmark-relative return for the selected period.",
        unavailable: !hasBenchmark || selectedPerformance?.benchmark_return_pct == null,
      }),
      buildMetricCard({
        label: "Active Return",
        value:
          hasBenchmark && selectedPerformance?.active_return_pct != null
            ? formatPctValue(selectedPerformance.active_return_pct)
            : "Unavailable",
        support: hasBenchmark
          ? "Portfolio return minus benchmark return."
          : capabilities.benchmarkComparison.reason ?? "Requires an assigned benchmark.",
        unavailable: !hasBenchmark || selectedPerformance?.active_return_pct == null,
      }),
      buildMetricCard({
        label: "Basis",
        value: detailBasis === "GROSS" ? "Gross" : "Net",
        support: "Selected measurement basis.",
      }),
      buildMetricCard({
        label: "Period",
        value: workspace.period,
        support: `${formatDate(workspace.report_start_date)} - ${formatDate(workspace.report_end_date)}`,
      }),
      buildMetricCard({
        label: "Benchmark",
        value: hasBenchmark ? selectedBenchmarkLabel ?? "Assigned" : "Unassigned",
        support: hasBenchmark
          ? "Reference benchmark used for relative comparison."
          : "Assign a benchmark to enable relative analytics.",
        unavailable: !hasBenchmark,
      }),
    ],
  };
}

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
      support: capability.reason,
      tone: "success" as const,
    };
  }
  if (capability.state === "partial") {
    return {
      label,
      value: labels.partial,
      support: capability.reason,
      tone: "warn" as const,
    };
  }
  return {
    label,
    value: labels.unavailable,
    support: capability.reason,
    tone: label === "Evidence" ? ("default" as const) : ("danger" as const),
  };
}

function sumOptional(values: Array<number | null | undefined>): number | null {
  const numericValues = values.filter((value): value is number => value != null);
  if (!numericValues.length) {
    return null;
  }
  return numericValues.reduce((sum, value) => sum + value, 0);
}

function buildMetricCard(card: SummaryMetricCard): SummaryMetricCard {
  return card;
}

function formatPctValue(value: number | null | undefined): string {
  return value == null ? "Unavailable" : `${value.toFixed(2)}%`;
}

function formatCompactPctValue(value: number | null | undefined): string {
  return formatPctValue(value);
}

