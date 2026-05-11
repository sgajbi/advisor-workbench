import { AnalyticsTable } from "@/design-system";
import type { AttributionSummaryView } from "@/features/workbench/types";

import { formatLabel, formatPct } from "../formatters";
import {
  getAttributionSupportabilityLine,
} from "./performance-attribution-presentations";
import PerformanceAttributionReconciliationNote from "./performance-attribution-reconciliation-note";
import { getAttributionTotals, NOT_ADDITIVE_CELL } from "./performance-workspace-view-helpers";

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

function PerformanceAttributionSummaryFallback({
  level,
}: {
  level: AttributionSummaryView["levels"][number];
}) {
  const totals = getAttributionTotals(level);

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
          { key: "total", label: "Total Effect", align: "right" },
        ]}
        rows={[
          {
            key: `${level.dimension}-summary`,
            cells: [
              "Summary Total",
              formatPct(level.allocation_total_pct ?? totals.allocationPct ?? null),
              formatPct(level.selection_total_pct ?? totals.selectionPct ?? null),
              formatPct(level.interaction_total_pct ?? totals.interactionPct ?? null),
              formatPct(totals.totalEffectPct ?? level.total_effect_pct),
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
  const totals = getAttributionTotals(level);
  const activeWeightTotal =
    totals.portfolioWeightAvgPct !== null && totals.benchmarkWeightAvgPct !== null
      ? totals.portfolioWeightAvgPct - totals.benchmarkWeightAvgPct
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
          { key: "portWt", label: "Portfolio Weight", align: "right" },
          { key: "bmkWt", label: "Benchmark Weight", align: "right" },
          { key: "activeWt", label: "Active Weight", align: "right" },
          { key: "portRet", label: "Portfolio Return", align: "right" },
          { key: "bmkRet", label: "Benchmark Return", align: "right" },
          { key: "activeRet", label: "Active Return", align: "right" },
          { key: "allocation", label: "Allocation", align: "right" },
          { key: "selection", label: "Selection", align: "right" },
          { key: "interaction", label: "Interaction", align: "right" },
          { key: "total", label: "Total Effect", align: "right" },
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
          formatPct(totals.portfolioWeightAvgPct),
          formatPct(totals.benchmarkWeightAvgPct),
          formatPct(activeWeightTotal),
          NOT_ADDITIVE_CELL,
          NOT_ADDITIVE_CELL,
          NOT_ADDITIVE_CELL,
          formatPct(level.allocation_total_pct ?? totals.allocationPct ?? null),
          formatPct(level.selection_total_pct ?? totals.selectionPct ?? null),
          formatPct(level.interaction_total_pct ?? totals.interactionPct ?? null),
          formatPct(totals.totalEffectPct ?? level.total_effect_pct),
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
