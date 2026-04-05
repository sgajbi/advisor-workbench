"use client";

import { ScreenStatePanel, WorkbenchChartShell } from "@/design-system";
import type { AttributionRowView } from "@/features/workbench/types";

import { formatCompactPct, formatLabel, formatPct } from "../formatters";

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
        title="Relative Segment Context"
        subtitle="Portfolio and benchmark weights and returns by selected segment."
        className="performance-analysis-mini-module performance-relative-segment-module"
      >
        <ScreenStatePanel
          kind="unavailable"
          title="Relative segment context unavailable"
          body="Segment-level relative weight and return context is not available for this selection."
          surface="analysis"
        />
      </WorkbenchChartShell>
    );
  }

  const weightScale = Math.max(0.01, ...rows.map((row) => Math.abs(row.active_weight_pct)));
  const returnScale = Math.max(0.01, ...rows.map((row) => Math.abs(row.active_return_pct)));

  return (
    <WorkbenchChartShell
      title="Relative Segment Context"
      subtitle="Portfolio and benchmark weights and returns by selected segment."
      className="performance-analysis-mini-module performance-relative-segment-module"
    >
      <div className="performance-relative-matrix">
        {rows.map((row) => (
          <div key={`relative-segment-${row.key_label}`} className="performance-relative-row">
            <div className="performance-relative-meta">
              <strong>{formatLabel(row.key_label)}</strong>
              <span>
                Portfolio Weight {formatPct(row.portfolio_weight_avg_pct)} • Benchmark Weight{" "}
                {formatPct(row.benchmark_weight_avg_pct)}
              </span>
              <span>
                Portfolio Return {formatPct(row.portfolio_return_pct)} • Benchmark Return{" "}
                {formatPct(row.benchmark_return_pct)}
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
                Allocation {formatCompactPct(row.allocation_pct)} • Selection{" "}
                {formatCompactPct(row.selection_pct)}
              </span>
            </div>
          </div>
        ))}
      </div>
    </WorkbenchChartShell>
  );
}
