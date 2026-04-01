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
import { getPerformanceBenchmarkLabel } from "./performance-summary-context-helpers";

import { formatPct, formatPerformancePositionLabel } from "../formatters";

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
};

export type PerformanceContributorsPresentation =
  | {
      mode: "supported";
      frame: PerformanceSummaryDriverModuleFrame;
      positiveTableModel: PerformanceAnalyticsTableModel;
      negativeTableModel: PerformanceAnalyticsTableModel;
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
  period,
}: {
  kind: "contributors" | "horizons";
  period?: string;
}): PerformanceSummaryDriverModuleFrame {
  if (kind === "contributors") {
    return {
      title: "Performance Drivers",
      subtitle: `${period ?? "Selected period"} contributor ranking`,
    };
  }

  return {
    title: "Horizon Comparison",
    subtitle: "",
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
          contribution: workspace.contribution,
          level: workspace.contribution?.levels?.[0] ?? null,
        });
  const positiveRows = getContributorSideRows(
    positivePositionContributors.length > 0
      ? positivePositionContributors
      : positionRows.filter((row) => row.contribution_pct >= 0),
    "positive"
  );
  const negativeRows = getContributorSideRows(
    negativePositionContributors.length > 0
      ? negativePositionContributors
      : positionRows.filter((row) => row.contribution_pct < 0),
    "negative"
  );

  if (capabilities.contributionRanking.state === "supported") {
    return {
      mode: "supported",
      frame,
      positiveTableModel: buildPerformanceSummaryContributorTableModel(positiveRows),
      negativeTableModel: buildPerformanceSummaryContributorTableModel(negativeRows),
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

function getContributorSideRows(
  rows: ContributionPositionView[],
  direction: "positive" | "negative"
): ContributionPositionView[] {
  const filteredRows = rows.filter((row) =>
    direction === "positive" ? row.contribution_pct >= 0 : row.contribution_pct < 0
  );

  return [...filteredRows].sort((left, right) =>
    direction === "positive"
      ? right.contribution_pct - left.contribution_pct
      : left.contribution_pct - right.contribution_pct
  );
}

function buildPerformanceSummaryContributorTableModel(
  rows: ContributionPositionView[]
): PerformanceAnalyticsTableModel {
  const columns: PerformanceAnalyticsTableColumn[] = [
    { key: "instrument", label: "Instrument" },
    { key: "contribution", label: "Contribution", align: "right" },
    { key: "weight", label: "Weight", align: "right" },
    { key: "return", label: "Return", align: "right" },
  ];

  return {
    columns,
    rows: rows.map((row) => {
      const instrumentLabel = formatPerformancePositionLabel(row.position_id);
      return {
        key: row.position_id,
        ariaLabel: `${instrumentLabel} contributor row`,
        cells: [
          instrumentLabel,
          formatPct(row.contribution_pct),
          formatPct(row.weight_avg_pct),
          formatPct(row.total_return_pct),
        ],
      };
    }),
  };
}

export function getPerformanceHorizonPresentation({
  benchmark,
  benchmarkOptions = [],
  period,
  loadingBody = "Loading horizon comparison.",
  emptyBody = "Horizon comparison is unavailable for this mandate.",
  selectedPeriodRow,
}: {
  benchmark?: string;
  benchmarkOptions?: PerformanceBenchmarkOptionView[];
  period: string;
  loadingBody?: string;
  emptyBody?: string;
  selectedPeriodRow?: PerformanceHorizonComparisonRow;
}): PerformanceHorizonPresentation {
  const benchmarkAssigned =
    Boolean(benchmark) || benchmarkOptions.some((option) => option.is_assigned);
  const benchmarkLabel = getPerformanceBenchmarkLabel(benchmark, benchmarkOptions);

  return {
    frame: getPerformanceSummaryDriverModuleFrame({
      kind: "horizons",
    }),
    selectedPeriodLabel: period,
    activeReturnLabel:
      selectedPeriodRow?.active_return_pct === null ||
      selectedPeriodRow?.active_return_pct === undefined
        ? "Unavailable"
        : formatPct(selectedPeriodRow.active_return_pct),
    benchmarkLabel: benchmarkAssigned ? benchmarkLabel : "Not assigned",
    benchmarkLegendLabel: benchmarkAssigned ? benchmarkLabel : "Benchmark",
    loadingBody,
    emptyBody,
  };
}
