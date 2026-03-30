import { FormControl, MenuItem, Select, Typography } from "@mui/material";

import {
  AnalyticsEffectStrip,
  AnalyticsTable,
  WorkbenchChartShell,
  WorkbenchRankedBarList,
  WorkbenchSummaryMetricStrip,
} from "@/design-system";

import { formatLabel, formatPct } from "../formatters";
import { ATTRIBUTION_DIMENSION_OPTIONS } from "../navigation";
import PerformanceAnalysisLevelSection from "./performance-analysis-level-section";
import PerformanceAnalysisModuleState from "./performance-analysis-module-state";
import PerformanceAnalysisToolbar from "./performance-analysis-toolbar";
import { getAttributionRankingRows } from "./performance-analysis-view-helpers";
import PerformanceRelativeSegmentPanel from "./performance-relative-segment-panel";
import type { PerformanceAnalysisAttributionSectionProps } from "./performance-workspace-types";
import {
  getAttributionTotals,
  inlineControlLabelSx,
  NOT_ADDITIVE_CELL,
} from "./performance-workspace-view-helpers";
import PerformanceAnalysisEffectLegend from "./performance-analysis-effect-legend";
import { isCapabilityOptionSupported } from "./performance-capability-options";

export default function PerformanceAnalysisAttributionSection({
  workspace,
  attributionDimension,
  onRequestChange,
  isUpdating,
  isDetailsPending,
  capabilities,
  relativeSegmentRows,
  topAttributionEffectRows,
  attributionEffectScale,
}: PerformanceAnalysisAttributionSectionProps) {
  const hasAttributionSummaryLevels = (workspace.attribution?.levels?.length ?? 0) > 0;
  const hasDetailedAttributionRows =
    workspace.attribution?.levels?.some((level) => level.rows.length > 0) ?? false;
  const showDetailedBreakdownChrome =
    relativeSegmentRows.length > 0 || topAttributionEffectRows.length > 0 || hasDetailedAttributionRows;
  const disableAttributionSegmentControl =
    isUpdating ||
    (capabilities.attributionDetail.state === "partial" &&
      hasAttributionSummaryLevels &&
      !hasDetailedAttributionRows);
  const actions = (
    <PerformanceAnalysisToolbar
      context={
        workspace.attribution?.benchmark_id ? (
          <span className="performance-section-benchmark">
            Versus {formatLabel(workspace.attribution.benchmark_id)}
          </span>
        ) : undefined
      }
    >
      <FormControl size="small" sx={{ minWidth: 180 }}>
        <Typography component="label" sx={inlineControlLabelSx}>
          Segment
        </Typography>
        <Select
          aria-label="Attribution Segment"
          value={attributionDimension}
          onChange={(event) =>
            onRequestChange?.({
              attributionDimension: event.target.value,
            })
          }
          disabled={disableAttributionSegmentControl}
        >
          {ATTRIBUTION_DIMENSION_OPTIONS.map((option) => (
            <MenuItem
              key={option}
              value={option}
              disabled={
                !isCapabilityOptionSupported(capabilities.attributionDetail, "dimension", option)
              }
            >
              {formatLabel(option)}
            </MenuItem>
          ))}
        </Select>
      </FormControl>
    </PerformanceAnalysisToolbar>
  );

  const metricItems = workspace.attribution?.benchmark_id
    ? [
        {
          label: "Benchmark",
          value: formatLabel(workspace.attribution.benchmark_id),
        },
        {
          label: "Active Return",
          value: formatPct(workspace.attribution.active_return_pct),
        },
        {
          label: "Effects Sum",
          value: formatPct(workspace.attribution.sum_of_effects_pct),
        },
        {
          label: "Residual",
          value: formatPct(workspace.attribution.residual_pct),
        },
      ]
    : [];

  return (
    <WorkbenchChartShell
      id="performance-attribution"
      title="Attribution Detail"
      subtitle="Benchmark-relative decomposition across allocation, selection, and interaction effects."
      actions={actions}
      metricStrip={
        metricItems.length ? (
          <WorkbenchSummaryMetricStrip
            className="performance-analysis-metric-strip"
            ariaLabel="Attribution summary strip"
            items={metricItems}
          />
        ) : undefined
      }
      className="performance-detail-panel-compact performance-analysis-module"
    >
      <PerformanceAnalysisModuleState
        capability={capabilities.attributionDetail}
        isDetailsPending={isDetailsPending}
        loadingText="Loading attribution effects and benchmark-relative decomposition."
        partialTitle="Attribution detail is partial"
        unavailableTitle="Attribution detail unavailable"
        body={
          capabilities.attributionDetail.reason ??
          "Attribution detail is not available for the current selection."
        }
        hint={
          hasAttributionSummaryLevels
            ? "Summary-level attribution remains available even when segment rows are absent."
            : "Benchmark-relative attribution requires a comparable benchmark and source-backed attribution levels."
        }
        allowPartialContent={hasAttributionSummaryLevels}
      >
        {showDetailedBreakdownChrome ? (
          <>
            <div className="performance-analytic-duo-grid">
              <PerformanceRelativeSegmentPanel rows={relativeSegmentRows} />

              <WorkbenchChartShell
                title="Total Effect Ranking"
                subtitle="Largest benchmark-relative effects"
                className="performance-analysis-mini-module"
              >
                <WorkbenchRankedBarList
                  label="Benchmark-relative total effect"
                  rows={getAttributionRankingRows(topAttributionEffectRows)}
                  scale={attributionEffectScale}
                  emptyMessage="No benchmark-relative effect ranking is available for this selection."
                />
              </WorkbenchChartShell>
            </div>
            <PerformanceAnalysisEffectLegend />
          </>
        ) : null}
        {workspace.attribution?.levels.map((level) => {
          const totals = getAttributionTotals(level);
          return (
            <PerformanceAnalysisLevelSection
              key={`${level.dimension}-${level.total_effect_pct}`}
              title={formatLabel(level.dimension)}
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
                dense
                ariaLabel={`${formatLabel(level.dimension)} attribution table`}
                columns={[
                  { key: "bucket", label: "Bucket" },
                  { key: "portWt", label: "Port Wt", align: "right" },
                  { key: "bmkWt", label: "Bmk Wt", align: "right" },
                  { key: "portRet", label: "Port Return", align: "right" },
                  { key: "bmkRet", label: "Bmk Return", align: "right" },
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
            </PerformanceAnalysisLevelSection>
          );
        })}
      </PerformanceAnalysisModuleState>
    </WorkbenchChartShell>
  );
}
