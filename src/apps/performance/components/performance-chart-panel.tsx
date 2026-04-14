"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";

import {
  WorkbenchChartShell,
  WorkbenchLoadingState,
} from "@/design-system";
import type { PerformanceWorkspaceCapabilities } from "../capabilities";
import type {
  PerformanceBenchmarkOptionView,
  PerformanceChartPoint,
  MoneyWeightedReturnSummary,
} from "@/features/workbench/types";

import { buildPerformanceReturnPathTableModel } from "./performance-analytics-table-models";
import PerformanceAnalysisControlBar from "./performance-analysis-control-bar";
import PerformanceAnalyticalUnavailableState from "./performance-analytical-unavailable-state";
import PerformanceObservationTrail from "./performance-observation-trail";
import PerformanceReturnPathChartStage from "./performance-return-path-chart-stage";
import PerformanceReturnPathNotices from "./performance-return-path-notices";
import PerformanceReturnPathSummary from "./performance-return-path-summary";
import {
  buildReturnPathChartOption,
  buildPercentAxisBounds,
  resolveReportDates,
  resolveActiveCumulativeReturn,
  resolveActivePeriodReturn,
  toNumeric,
} from "./performance-return-path-chart-model";
import { getPerformanceReturnPathPresentation } from "./performance-summary-context-helpers";
import PerformanceOutcomeStrip from "./performance-outcome-strip";
import { formatDate } from "../formatters";
import type { PerformanceReturnPathSingleObservationPresentation } from "./performance-return-path-single-observation-stage";

type PerformanceControlPatch = {
  portfolioId?: string;
  period?: string;
  detailBasis?: string;
  contributionDimension?: string;
  attributionDimension?: string;
  chartFrequency?: string;
  benchmark?: string;
  reportStartDate?: string;
  reportEndDate?: string;
};

type ComparativeSummary = {
  portfolio_return_pct: number | null;
  benchmark_return_pct: number | null;
  active_return_pct: number | null;
  annualized_return_pct?: number | null;
  end_market_value?: number | null;
  beginning_cash_flow?: number | null;
  ending_cash_flow?: number | null;
  flow_adjusted_end_market_value?: number | null;
  net_cash_flow?: number | null;
  fees?: number | null;
  benchmark_return_source?: string | null;
  benchmark_input_mode?: string | null;
};

type PerformanceChartViewMode = "combined" | "absolute" | "relative";

function clampPercent(value: number) {
  return Math.min(100, Math.max(0, value));
}

function buildSingleObservationPresentation({
  points,
  chartViewMode,
  hasBenchmarkSeries,
}: {
  points: PerformanceChartPoint[];
  chartViewMode: PerformanceChartViewMode;
  hasBenchmarkSeries: boolean;
}): PerformanceReturnPathSingleObservationPresentation | null {
  if (points.length !== 1) {
    return null;
  }

  const point = points[0];
  const rows = [
    ...(chartViewMode !== "relative"
      ? [
          {
            key: "portfolio",
            label: "Portfolio",
            value: toNumeric(point.cumulative_portfolio_return_pct),
            toneClassName: "performance-return-path-single-observation-tone-portfolio",
          },
          ...(hasBenchmarkSeries
            ? [
                {
                  key: "benchmark",
                  label: "Benchmark",
                  value: toNumeric(point.cumulative_benchmark_return_pct),
                  toneClassName: "performance-return-path-single-observation-tone-benchmark",
                },
              ]
            : []),
        ]
      : []),
    ...(chartViewMode !== "absolute"
      ? [
          {
            key: "active",
            label: "Active",
            value: resolveActiveCumulativeReturn(point),
            toneClassName: "performance-return-path-single-observation-tone-active",
          },
        ]
      : []),
  ].filter((row): row is { key: string; label: string; value: number; toneClassName: string } => row.value !== null);

  if (!rows.length) {
    return null;
  }

  const bounds = buildPercentAxisBounds(rows.map((row) => row.value));
  const span = Math.max(bounds.max - bounds.min, 0.1);
  const baselinePct = clampPercent(((0 - bounds.min) / span) * 100);

  return {
    observationLabel: point.label,
    axisMinLabel: `${bounds.min}%`,
    axisMaxLabel: `${bounds.max > 0 ? "+" : ""}${bounds.max}%`,
    baselinePct,
    rows: rows.map((row) => {
      const markerPct = clampPercent(((row.value - bounds.min) / span) * 100);
      const startPct = Math.min(markerPct, baselinePct);
      const widthPct = Math.max(Math.abs(markerPct - baselinePct), 1.2);
      return {
        key: row.key,
        label: row.label,
        valueLabel: `${row.value > 0 ? "+" : ""}${row.value}%`,
        startPct,
        widthPct,
        markerPct,
        toneClassName: row.toneClassName,
      };
    }),
  };
}

export default function PerformanceChartPanel({
  title,
  points,
  summary,
  portfolioId,
  period,
  detailBasis,
  contributionDimension,
  attributionDimension,
  chartFrequency,
  benchmark,
  benchmarkOptions = [],
  moneyWeightedReturn,
  reportingCurrency,
  reportStartDate,
  reportEndDate,
  capabilities,
  onRequestChange,
  isUpdating = false,
  isDetailsPending = false,
  id,
}: {
  title: string;
  points: PerformanceChartPoint[];
  summary: ComparativeSummary;
  portfolioId: string;
  period: string;
  detailBasis: string;
  contributionDimension: string;
  attributionDimension: string;
  chartFrequency: string;
  benchmark?: string;
  benchmarkOptions?: PerformanceBenchmarkOptionView[];
  moneyWeightedReturn?: MoneyWeightedReturnSummary | null;
  reportingCurrency: string;
  reportStartDate: string;
  reportEndDate: string;
  capabilities: PerformanceWorkspaceCapabilities;
  onRequestChange: (patch: PerformanceControlPatch) => void;
  isUpdating?: boolean;
  isDetailsPending?: boolean;
  id?: string;
}) {
  const resolvedReportDates = useMemo(
    () => resolveReportDates(points, reportStartDate, reportEndDate),
    [points, reportEndDate, reportStartDate]
  );
  const [fromDate, setFromDate] = useState(resolvedReportDates.startDate);
  const [toDate, setToDate] = useState(resolvedReportDates.endDate);
  const hasBenchmarkSeries = points.some(
    (point) =>
      point.benchmark_return_pct !== null || point.cumulative_benchmark_return_pct !== null
  );
  const hasActiveSeries = points.some(
    (point) =>
      resolveActivePeriodReturn(point) !== null ||
      resolveActiveCumulativeReturn(point) !== null
  );
  const [chartViewMode, setChartViewMode] = useState<PerformanceChartViewMode>(
    hasBenchmarkSeries && hasActiveSeries ? "combined" : "absolute"
  );

  useEffect(() => {
    setFromDate(resolvedReportDates.startDate);
    setToDate(resolvedReportDates.endDate);
  }, [resolvedReportDates.endDate, resolvedReportDates.startDate]);

  useEffect(() => {
    if (chartViewMode === "relative" && !hasActiveSeries) {
      setChartViewMode(hasBenchmarkSeries ? "combined" : "absolute");
      return;
    }
    if (chartViewMode === "combined" && !hasBenchmarkSeries) {
      setChartViewMode("absolute");
    }
  }, [chartViewMode, hasActiveSeries, hasBenchmarkSeries]);
  const resolvedBenchmarkOptions = useMemo(() => {
    if (benchmarkOptions.length > 0) {
      return benchmarkOptions;
    }
    if (!benchmark) {
      return [];
    }
    return [
      {
        benchmark_code: benchmark,
        benchmark_name: benchmark,
        is_assigned: true,
      } satisfies PerformanceBenchmarkOptionView,
    ];
  }, [benchmark, benchmarkOptions]);
  const returnPathPresentation = getPerformanceReturnPathPresentation({
    summary,
    moneyWeightedReturn,
    points,
    benchmark,
    benchmarkOptions: resolvedBenchmarkOptions,
    capabilities,
    reportingCurrency,
  });
  const chartTableModel = useMemo(
    () =>
      buildPerformanceReturnPathTableModel({
        points,
        viewMode: chartViewMode,
        includeBenchmarkSeries: hasBenchmarkSeries,
        includeActiveSeries: hasActiveSeries,
      }),
    [chartViewMode, hasActiveSeries, hasBenchmarkSeries, points]
  );
  const hasRenderableReturnPath =
    points.length > 0 && capabilities.returnPath.state !== "unavailable";
  const observationCountLabel =
    chartTableModel.rows.length > 0
      ? `${chartTableModel.rows.length} published observations remain visible.`
      : "No published return observations are exposed for this resolved window.";

  const chartOption = useMemo(() => {
    return buildReturnPathChartOption({
      points,
      chartViewMode,
      hasBenchmarkSeries,
    });
  }, [chartViewMode, hasBenchmarkSeries, points]);
  const singleObservation = useMemo(
    () =>
      buildSingleObservationPresentation({
        points,
        chartViewMode,
        hasBenchmarkSeries,
      }),
    [chartViewMode, hasBenchmarkSeries, points]
  );

  function applyExplicitDates(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!fromDate || !toDate) {
      return;
    }
    onRequestChange({
      period: "EXPLICIT",
      reportStartDate: fromDate,
      reportEndDate: toDate,
    });
  }

  function updateSelection(patch: PerformanceControlPatch) {
    onRequestChange({
      portfolioId,
      period,
      detailBasis,
      contributionDimension,
      attributionDimension,
      chartFrequency,
      benchmark,
      reportStartDate,
      reportEndDate,
      ...patch,
    });
  }

  const outcomeItems = returnPathPresentation.metrics.filter(
    (metric) =>
      !["portfolio-return", "benchmark-return", "active-return"].includes(metric.key)
  );
  const outcomeStrip =
    capabilities.summaryKpis.state !== "unavailable" ? (
      <PerformanceOutcomeStrip
        items={outcomeItems.map((metric) => ({
          key: metric.key,
          label: metric.label,
          value: metric.value,
          support: metric.support,
          definition: metric.definition,
          unavailable: metric.unavailable,
        }))}
      />
    ) : null;
  const topContext =
    hasRenderableReturnPath || outcomeStrip ? (
      <div className="performance-return-path-top-stack">
        {hasRenderableReturnPath ? (
          <PerformanceReturnPathSummary
            portfolioReturn={returnPathPresentation.portfolioReturnValue}
            benchmarkReturn={returnPathPresentation.benchmarkReturnValue}
            activeReturn={returnPathPresentation.activeReturnValue}
          />
        ) : null}
        {outcomeStrip ? (
          <div className="performance-return-path-supporting-strip">{outcomeStrip}</div>
        ) : null}
      </div>
    ) : undefined;
  const resolvedWindowLabel =
    resolvedReportDates.startDate && resolvedReportDates.endDate
      ? `${formatDate(resolvedReportDates.startDate)} - ${formatDate(resolvedReportDates.endDate)}`
      : period;
  const resolvedBasisLabel = detailBasis === "GROSS" ? "Gross" : "Net";
  const chartLegendItems = [
    {
      key: "portfolio",
      label: "Portfolio",
      className: "performance-chart-legend-item-portfolio",
    },
    ...(hasBenchmarkSeries
      ? [
          {
            key: "benchmark",
            label: "Benchmark",
            className: "performance-chart-legend-item-benchmark",
          },
        ]
      : []),
    ...(hasActiveSeries
      ? [
          {
            key: "active",
            label: "Active",
            className: "performance-chart-legend-item-active",
          },
        ]
      : []),
  ];

  return (
    <WorkbenchChartShell
      id={id}
      title={title}
      className="performance-chart-stage workbench-summary-panel"
      bodyClassName="performance-return-path-body"
      contextRow={topContext}
      toolbar={
        <PerformanceAnalysisControlBar
          period={period}
          detailBasis={detailBasis}
          chartFrequency={chartFrequency}
          benchmark={benchmark}
          resolvedBenchmarkOptions={resolvedBenchmarkOptions}
          fromDate={fromDate}
          toDate={toDate}
          maxEndDate={resolvedReportDates.endDate}
          minEndDate={resolvedReportDates.startDate}
          chartViewMode={chartViewMode}
          hasBenchmarkSeries={hasBenchmarkSeries}
          hasActiveSeries={hasActiveSeries}
          capabilities={capabilities}
          isUpdating={isUpdating}
          onRequestChange={updateSelection}
          onApplyExplicitDates={applyExplicitDates}
          onFromDateChange={setFromDate}
          onToDateChange={setToDate}
          onChartViewModeChange={setChartViewMode}
        />
      }
      loadingState={
        isDetailsPending ? (
          <WorkbenchLoadingState
            className="performance-chart-loading-state"
            title="Resolving return path and benchmark comparison"
            message="Loading published observations, benchmark context, and active comparison for the selected reporting window."
            rows={2}
            chart
          />
        ) : undefined
      }
      fallbackState={
        !isDetailsPending ? (
          <PerformanceAnalyticalUnavailableState
            ariaLabel={`${title} unavailable`}
            status={capabilities.returnPath.state === "partial" ? "partial" : "unavailable"}
            title={
              capabilities.returnPath.state === "partial"
                ? "Return history is partially available"
                : "Return history is unavailable for the selected window"
            }
            body={
              capabilities.returnPath.reason ??
              "The resolved window does not currently expose published performance observations for this mandate."
            }
            hint="Published return observations and benchmark-relative series must be exposed by the underlying performance contract before the cumulative path can render."
            contextItems={[
              { label: "Window", value: resolvedWindowLabel },
              {
                label: "Benchmark",
                value: returnPathPresentation.benchmarkContextValue,
              },
              { label: "Basis", value: resolvedBasisLabel },
            ]}
            availableItems={[
              {
                label: "Summary metrics",
                value:
                  capabilities.summaryKpis.state === "unavailable"
                    ? "Unavailable"
                    : "Headline return and cash-flow metrics remain available.",
              },
              {
                label: "Evidence",
                value: observationCountLabel,
              },
            ]}
          />
        ) : undefined
      }
    >
      {hasRenderableReturnPath ? (
        <>
          <PerformanceReturnPathNotices
            partialReason={
              capabilities.returnPath.state === "partial"
                ? capabilities.returnPath.reason ??
                  "Return observations are partially published for the selected horizon."
                : null
            }
            benchmarkStateBody={returnPathPresentation.benchmarkStateBody}
          />
          <div className="performance-chart-analysis-grid">
            <PerformanceReturnPathChartStage
              title={title}
              option={chartOption}
              legendItems={chartLegendItems}
              isDetailsPending={isDetailsPending}
              singleObservation={singleObservation}
            />
          </div>
          <PerformanceObservationTrail tableModel={chartTableModel} />
        </>
      ) : null}
    </WorkbenchChartShell>
  );
}
