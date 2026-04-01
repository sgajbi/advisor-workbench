"use client";

import { WorkbenchChartShell } from "@/design-system";
import type { AttributionRowView } from "@/features/workbench/types";

import { formatCompactPct, formatLabel, formatPct } from "../formatters";
import PerformanceAnalysisStatePanel from "./performance-analysis-state-panel";

type RelativeSegmentRow = AttributionRowView & {
  active_weight_pct: number;
  active_return_pct: number;
};

export default function PerformanceRelativeSegmentPanel({
  rows,
}: {
  rows: RelativeSegmentRow[];
}) {
  if (!rows.length) {
    return (
      <WorkbenchChartShell
        title="Relative Segment Matrix"
        subtitle="Portfolio versus benchmark by selected segment"
        className="performance-analysis-mini-module performance-relative-segment-module"
      >
        <PerformanceAnalysisStatePanel
          state="unavailable"
          title="Relative segment context unavailable"
          body="Segment-level relative weight and return context is not available for this selection."
        />
      </WorkbenchChartShell>
    );
  }

  const weightScale = Math.max(0.01, ...rows.map((row) => Math.abs(row.active_weight_pct)));
  const returnScale = Math.max(0.01, ...rows.map((row) => Math.abs(row.active_return_pct)));

  return (
    <WorkbenchChartShell
      title="Relative Segment Matrix"
      subtitle="Portfolio versus benchmark by selected segment"
      className="performance-analysis-mini-module performance-relative-segment-module"
    >
      <div className="performance-relative-matrix">
        {rows.map((row) => (
          <div key={`relative-segment-${row.key_label}`} className="performance-relative-row">
            <div className="performance-relative-meta">
              <strong>{formatLabel(row.key_label)}</strong>
              <span>
                Wt {formatPct(row.portfolio_weight_avg_pct)} vs {formatPct(row.benchmark_weight_avg_pct)}
              </span>
              <span>
                Ret {formatPct(row.portfolio_return_pct)} vs {formatPct(row.benchmark_return_pct)}
              </span>
            </div>

            <div className="performance-relative-metric">
              <label>Active Weight</label>
              <div className="performance-comparative-bar-track">
                <div className="performance-comparative-bar-axis" />
                <div
                  className={`performance-comparative-bar ${
                    row.active_weight_pct >= 0
                      ? "performance-comparative-bar-positive"
                      : "performance-comparative-bar-negative"
                  }`}
                  style={{
                    width: `${(Math.abs(row.active_weight_pct) / weightScale) * 50}%`,
                    marginLeft:
                      row.active_weight_pct >= 0
                        ? "50%"
                        : `${50 - (Math.abs(row.active_weight_pct) / weightScale) * 50}%`,
                  }}
                />
              </div>
              <strong>{formatPct(row.active_weight_pct)}</strong>
            </div>

            <div className="performance-relative-metric">
              <label>Active Return</label>
              <div className="performance-comparative-bar-track">
                <div className="performance-comparative-bar-axis" />
                <div
                  className={`performance-comparative-bar ${
                    row.active_return_pct >= 0
                      ? "performance-comparative-bar-positive"
                      : "performance-comparative-bar-negative"
                  }`}
                  style={{
                    width: `${(Math.abs(row.active_return_pct) / returnScale) * 50}%`,
                    marginLeft:
                      row.active_return_pct >= 0
                        ? "50%"
                        : `${50 - (Math.abs(row.active_return_pct) / returnScale) * 50}%`,
                  }}
                />
              </div>
              <strong>{formatPct(row.active_return_pct)}</strong>
            </div>

            <div className="performance-relative-effect">
              <label>Total Effect</label>
              <strong>{formatPct(row.total_effect_pct)}</strong>
              <span>
                Alloc {formatCompactPct(row.allocation_pct)} / Select{" "}
                {formatCompactPct(row.selection_pct)}
              </span>
            </div>
          </div>
        ))}
      </div>
    </WorkbenchChartShell>
  );
}
