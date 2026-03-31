"use client";

import Button from "@mui/material/Button";

import { AnalyticsModule, MetricRow } from "@/design-system";
import type { WorkspaceCapability } from "@/shell/workspace-capabilities";

import { formatDate, formatPct } from "../formatters";
import type { PortfolioWorkspaceContext, PortfolioTimeWindow } from "../view-model";
import type { PortfolioWorkspace } from "../types";
import PortfolioModuleState from "./portfolio-module-state";
import PortfolioPerformanceSparkline from "./portfolio-performance-sparkline";

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
  const benchmarkLabel =
    performance?.benchmark_label ?? formatPortfolioToken(performance?.benchmark_code);
  const resolvedWindow =
    performance?.report_start_date && performance?.report_end_date
      ? `${formatDate(performance.report_start_date)} - ${formatDate(performance.report_end_date)}`
      : `${formatDate(context.effectivePeriodStartDate)} - ${formatDate(context.effectivePeriodEndDate)}`;
  const benchmarkProvenance = getBenchmarkProvenance(performance);
  const trendValue =
    performance?.sparkline_points?.length
      ? `${performance.sparkline_points.length} source-backed observations`
      : "Open Performance workspace for source-backed return path detail.";

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
            <MetricRow label="Resolved Window" value={resolvedWindow} />
            <MetricRow label="Portfolio Return" value={formatPct(performance?.return_pct)} />
            <MetricRow
              label="Benchmark Return"
              value={formatPct(performance?.benchmark_return_pct)}
            />
            <MetricRow
              label="Active Return"
              value={formatPct(performance?.excess_return_pct)}
            />
            <MetricRow
              label="Money-Weighted Return"
              value={formatPct(performance?.money_weighted_return_pct)}
            />
            <MetricRow label="Benchmark" value={benchmarkLabel ?? "Unassigned"} />
            <MetricRow label="Benchmark Provenance" value={benchmarkProvenance} />
            <MetricRow
              label="Method"
              value={performance?.money_weighted_method ? `MWR ${performance.money_weighted_method}` : "Unavailable"}
            />
            <MetricRow label="Trend" value={trendValue} />
            {performance?.sparkline_points?.length ? (
              <PortfolioPerformanceSparkline
                points={performance.sparkline_points}
                benchmarkLabel={benchmarkLabel}
              />
            ) : null}
            <MetricRow label="Reporting Rows" value={reportingRowCount} />
            <MetricRow label="Rebalance Status" value={rebalance?.status ?? "N/A"} />
          </div>
        ) : (
          <PortfolioModuleState
            variant="capability"
            capability={capability}
            partialTitle="Performance not available yet"
            unavailableTitle="Performance not available yet"
            body={
              capability.reason ??
              "Performance analytics are not available for this portfolio context."
            }
            partialHint="Enable valuation history, cashflow history, and a selected reporting period to activate this view."
            unavailableHint="Enable valuation history, cashflow history, and a selected reporting period to activate this view."
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
                {performance?.benchmark_return_pct != null && performance?.excess_return_pct != null
                  ? `Active ${formatPct(performance.excess_return_pct)} versus ${benchmarkLabel ?? "assigned benchmark"} for ${performance?.period ?? selectedPeriod}`
                  : `Portfolio return for ${performance?.period ?? selectedPeriod}`}
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

function getBenchmarkProvenance(performance: PortfolioWorkspace["performance"]) {
  if (!performance?.benchmark_code) {
    return "Unassigned";
  }

  const segments = [
    performance.benchmark_return_source
      ? formatPortfolioToken(performance.benchmark_return_source)
      : null,
    performance.benchmark_input_mode
      ? `${formatPortfolioToken(performance.benchmark_input_mode)} benchmark`
      : null,
  ].filter(Boolean);

  return segments.length > 0 ? segments.join(" • ") : "Assigned benchmark";
}

function formatPortfolioToken(value?: string | null) {
  if (!value) {
    return null;
  }

  return value
    .split(/[_\s-]+/)
    .filter(Boolean)
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1).toLowerCase())
    .join(" ");
}
