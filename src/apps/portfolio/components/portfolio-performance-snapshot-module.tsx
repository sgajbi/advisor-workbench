"use client";

import {
  ActionLink,
  AnalyticsModule,
  DisclosureToggleButton,
  MetricRow,
} from "@/design-system";
import type { WorkspaceCapability } from "@/shell/workspace-capabilities";

import { buildPerformanceHref } from "@/apps/performance/navigation";
import { formatDate, formatPct } from "../formatters";
import type { PortfolioWorkspaceContext, PortfolioTimeWindow } from "../view-model";
import type { PortfolioWorkspace } from "../types";
import PortfolioMetricSummaryStrip from "./portfolio-metric-summary-strip";
import PortfolioModuleState from "./portfolio-module-state";
import PortfolioPerformanceSparkline from "./portfolio-performance-sparkline";

type PerformanceSnapshotProps = {
  capability: WorkspaceCapability;
  performance: PortfolioWorkspace["performance"];
  rebalance: PortfolioWorkspace["rebalance"];
  reportingRowCount: number;
  context: PortfolioWorkspaceContext;
  portfolioId: string;
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
  portfolioId,
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
  const operationalSupport = getOperationalSupportLine(reportingRowCount, rebalance?.status ?? null);
  const performanceWorkspaceHref = buildPerformanceWorkspaceHref({
    portfolioId,
    selectedPeriod,
    context,
    benchmarkCode: performance?.benchmark_code ?? null,
  });

  return (
    <AnalyticsModule
      className="portfolio-summary-module-card workbench-summary-module-card portfolio-performance-summary-card"
      compact={compact}
      title="Performance Snapshot"
      subtitle={`Selected period ${selectedPeriod} as of ${formatDate(
        context.selectedAsOfDate
      )}.`}
      actions={
        <>
          <ActionLink href={performanceWorkspaceHref}>Open Performance</ActionLink>
          <DisclosureToggleButton expanded={expanded} onToggle={onToggle} />
        </>
      }
    >
      {expanded ? (
        hasPerformance ? (
          <div className="portfolio-summary-pair-panel portfolio-performance-snapshot-panel">
            <PortfolioMetricSummaryStrip
              ariaLabel="Performance snapshot metrics"
              items={[
                { label: "Portfolio Return", value: formatPct(performance?.return_pct) },
                { label: "Benchmark Return", value: formatPct(performance?.benchmark_return_pct) },
                { label: "Active Return", value: formatPct(performance?.excess_return_pct) },
                {
                  label: "Money-Weighted Return",
                  value: formatPct(performance?.money_weighted_return_pct),
                },
              ]}
            />
            <div className="portfolio-summary-pair-body">
              <div className="portfolio-performance-snapshot-trend">
                <div className="portfolio-summary-pair-region-heading">
                  <span>Trend</span>
                  <strong>{trendValue}</strong>
                </div>
                {performance?.sparkline_points?.length ? (
                  <PortfolioPerformanceSparkline
                    points={performance.sparkline_points}
                    benchmarkLabel={benchmarkLabel}
                  />
                ) : (
                  <p className="portfolio-performance-snapshot-copy">
                    Open Performance workspace for source-backed return path detail.
                  </p>
                )}
              </div>
              <div className="portfolio-performance-snapshot-context">
                <div className="portfolio-summary-pair-region-heading">
                  <span>Context</span>
                  <strong>{performance?.period ?? selectedPeriod}</strong>
                </div>
                <div className="portfolio-summary-pair-context-grid">
                  <MetricRow label="Resolved Window" value={resolvedWindow} />
                  <MetricRow label="Benchmark" value={benchmarkLabel ?? "Unassigned"} />
                  <MetricRow label="Benchmark Provenance" value={benchmarkProvenance} />
                  <MetricRow
                    label="Method"
                    value={
                      performance?.money_weighted_method
                        ? `MWR ${performance.money_weighted_method}`
                        : "Unavailable"
                    }
                  />
                </div>
                <p className="portfolio-summary-pair-support">{operationalSupport}</p>
              </div>
            </div>
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
                {buildCollapsedSnapshotCopy({
                  performance,
                  selectedPeriod,
                  benchmarkLabel,
                })}
              </span>
            </>
          ) : (
            <>
              <span className="portfolio-performance-snapshot-kpi">Unavailable</span>
              <span className="portfolio-performance-snapshot-copy">
                {buildCollapsedUnavailableCopy(capability.reason)}
              </span>
              <span className="portfolio-performance-snapshot-support">
                {buildCollapsedUnavailableSupport({
                  selectedPeriod,
                  context,
                })}
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

function buildPerformanceWorkspaceHref({
  portfolioId,
  selectedPeriod,
  context,
  benchmarkCode,
}: {
  portfolioId: string;
  selectedPeriod: PortfolioTimeWindow;
  context: PortfolioWorkspaceContext;
  benchmarkCode?: string | null;
}) {
  const useExplicitWindow =
    context.usesCustomDateRange || selectedPeriod === "7D" || selectedPeriod === "30D";

  return buildPerformanceHref({
    portfolioId,
    period: useExplicitWindow ? "EXPLICIT" : selectedPeriod,
    detailBasis: "NET",
    contributionDimension: "asset_class",
    attributionDimension: "asset_class",
    chartFrequency: "monthly",
    benchmark: benchmarkCode ?? undefined,
    reportStartDate: useExplicitWindow ? context.effectivePeriodStartDate : undefined,
    reportEndDate: useExplicitWindow ? context.effectivePeriodEndDate : undefined,
  });
}

function getOperationalSupportLine(
  reportingRowCount: number,
  rebalanceStatus: string | null
) {
  const parts = [`${reportingRowCount} report row${reportingRowCount === 1 ? "" : "s"}`];

  if (rebalanceStatus) {
    parts.push(`Rebalance ${formatPortfolioToken(rebalanceStatus)}`);
  }

  return parts.join(" • ");
}

function buildCollapsedSnapshotCopy({
  performance,
  selectedPeriod,
  benchmarkLabel,
}: {
  performance: PortfolioWorkspace["performance"];
  selectedPeriod: PortfolioTimeWindow;
  benchmarkLabel: string | null;
}) {
  const periodLabel = performance?.period ?? selectedPeriod;
  const portfolioReturn = formatPct(performance?.return_pct);

  if (performance?.benchmark_return_pct != null && performance?.excess_return_pct != null) {
    return `${portfolioReturn} total return • active ${formatPct(
      performance.excess_return_pct
    )} vs ${benchmarkLabel ?? "assigned benchmark"} • ${periodLabel}`;
  }

  return `${portfolioReturn} total return • ${periodLabel}`;
}

function buildCollapsedUnavailableCopy(reason?: string | null) {
  if (!reason) {
    return "Awaiting valuation history, cashflow history, and a reporting period.";
  }

  const normalized = reason.toLowerCase();
  if (
    normalized.includes("valuation history") ||
    normalized.includes("cashflow history") ||
    normalized.includes("selected reporting period")
  ) {
    return "Awaiting valuation history, cashflow history, and a reporting period.";
  }

  if (reason.length <= 96) {
    return reason;
  }

  return "Awaiting valuation history, cashflow history, and a reporting period.";
}

function buildCollapsedUnavailableSupport({
  selectedPeriod,
  context,
}: {
  selectedPeriod: PortfolioTimeWindow;
  context: PortfolioWorkspaceContext;
}) {
  const periodLabel = context.periodLabel || selectedPeriod;
  const resolvedWindow = `${formatDate(context.effectivePeriodStartDate)} - ${formatDate(
    context.effectivePeriodEndDate
  )}`;

  return `${periodLabel} • ${resolvedWindow} • Open Performance for full requirements`;
}
