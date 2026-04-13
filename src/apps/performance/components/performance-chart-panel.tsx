"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import ReactECharts from "echarts-for-react";
import { Box } from "@mui/material";

import {
  Text,
  WorkbenchChartShell,
  WorkbenchLoadingState,
} from "@/design-system";
import { lotusThemeTokens } from "@/design-system/theme/tokens";
import type { PerformanceWorkspaceCapabilities } from "../capabilities";
import type {
  PerformanceBenchmarkOptionView,
  PerformanceChartPoint,
  MoneyWeightedReturnSummary,
} from "@/features/workbench/types";

import { buildPerformanceReturnPathTableModel } from "./performance-analytics-table-models";
import PerformanceAnalysisControlBar from "./performance-analysis-control-bar";
import PerformanceAnalyticalUnavailableState from "./performance-analytical-unavailable-state";
import PerformanceChartContextStrip from "./performance-chart-context-strip";
import PerformanceObservationTrail from "./performance-observation-trail";
import PerformanceReturnPathLegend from "./performance-return-path-legend";
import PerformanceReturnPathSummary from "./performance-return-path-summary";
import {
  buildReturnPathChartOption,
  resolveReportDates,
  resolveActiveCumulativeReturn,
  resolveActivePeriodReturn,
  SHARED_CHART_TEXT,
} from "./performance-return-path-chart-model";
import { getPerformanceReturnPathPresentation } from "./performance-summary-context-helpers";
import PerformanceOutcomeStrip from "./performance-outcome-strip";
import { formatDate } from "../formatters";

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
      subtitle="Cumulative return path, periodic observations, and benchmark-relative outcome for the selected reporting window."
      className="performance-chart-stage workbench-summary-panel"
      bodyClassName="performance-return-path-body"
      contextRow={
        capabilities.returnPath.state === "supported" && points.length ? (
          <PerformanceChartContextStrip
            period={period}
            benchmarkContextValue={returnPathPresentation.benchmarkContextValue}
            reportStartDate={resolvedReportDates.startDate}
            reportEndDate={resolvedReportDates.endDate}
          />
        ) : undefined
      }
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
      metricStrip={
        capabilities.summaryKpis.state !== "unavailable" ? (
          <PerformanceOutcomeStrip
            items={outcomeItems.map((metric) => ({
              key: metric.key,
              label: metric.label,
              value: metric.value,
              support: metric.support,
              unavailable: metric.unavailable,
            }))}
          />
        ) : undefined
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
          {capabilities.returnPath.state === "partial" ? (
            <div
              className="performance-analytical-inline-note"
              role="status"
              aria-label="Return history partial state"
            >
              <span className="performance-analytical-inline-note-label">Partial history</span>
              <p>
                {capabilities.returnPath.reason ??
                  "Return observations are partially published for the selected horizon."}
              </p>
            </div>
          ) : null}
          {returnPathPresentation.benchmarkStateBody ? (
            <div className="performance-chart-benchmark-state">
              <strong>Benchmark unassigned</strong>
              <span>{returnPathPresentation.benchmarkStateBody}</span>
            </div>
          ) : null}
          <div className="performance-chart-analysis-grid">
            <PerformanceReturnPathSummary
              portfolioReturn={returnPathPresentation.portfolioReturnValue}
              benchmarkReturn={returnPathPresentation.benchmarkReturnValue}
              activeReturn={returnPathPresentation.activeReturnValue}
              basisLabel={resolvedBasisLabel}
              comparisonBasis={
                returnPathPresentation.benchmarkSourceLabel
                  ? `${returnPathPresentation.benchmarkSourceLabel} return series`
                  : "Benchmark-relative return series"
              }
              observationCadence={chartFrequency === "quarterly" ? "Quarterly" : "Monthly"}
            />
            <div
              className="performance-chart-library-frame workbench-summary-visual"
              role="img"
              aria-label={`${title} chart`}
              style={{ position: "relative" }}
            >
              <PerformanceReturnPathLegend items={chartLegendItems} />
              <ReactECharts
                option={chartOption}
                style={{ width: "100%", height: "388px" }}
                opts={{ renderer: "svg" }}
                notMerge
                lazyUpdate
              />
              {isDetailsPending ? (
                <Box
                  sx={{
                    position: "absolute",
                    top: lotusThemeTokens.spacing.step3,
                    right: lotusThemeTokens.spacing.step3,
                    px: lotusThemeTokens.spacing.step3,
                    py: lotusThemeTokens.spacing.step1,
                    borderRadius: SHARED_CHART_TEXT.refreshRadius,
                    bgcolor: "rgba(255,255,255,0.92)",
                    border: "1px solid rgba(31,39,51,0.08)",
                    boxShadow: "0 8px 18px rgba(16, 40, 51, 0.08)",
                  }}
                >
                  <Text variant="metadata" as="span">
                    Refreshing analytical series
                  </Text>
                </Box>
              ) : null}
            </div>
          </div>
          <PerformanceObservationTrail tableModel={chartTableModel} />
        </>
      ) : null}
    </WorkbenchChartShell>
  );
}
