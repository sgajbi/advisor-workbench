import { AnalyticsEffectStrip, AnalyticsTable } from "@/design-system";
import type { AttributionSummaryView } from "@/features/workbench/types";

import { formatLabel, formatPct } from "../formatters";
import { getAttributionTotals, NOT_ADDITIVE_CELL } from "./performance-workspace-view-helpers";
import PerformanceAnalysisEffectLegend from "./performance-analysis-effect-legend";

type PerformanceAnalysisAttributionBreakdownProps = {
  levels: AttributionSummaryView["levels"];
};

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
      <div className="performance-analysis-summary-fallback-copy">
        <strong>Attribution Summary</strong>
        <span>
          Segment rows are unavailable for this selection. Total benchmark-relative effects remain
          available below.
        </span>
      </div>
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

  return (
    <div
      key={`${level.dimension}-${level.total_effect_pct}`}
      className="performance-analysis-detail-stack"
    >
      <AnalyticsEffectStrip
        rows={level.rows.map((row) => ({
          key: `effect-${level.dimension}-${row.key_label}`,
          label: row.key_label,
          allocationPct: row.allocation_pct,
          selectionPct: row.selection_pct,
          interactionPct: row.interaction_pct,
          totalPct: formatPct(row.total_effect_pct),
        }))}
      />
      <AnalyticsTable
        className="performance-analysis-table"
        density="compact"
        variant="analysis"
        ariaLabel={`${formatLabel(level.dimension)} attribution table`}
        columns={[
          { key: "bucket", label: "Segment" },
          { key: "portWt", label: "Portfolio Weight", align: "right" },
          { key: "bmkWt", label: "Benchmark Weight", align: "right" },
          { key: "portRet", label: "Portfolio Return", align: "right" },
          { key: "bmkRet", label: "Benchmark Return", align: "right" },
          { key: "allocation", label: "Allocation", align: "right" },
          { key: "selection", label: "Selection", align: "right" },
          { key: "interaction", label: "Interaction", align: "right" },
          { key: "total", label: "Total Effect", align: "right" },
        ]}
        rows={level.rows.map((row) => ({
          key: `${level.dimension}-${row.key_label}`,
          cells: [
            row.key_label,
            formatPct(row.portfolio_weight_avg_pct),
            formatPct(row.benchmark_weight_avg_pct),
            formatPct(row.portfolio_return_pct),
            formatPct(row.benchmark_return_pct),
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
  levels,
}: PerformanceAnalysisAttributionBreakdownProps) {
  const hasDetailedRows = levels.some((level) => level.rows.length > 0);

  return (
    <div className="performance-analysis-detail-stack">
      {hasDetailedRows ? <PerformanceAnalysisEffectLegend /> : null}
      {levels.map((level) =>
        level.rows.length > 0 ? (
          <PerformanceAttributionLevelTable key={level.dimension} level={level} />
        ) : (
          <PerformanceAttributionSummaryFallback key={level.dimension} level={level} />
        )
      )}
    </div>
  );
}
