import { useState } from "react";

import { FormControl, MenuItem, Select, Typography } from "@mui/material";

import {
  AnalyticsEffectStrip,
  AnalyticsTable,
  WorkbenchChartContextRow,
  WorkbenchChartShell,
  WorkbenchSummaryMetricStrip,
} from "@/design-system";

import { formatLabel, formatPct } from "../formatters";
import { ATTRIBUTION_DIMENSION_OPTIONS } from "../navigation";
import PerformanceAnalysisDetailPane from "./performance-analysis-detail-pane";
import { getAttributionDetailOptions } from "./performance-analysis-detail-options";
import PerformanceAnalysisModuleState from "./performance-analysis-module-state";
import PerformanceAnalysisToolbar from "./performance-analysis-toolbar";
import PerformanceRelativeSegmentPanel from "./performance-relative-segment-panel";
import type { PerformanceAnalysisAttributionSectionProps } from "./performance-workspace-types";
import {
  getAttributionTotals,
  inlineControlLabelSx,
  NOT_ADDITIVE_CELL,
} from "./performance-workspace-view-helpers";
import PerformanceAnalysisEffectLegend from "./performance-analysis-effect-legend";
import { isCapabilityOptionSupported } from "./performance-capability-options";
import {
  getAttributionDetailContextItems,
  getAttributionDetailSummaryItems,
} from "./performance-attribution-presentations";

type AttributionDetailView = "relative" | "breakdown";

export default function PerformanceAnalysisAttributionSection({
  workspace,
  attributionDimension,
  onRequestChange,
  isUpdating,
  isDetailsPending,
  capabilities,
  relativeSegmentRows,
}: PerformanceAnalysisAttributionSectionProps) {
  const hasAttributionSummaryLevels = (workspace.attribution?.levels?.length ?? 0) > 0;
  const hasDetailedAttributionRows =
    workspace.attribution?.levels?.some((level) => level.rows.length > 0) ?? false;
  const hasRelativeSegmentRows = relativeSegmentRows.length > 0;
  const [detailView, setDetailView] = useState<AttributionDetailView>(
    hasRelativeSegmentRows ? "relative" : "breakdown"
  );
  const disableAttributionSegmentControl =
    isUpdating ||
    (capabilities.attributionDetail.state === "partial" &&
      hasAttributionSummaryLevels &&
      !hasDetailedAttributionRows);
  const attributionContextItems = workspace.attribution
    ? getAttributionDetailContextItems(workspace.attribution, workspace.benchmark_options ?? [])
    : [];
  const attributionSummaryItems = getAttributionDetailSummaryItems(
    workspace.attribution,
    workspace.benchmark_options ?? []
  );
  const actions = (
    <PerformanceAnalysisToolbar>
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

  return (
    <WorkbenchChartShell
      id="performance-attribution"
      title="Attribution Detail"
      subtitle="Benchmark-relative allocation, selection, and interaction effects by segment."
      actions={actions}
      contextRow={
        workspace.attribution ? (
          <WorkbenchChartContextRow
            label="Attribution detail context"
            className="performance-analysis-context-row"
            items={attributionContextItems}
          />
        ) : undefined
      }
      metricStrip={
        attributionSummaryItems.length ? (
          <WorkbenchSummaryMetricStrip
            className="performance-analysis-metric-strip"
            ariaLabel="Attribution summary strip"
            items={attributionSummaryItems}
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
        {workspace.attribution ? (
          <PerformanceAnalysisDetailPane
            title="Segment Attribution"
            subtitle="Benchmark-relative segment context and Brinson effect breakdown."
            value={detailView}
            onChange={setDetailView}
            options={getAttributionDetailOptions({
              hasSummaryOnlyBreakdown: hasAttributionSummaryLevels && !hasDetailedAttributionRows,
            })}
          >
            {detailView === "relative" ? (
              <PerformanceRelativeSegmentPanel rows={relativeSegmentRows} />
            ) : (
              <div className="performance-analysis-detail-stack">
                {hasDetailedAttributionRows ? <PerformanceAnalysisEffectLegend /> : null}
                {workspace.attribution.levels.map((level) => {
                  const totals = getAttributionTotals(level);
                  const hasDetailRows = level.rows.length > 0;
                  return hasDetailRows ? (
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
                  ) : (
                    <div
                      key={`${level.dimension}-${level.total_effect_pct}`}
                      className="performance-analysis-summary-fallback"
                    >
                      <div className="performance-analysis-summary-fallback-copy">
                        <strong>Attribution Summary</strong>
                        <span>
                          Segment rows are unavailable for this selection. Total benchmark-relative
                          effects remain available below.
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
                })}
              </div>
            )}
          </PerformanceAnalysisDetailPane>
        ) : null}
      </PerformanceAnalysisModuleState>
    </WorkbenchChartShell>
  );
}
