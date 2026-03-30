import type { PerformanceHorizonComparisonRow } from "@/features/workbench/types";

import type { PerformanceSummaryContributorsSectionProps } from "./performance-workspace-types";

import { formatPct } from "../formatters";

export type PerformanceContributorRankedItem = {
  key: string;
  title: string;
  subtitle: string;
  value: string;
  magnitudePct: number;
  tone: "positive" | "negative";
};

export type PerformanceContributorsPresentation =
  | {
      mode: "supported";
      title: string;
      subtitle: string;
      positiveRows: PerformanceContributorRankedItem[];
      negativeRows: PerformanceContributorRankedItem[];
    }
  | {
      mode: "loading";
      title: string;
      subtitle: string;
      body: string;
    }
  | {
      mode: "notice";
      title: string;
      subtitle: string;
      noticeTitle: string;
      noticeBody: string;
      hint: string;
    };

export type PerformanceHorizonContextPresentation = {
  activeReturnLabel: string;
  benchmarkLabel: string;
  selectedPeriodLabel: string;
};

export function getPerformanceContributorsPresentation({
  workspace,
  capabilities,
  positivePositionContributors,
  negativePositionContributors,
  isDetailsPending,
}: PerformanceSummaryContributorsSectionProps): PerformanceContributorsPresentation {
  const title = "Top contributors and detractors";
  const subtitle = `${workspace.period} position ranking`;

  if (capabilities.contributionRanking.state === "supported") {
    return {
      mode: "supported",
      title,
      subtitle,
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
      title,
      subtitle,
      body: "Loading contributor ranking for the selected analytical slice.",
    };
  }

  return {
    mode: "notice",
    title,
    subtitle,
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

export function getPerformanceHorizonContextPresentation({
  period,
  benchmarkLabel,
  selectedPeriodRow,
}: {
  period: string;
  benchmarkLabel: string;
  selectedPeriodRow?: PerformanceHorizonComparisonRow;
}): PerformanceHorizonContextPresentation {
  return {
    selectedPeriodLabel: period,
    activeReturnLabel:
      selectedPeriodRow?.active_return_pct === null ||
      selectedPeriodRow?.active_return_pct === undefined
        ? "Unavailable"
        : formatPct(selectedPeriodRow.active_return_pct),
    benchmarkLabel,
  };
}
