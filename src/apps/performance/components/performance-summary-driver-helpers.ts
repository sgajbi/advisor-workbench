import type {
  PerformanceBenchmarkOptionView,
  PerformanceHorizonComparisonRow,
} from "@/features/workbench/types";

import type { PerformanceSummaryContributorsSectionProps } from "./performance-workspace-types";

import { formatLabel, formatPct } from "../formatters";

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
  isDetailsPending,
}: PerformanceSummaryContributorsSectionProps): PerformanceContributorsPresentation {
  const frame = getPerformanceSummaryDriverModuleFrame({
    kind: "contributors",
    period: workspace.period,
  });

  if (capabilities.contributionRanking.state === "supported") {
    return {
      mode: "supported",
      frame,
      positiveRows: positivePositionContributors.map((row) => ({
        key: `top-position-${row.position_id}`,
        title: row.position_id,
        subtitle: `Avg. Weight ${formatPct(row.weight_avg_pct)}`,
        value: formatPct(row.contribution_pct),
        magnitudePct: Math.abs(row.contribution_pct ?? 0),
        tone: "positive",
      })),
      negativeRows: negativePositionContributors.map((row) => ({
        key: `bottom-position-${row.position_id}`,
        title: row.position_id,
        subtitle: `Avg. Weight ${formatPct(row.weight_avg_pct)}`,
        value: formatPct(row.contribution_pct),
        magnitudePct: Math.abs(row.contribution_pct ?? 0),
        tone: "negative",
      })),
    };
  }

  if (isDetailsPending) {
    return {
      mode: "loading",
      frame,
      body: "Loading contributor ranking for the selected analytical slice.",
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
    hint: "Position-level contribution ranking needs source-backed contribution detail for the selected slice.",
  };
}

export function getPerformanceHorizonPresentation({
  benchmark,
  benchmarkOptions = [],
  detailBasis,
  period,
  loadingBody = "Loading comparative horizon summaries.",
  emptyBody = "Comparative horizon summaries are not available for this mandate.",
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
