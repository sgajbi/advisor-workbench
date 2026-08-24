import { AnalyticsTable } from "@/design-system";
import type { AttributionSummaryView } from "@/features/workbench/types";

import { formatLabel, formatPct } from "../formatters";
import { PERFORMANCE_RETURN_LABELS } from "../performance-terminology";
import { getAttributionSupportabilityLine } from "./performance-attribution-presentations";
import PerformanceAttributionReconciliationNote from "./performance-attribution-reconciliation-note";
import {
  getAttributionWeightTotals,
  NOT_ADDITIVE_CELL,
} from "./performance-workspace-view-helpers";

type PerformanceAnalysisAttributionBreakdownProps = {
  attribution: AttributionSummaryView;
};

function getDifference(
  left: number | null | undefined,
  right: number | null | undefined
): number | null {
  return left !== null && left !== undefined && right !== null && right !== undefined
    ? left - right
    : null;
}

function formatAttributionTotal(value: number | null | undefined): string {
  return value === null || value === undefined ? "Unavailable" : formatPct(value);
}

function PerformanceAttributionSummaryFallback({
  level,
}: {
  level: AttributionSummaryView["levels"][number];
}) {
  return (
    <div
      key={`${level.dimension}-${level.total_effect_pct}`}
      className="performance-analysis-summary-fallback"
    >
      <AnalyticsTable
        className="performance-analysis-table"
        density="compact"
        variant="analysis"
        ariaLabel={`${formatLabel(level.dimension)} attribution totals`}
        columns={[
          { key: "view", label: "Metric" },
          { key: "allocation", label: "Allocation", align: "right" },
          { key: "selection", label: "Selection", align: "right" },
          { key: "interaction", label: "Interaction", align: "right" },
          { key: "total", label: "Total effect", align: "right" },
        ]}
        rows={[
          {
            key: `${level.dimension}-summary`,
            cells: [
              "Summary total",
              formatAttributionTotal(level.allocation_total_pct),
              formatAttributionTotal(level.selection_total_pct),
              formatAttributionTotal(level.interaction_total_pct),
              formatAttributionTotal(level.total_effect_pct),
            ],
          },
        ]}
      />
    </div>
  );
}

function PerformanceAttributionLevelTable({
  level,
}: {
  level: AttributionSummaryView["levels"][number];
}) {
  const weightTotals = getAttributionWeightTotals(level);
  const activeWeightTotal =
    weightTotals.portfolioWeightAvgPct !== null && weightTotals.benchmarkWeightAvgPct !== null
      ? weightTotals.portfolioWeightAvgPct - weightTotals.benchmarkWeightAvgPct
      : null;

  return (
    <div
      key={`${level.dimension}-${level.total_effect_pct}`}
      className="performance-analysis-detail-stack performance-attribution-breakdown"
    >
      <AnalyticsTable
        className="performance-analysis-table"
        density="compact"
        variant="analysis"
        ariaLabel={`${formatLabel(level.dimension)} attribution table`}
        columns={[
          { key: "bucket", label: "Segment" },
          { key: "portWt", label: "Portfolio weight", align: "right" },
          { key: "bmkWt", label: "Benchmark weight", align: "right" },
          { key: "activeWt", label: "Active weight", align: "right" },
          {
            key: "portRet",
            label: PERFORMANCE_RETURN_LABELS.portfolioTwr,
            align: "right",
          },
          {
            key: "bmkRet",
            label: PERFORMANCE_RETURN_LABELS.benchmarkTwr,
            align: "right",
          },
          {
            key: "activeRet",
            label: PERFORMANCE_RETURN_LABELS.activeReturn,
            align: "right",
          },
          { key: "allocation", label: "Allocation", align: "right" },
          { key: "selection", label: "Selection", align: "right" },
          { key: "interaction", label: "Interaction", align: "right" },
          { key: "total", label: "Total effect", align: "right" },
        ]}
        rows={level.rows.map((row) => ({
          key: `${level.dimension}-${row.key_label}`,
          cells: [
            formatLabel(row.key_label),
            formatPct(row.portfolio_weight_avg_pct),
            formatPct(row.benchmark_weight_avg_pct),
            formatPct(getDifference(row.portfolio_weight_avg_pct, row.benchmark_weight_avg_pct)),
            formatPct(row.portfolio_return_pct),
            formatPct(row.benchmark_return_pct),
            formatPct(getDifference(row.portfolio_return_pct, row.benchmark_return_pct)),
            formatPct(row.allocation_pct),
            formatPct(row.selection_pct),
            formatPct(row.interaction_pct),
            formatPct(row.total_effect_pct),
          ],
        }))}
        footer={[
          "Total",
          formatPct(weightTotals.portfolioWeightAvgPct),
          formatPct(weightTotals.benchmarkWeightAvgPct),
          formatPct(activeWeightTotal),
          NOT_ADDITIVE_CELL,
          NOT_ADDITIVE_CELL,
          NOT_ADDITIVE_CELL,
          formatAttributionTotal(level.allocation_total_pct),
          formatAttributionTotal(level.selection_total_pct),
          formatAttributionTotal(level.interaction_total_pct),
          formatAttributionTotal(level.total_effect_pct),
        ]}
      />
    </div>
  );
}

export default function PerformanceAnalysisAttributionBreakdown({
  attribution,
}: PerformanceAnalysisAttributionBreakdownProps) {
  const supportabilityLine = getAttributionSupportabilityLine(attribution);

  return (
    <div className="performance-analysis-detail-stack performance-attribution-breakdown-stack">
      <PerformanceAttributionReconciliationNote attribution={attribution} />
      {supportabilityLine ? (
        <p className="performance-analysis-summary-fallback-copy">{supportabilityLine}</p>
      ) : null}
      {attribution.levels.map((level) =>
        level.rows.length > 0 ? (
          <PerformanceAttributionLevelTable key={level.dimension} level={level} />
        ) : (
          <PerformanceAttributionSummaryFallback key={level.dimension} level={level} />
        )
      )}
    </div>
  );
}
