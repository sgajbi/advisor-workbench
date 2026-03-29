"use client";

import Button from "@mui/material/Button";

import { AnalyticsModule, MetricRow, ModuleStatePanel } from "@/design-system";
import type { WorkspaceCapability } from "@/shell/workspace-capabilities";

import { formatDate, formatPct } from "../formatters";
import type { PortfolioWorkspaceContext, PortfolioTimeWindow } from "../view-model";
import type { PortfolioWorkspace } from "../types";

type PerformanceSnapshotProps = {
  capability: WorkspaceCapability;
  performance: PortfolioWorkspace["performance"];
  rebalance: PortfolioWorkspace["rebalance"];
  reportingRowCount: number;
  context: PortfolioWorkspaceContext;
  expanded: boolean;
  onToggle: () => void;
  selectedPeriod: PortfolioTimeWindow;
};

/**
 * Portfolio insights performance module.
 * Uses the current lightweight portfolio performance contract when available,
 * while reserving API shape for future benchmark/excess/sparkline support.
 */
export default function PortfolioPerformanceSnapshotModule({
  capability,
  performance,
  rebalance,
  reportingRowCount,
  context,
  expanded,
  onToggle,
  selectedPeriod,
}: PerformanceSnapshotProps) {
  const hasPerformance = capability.state === "supported" && Boolean(performance);
  const compact = context.viewMode === "summary";

  return (
    <AnalyticsModule
      className="portfolio-summary-module-card workbench-summary-module-card portfolio-performance-summary-card"
      compact={compact}
      title="Performance Snapshot"
      subtitle={`Selected period ${selectedPeriod} as of ${formatDate(
        context.selectedAsOfDate
      )}.`}
      actions={
        <Button size="small" variant="text" onClick={onToggle}>
          {expanded ? "Collapse" : "Expand"}
        </Button>
      }
    >
      {expanded ? (
        hasPerformance ? (
          <div className="portfolio-mandate-grid">
            <MetricRow label="Period" value={performance?.period ?? selectedPeriod} />
            <MetricRow label="Portfolio Return" value={formatPct(performance?.return_pct)} />
            <MetricRow
              label="Benchmark Return"
              value={formatPct(performance?.benchmark_return_pct)}
            />
            <MetricRow
              label="Excess Return"
              value={formatPct(performance?.excess_return_pct)}
            />
            <MetricRow label="Reporting Rows" value={reportingRowCount} />
            <MetricRow label="Rebalance Status" value={rebalance?.status ?? "N/A"} />
            <MetricRow label="Sparkline" value="Pending source-backed series" />
            <MetricRow label="Period Selector" value="Uses page period context" />
          </div>
        ) : (
          <ModuleStatePanel
            state={capability.state === "partial" ? "partial" : "empty"}
            title="Performance not available yet"
            body={
              capability.reason ??
              "Performance analytics are not available for this portfolio context."
            }
            hint="Enable valuation history, cashflow history, and a selected reporting period to activate this view."
            why={{
              body:
                "Performance requires valuation history, cashflow history, and a selected reporting period so returns can be calculated on a time-aware basis.",
              label: "Why performance is unavailable",
            }}
          />
        )
      ) : (
        <div className="portfolio-performance-snapshot-collapsed">
          {hasPerformance ? (
            <>
              <span className="portfolio-performance-snapshot-kpi">
                {formatPct(performance?.return_pct)}
              </span>
              <span className="portfolio-performance-snapshot-copy">
                Portfolio return for {selectedPeriod}
              </span>
            </>
          ) : (
            <>
              <span className="portfolio-performance-snapshot-kpi">Unavailable</span>
              <span className="portfolio-performance-snapshot-copy">
                {capability.reason ??
                  "Requires valuation history, cashflow history, and a selected reporting period."}
              </span>
            </>
          )}
        </div>
      )}
    </AnalyticsModule>
  );
}
