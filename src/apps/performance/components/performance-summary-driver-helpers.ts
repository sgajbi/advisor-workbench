import type {
  ContributionPositionView,
  ContributionRowView,
  PerformanceBenchmarkOptionView,
  PerformanceHorizonComparisonRow,
} from "@/features/workbench/types";

import type { PerformanceSummaryContributorsSectionProps } from "./performance-workspace-types";
import {
  buildPerformanceContributionTableModel,
  buildPerformancePositionContributionTableModel,
  type PerformanceAnalyticsTableModel,
} from "./performance-analytics-table-models";

import { formatLabel, formatPct, formatPerformancePositionLabel } from "../formatters";

export type PerformanceContributorRankedItem = {
  key: string;
  title: string;
  subtitle: string;
  value: string;
  magnitudePct: number;
  tone: "positive" | "negative";
};

export type PerformanceSummaryDriverModuleFrame = {
  title: string;
  subtitle: string;
  actionLabel?: string;
};

export type PerformanceContributorsPresentation =
  | {
      mode: "supported";
      frame: PerformanceSummaryDriverModuleFrame;
      positiveRows: PerformanceContributorRankedItem[];
      negativeRows: PerformanceContributorRankedItem[];
      tableModel: PerformanceAnalyticsTableModel;
    }
  | {
      mode: "partial";
      frame: PerformanceSummaryDriverModuleFrame;
      noticeTitle: string;
      noticeBody: string;
      hint: string;
      tableModel: PerformanceAnalyticsTableModel;
    }
  | {
      mode: "loading";
      frame: PerformanceSummaryDriverModuleFrame;
      body: string;
    }
  | {
      mode: "notice";
      frame: PerformanceSummaryDriverModuleFrame;
      noticeTitle: string;
      noticeBody: string;
      hint: string;
    };

export type PerformanceHorizonPresentation = {
  frame: PerformanceSummaryDriverModuleFrame;
  activeReturnLabel: string;
  benchmarkLabel: string;
  benchmarkLegendLabel: string;
  emptyBody: string;
  loadingBody: string;
  selectedPeriodLabel: string;
};

export function getPerformanceSummaryDriverModuleFrame({
  kind,
  benchmarkAssigned,
  benchmarkLabel,
  detailBasis,
  period,
}: {
  kind: "contributors" | "horizons";
  benchmarkAssigned?: boolean;
  benchmarkLabel?: string;
  detailBasis?: string;
  period?: string;
}): PerformanceSummaryDriverModuleFrame {
  if (kind === "contributors") {
    return {
      title: "What drove the result?",
      subtitle: `${period ?? "Selected period"} contributor ranking`,
    };
  }

  return {
    title: "How did this compare across horizons?",
    subtitle: benchmarkAssigned
      ? `Portfolio vs ${benchmarkLabel ?? "Benchmark"}`
      : "Portfolio comparison across standard reporting windows",
    actionLabel: detailBasis,
  };
}

export function getPerformanceContributorsPresentation({
  workspace,
  capabilities,
  positivePositionContributors,
  negativePositionContributors,
  topContributors,
  bottomContributors,
  isDetailsPending,
}: PerformanceSummaryContributorsSectionProps): PerformanceContributorsPresentation {
  const frame = getPerformanceSummaryDriverModuleFrame({
    kind: "contributors",
    period: workspace.period,
  });
  const aggregateRows = getAggregateContributorRows(workspace.contribution?.levels?.[0]?.rows ?? [], {
    topContributors,
    bottomContributors,
  });
  const positionRows = getSortedPositionContributorRows(workspace.contribution?.position_rows ?? []);
  const tableModel =
    capabilities.contributionRanking.state === "supported" && positionRows.length > 0
      ? buildPerformancePositionContributionTableModel({
          rows: positionRows,
        })
      : buildPerformanceContributionTableModel({
          rows: aggregateRows,
        });
  const positiveRankedRows =
    positivePositionContributors.length > 0
      ? positivePositionContributors.map((row) => ({
          key: `top-position-${row.position_id}`,
          title: formatPerformancePositionLabel(row.position_id),
          subtitle: `Avg. Weight ${formatPct(row.weight_avg_pct)}`,
          value: formatPct(row.contribution_pct),
          magnitudePct: Math.abs(row.contribution_pct ?? 0),
          tone: "positive" as const,
        }))
      : [];
  const negativeRankedRows =
    negativePositionContributors.length > 0
      ? negativePositionContributors.map((row) => ({
          key: `bottom-position-${row.position_id}`,
          title: formatPerformancePositionLabel(row.position_id),
          subtitle: `Avg. Weight ${formatPct(row.weight_avg_pct)}`,
          value: formatPct(row.contribution_pct),
          magnitudePct: Math.abs(row.contribution_pct ?? 0),
          tone: "negative" as const,
        }))
      : [];

  if (capabilities.contributionRanking.state === "supported") {
    return {
      mode: "supported",
      frame,
      positiveRows: positiveRankedRows,
      negativeRows: negativeRankedRows,
      tableModel,
    };
  }

  if (isDetailsPending) {
    return {
      mode: "loading",
      frame,
      body: "Loading contributor ranking.",
    };
  }

  if (capabilities.contributionRanking.state === "partial" && aggregateRows.length > 0) {
    return {
      mode: "partial",
      frame,
      noticeTitle: "Contributor ranking is partial",
      noticeBody:
        capabilities.contributionRanking.reason ??
        "Contribution exists, but only aggregate rows are available.",
      hint: "Aggregate contribution remains available even when position-level ranking is absent.",
      tableModel,
    };
  }

  return {
    mode: "notice",
    frame,
    noticeTitle:
      capabilities.contributionRanking.state === "partial"
        ? "Contributor ranking is partial"
        : "Contributor ranking unavailable",
    noticeBody:
      capabilities.contributionRanking.reason ??
      "Contributor ranking is not available for the current selection.",
    hint: "Position-level ranking requires source-backed contribution detail.",
  };
}

function getSortedPositionContributorRows(
  rows: ContributionPositionView[]
): ContributionPositionView[] {
  return [...rows].sort(
    (left, right) => Math.abs(right.contribution_pct) - Math.abs(left.contribution_pct)
  );
}

function getAggregateContributorRows(
  levelRows: ContributionRowView[],
  fallbackRows: {
    topContributors: ContributionRowView[];
    bottomContributors: ContributionRowView[];
  }
): ContributionRowView[] {
  if (levelRows.length > 0) {
    return [...levelRows].sort(
      (left, right) => Math.abs(right.contribution_pct) - Math.abs(left.contribution_pct)
    );
  }

  const deduped = new Map<string, ContributionRowView>();
  [...fallbackRows.topContributors, ...fallbackRows.bottomContributors].forEach((row) => {
    deduped.set(row.key_label, row);
  });

  return [...deduped.values()].sort(
    (left, right) => Math.abs(right.contribution_pct) - Math.abs(left.contribution_pct)
  );
}

export function getPerformanceHorizonPresentation({
  benchmark,
  benchmarkOptions = [],
  detailBasis,
  period,
  loadingBody = "Loading horizon comparison.",
  emptyBody = "Horizon comparison is unavailable for this mandate.",
  selectedPeriodRow,
}: {
  benchmark?: string;
  benchmarkOptions?: PerformanceBenchmarkOptionView[];
  detailBasis: string;
  period: string;
  loadingBody?: string;
  emptyBody?: string;
  selectedPeriodRow?: PerformanceHorizonComparisonRow;
}): PerformanceHorizonPresentation {
  const benchmarkAssigned =
    Boolean(benchmark) || benchmarkOptions.some((option) => option.is_assigned);
  const benchmarkLabel = formatBenchmarkLabel(benchmark, benchmarkOptions);

  return {
    frame: getPerformanceSummaryDriverModuleFrame({
      kind: "horizons",
      benchmarkAssigned,
      benchmarkLabel,
      detailBasis,
    }),
    selectedPeriodLabel: period,
    activeReturnLabel:
      selectedPeriodRow?.active_return_pct === null ||
      selectedPeriodRow?.active_return_pct === undefined
        ? "Unavailable"
        : formatPct(selectedPeriodRow.active_return_pct),
    benchmarkLabel,
    benchmarkLegendLabel: benchmarkAssigned ? benchmarkLabel : "Benchmark",
    loadingBody,
    emptyBody,
  };
}

function formatBenchmarkLabel(
  benchmark?: string,
  benchmarkOptions: PerformanceBenchmarkOptionView[] = []
) {
  if (!benchmark) {
    return "Benchmark";
  }

  return (
    benchmarkOptions.find((option) => option.benchmark_code === benchmark)?.benchmark_name ??
    formatLabel(benchmark)
  );
}
