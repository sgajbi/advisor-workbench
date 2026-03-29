import { FormControl, MenuItem, Select, Typography } from "@mui/material";

import {
  AnalyticsEffectStrip,
  AnalyticsModule,
  AnalyticsTable,
  Panel,
} from "@/design-system";

import { formatCompactPct, formatLabel, formatPct } from "../formatters";
import { ATTRIBUTION_DIMENSION_OPTIONS } from "../navigation";
import PerformanceRelativeSegmentPanel from "./performance-relative-segment-panel";
import type { PerformanceAnalysisAttributionSectionProps } from "./performance-workspace-types";
import {
  getAttributionTotals,
  inlineControlLabelSx,
  NOT_ADDITIVE_CELL,
} from "./performance-workspace-view-helpers";

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
  const hasAttribution = capabilities.attributionDetail.state === "supported";

  return (
    <Panel id="performance-attribution" className="performance-detail-panel-compact">
      <div className="performance-section-heading">
        <h3>Attribution Detail</h3>
        <div className="performance-section-heading-meta">
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
              disabled={isUpdating}
            >
              {ATTRIBUTION_DIMENSION_OPTIONS.map((option) => (
                <MenuItem key={option} value={option}>
                  {formatLabel(option)}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          {workspace.attribution?.benchmark_id ? (
            <span className="performance-section-benchmark">
              Versus {formatLabel(workspace.attribution.benchmark_id)}
            </span>
          ) : null}
        </div>
      </div>
      {workspace.attribution?.benchmark_id ? (
        <div className="performance-attribution-summary-strip">
          <div>
            <span>Benchmark</span>
            <strong>{formatLabel(workspace.attribution.benchmark_id)}</strong>
          </div>
          <div>
            <span>Active Return</span>
            <strong>{formatPct(workspace.attribution.active_return_pct)}</strong>
          </div>
          <div>
            <span>Effects Sum</span>
            <strong>{formatPct(workspace.attribution.sum_of_effects_pct)}</strong>
          </div>
          <div>
            <span>Residual</span>
            <strong>{formatPct(workspace.attribution.residual_pct)}</strong>
          </div>
        </div>
      ) : null}
      {hasAttribution ? (
        <div className="performance-analytic-duo-grid">
          <PerformanceRelativeSegmentPanel rows={relativeSegmentRows} />

          <AnalyticsModule title="Total Effect Ranking" subtitle="Largest benchmark-relative effects">
            <div className="performance-comparative-list">
              {topAttributionEffectRows.map((row) => (
                <div
                  key={`effect-ranking-${row.key_label}`}
                  className="performance-comparative-row"
                >
                  <div className="performance-comparative-meta">
                    <strong>{formatLabel(row.key_label)}</strong>
                    <span>
                      Alloc {formatCompactPct(row.allocation_pct)} / Select{" "}
                      {formatCompactPct(row.selection_pct)}
                    </span>
                  </div>
                  <div className="performance-comparative-bar-track">
                    <div className="performance-comparative-bar-axis" />
                    <div
                      className={`performance-comparative-bar ${
                        row.total_effect_pct >= 0
                          ? "performance-comparative-bar-positive"
                          : "performance-comparative-bar-negative"
                      }`}
                      style={{
                        width: `${(Math.abs(row.total_effect_pct) / attributionEffectScale) * 50}%`,
                        marginLeft:
                          row.total_effect_pct >= 0
                            ? "50%"
                            : `${50 - (Math.abs(row.total_effect_pct) / attributionEffectScale) * 50}%`,
                      }}
                    />
                  </div>
                  <div className="performance-comparative-value">
                    {formatPct(row.total_effect_pct)}
                  </div>
                </div>
              ))}
            </div>
          </AnalyticsModule>
        </div>
      ) : null}
      <div className="performance-effect-legend" aria-label="Attribution effect legend">
        <span className="performance-effect-legend-item">
          <i className="performance-effect-legend-swatch performance-effect-bar-allocation" />
          Allocation
        </span>
        <span className="performance-effect-legend-item">
          <i className="performance-effect-legend-swatch performance-effect-bar-selection" />
          Selection
        </span>
        <span className="performance-effect-legend-item">
          <i className="performance-effect-legend-swatch performance-effect-bar-interaction" />
          Interaction
        </span>
      </div>
      {hasAttribution ? (
        workspace.attribution?.levels.map((level) => {
          const totals = getAttributionTotals(level);
          return (
            <div key={`${level.dimension}-${level.total_effect_pct}`} className="performance-detail-block">
              <div className="performance-level-heading">
                <strong>{formatLabel(level.dimension)}</strong>
              </div>
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
            </div>
          );
        })
      ) : isDetailsPending ? (
        <p className="muted">Loading attribution effects and benchmark-relative decomposition.</p>
      ) : (
        <p className="muted">
          {capabilities.attributionDetail.reason ??
            "Attribution detail is not available for the current selection."}
        </p>
      )}
    </Panel>
  );
}
