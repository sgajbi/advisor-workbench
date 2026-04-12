"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import ReactECharts from "echarts-for-react";
import type { EChartsOption } from "echarts";
import type { CallbackDataParams } from "echarts/types/src/util/types.js";
import { Box } from "@mui/material";

import {
  CapabilityStatePanel,
  Text,
  WorkbenchChartShell,
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
import PerformanceChartContextStrip from "./performance-chart-context-strip";
import PerformanceDecisionReadout from "./performance-decision-readout";
import PerformanceObservationTrail from "./performance-observation-trail";
import PerformanceReturnPathLegend from "./performance-return-path-legend";
import { getPerformanceReturnPathPresentation } from "./performance-summary-context-helpers";
import PerformanceOutcomeStrip from "./performance-outcome-strip";
import { formatDate, formatPct } from "../formatters";

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

const CHART_COLORS = {
  portfolio: "#da1e28",
  benchmark: "#1f2e45",
  active: "#2f5f97",
  portfolioBar: "rgba(218, 30, 40, 0.28)",
  benchmarkBar: "rgba(31, 46, 69, 0.24)",
  activeBar: "rgba(47, 95, 151, 0.24)",
};

const SHARED_CHART_TEXT = {
  legendSize: Number.parseFloat(lotusThemeTokens.typography.size.textSm),
  axisSize: Number.parseFloat(lotusThemeTokens.typography.size.textXs),
  legendWeight: lotusThemeTokens.typography.variant.cardTitle.weight,
  axisWeight: lotusThemeTokens.typography.variant.label.weight,
  tooltipWeight: 600,
  tooltipPadding: [
    Number.parseInt(lotusThemeTokens.spacing.step3, 10),
    Number.parseInt(lotusThemeTokens.spacing.step4, 10),
  ] as [number, number],
  barRadius: [lotusThemeTokens.radius.sm, lotusThemeTokens.radius.sm, 0, 0] as [number, number, number, number],
  refreshRadius: lotusThemeTokens.radius.control,
};

function toNumeric(value: number | null | undefined): number | null {
  return value === null || value === undefined || Number.isNaN(value) ? null : value;
}

function buildPercentAxisBounds(values: Array<number | null | undefined>) {
  const numericValues = values
    .map((value) => toNumeric(value))
    .filter((value): value is number => value !== null);

  if (!numericValues.length) {
    return { min: -1, max: 1 };
  }

  const rawMin = Math.min(...numericValues, 0);
  const rawMax = Math.max(...numericValues, 0);
  const spread = rawMax - rawMin || 1;
  const padding = Math.max(spread * 0.12, 1);

  return {
    min: Math.floor((rawMin - padding) * 10) / 10,
    max: Math.ceil((rawMax + padding) * 10) / 10,
  };
}

function resolveReportDates(
  points: PerformanceChartPoint[],
  reportStartDate?: string,
  reportEndDate?: string
) {
  const fallbackStartDate =
    points.find((point) => point.period_start)?.period_start ??
    points.find((point) => point.period_end)?.period_end ??
    "";
  const fallbackEndDate =
    [...points].reverse().find((point) => point.period_end)?.period_end ??
    [...points].reverse().find((point) => point.period_start)?.period_start ??
    fallbackStartDate;

  return {
    startDate: reportStartDate || fallbackStartDate,
    endDate: reportEndDate || fallbackEndDate,
  };
}

function getLatestNumeric(values: Array<number | null | undefined>) {
  return [...values].reverse().find((value): value is number => value !== null && value !== undefined) ?? null;
}

function formatEndLabel(
  params: CallbackDataParams,
  label: string,
  lastIndex: number
) {
  const value = typeof params.value === "number" ? params.value : null;
  return params.dataIndex === lastIndex && value !== null ? `${label} ${formatPct(value)}` : "";
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
    (point) => point.active_return_pct !== null || point.cumulative_active_return_pct !== null
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

  const chartOption = useMemo(() => {
    const categories = points.map((point) => point.label);
    const portfolioCumulative = points.map((point) =>
      toNumeric(point.cumulative_portfolio_return_pct)
    );
    const benchmarkCumulative = points.map((point) =>
      toNumeric(point.cumulative_benchmark_return_pct)
    );
    const activeCumulative = points.map((point) =>
      toNumeric(point.cumulative_active_return_pct)
    );
    const portfolioPeriodic = points.map((point) => toNumeric(point.portfolio_return_pct));
    const benchmarkPeriodic = points.map((point) => toNumeric(point.benchmark_return_pct));
    const activePeriodic = points.map((point) => toNumeric(point.active_return_pct));
    const hasActiveCumulativeSeries = hasBenchmarkSeries && activeCumulative.some((value) => value !== null);
    const hasActivePeriodicSeries = hasBenchmarkSeries && activePeriodic.some((value) => value !== null);
    const includeAbsoluteSeries = chartViewMode !== "relative";
    const includeRelativeSeries = chartViewMode !== "absolute";
    const showBenchmarkSeries = includeAbsoluteSeries && hasBenchmarkSeries;
    const showActiveCumulativeSeries = includeRelativeSeries && hasActiveCumulativeSeries;
    const showActivePeriodicSeries = includeRelativeSeries && hasActivePeriodicSeries;

    const cumulativeBounds = buildPercentAxisBounds([
      ...(includeAbsoluteSeries ? portfolioCumulative : []),
      ...(showBenchmarkSeries ? benchmarkCumulative : []),
      ...(showActiveCumulativeSeries ? activeCumulative : []),
    ]);
    const barBounds = buildPercentAxisBounds([
      ...(includeAbsoluteSeries ? portfolioPeriodic : []),
      ...(showBenchmarkSeries ? benchmarkPeriodic : []),
      ...(showActivePeriodicSeries ? activePeriodic : []),
    ]);

    return {
      animation: false,
      backgroundColor: "transparent",
      color: [
        CHART_COLORS.portfolio,
        CHART_COLORS.benchmark,
        CHART_COLORS.active,
        CHART_COLORS.portfolioBar,
        CHART_COLORS.benchmarkBar,
        CHART_COLORS.activeBar,
      ],
      grid: {
        left: 66,
        right: 28,
        top: 18,
        bottom: 34,
        containLabel: true,
      },
      legend: {
        show: false,
      },
      tooltip: {
        trigger: "axis",
        axisPointer: { type: "cross" },
        backgroundColor: "rgba(19, 30, 43, 0.96)",
        borderColor: "rgba(117, 143, 173, 0.48)",
        borderWidth: 1,
        textStyle: {
          color: "#f8fafc",
          fontSize: SHARED_CHART_TEXT.legendSize,
          fontWeight: SHARED_CHART_TEXT.tooltipWeight,
        },
        extraCssText:
          "box-shadow: 0 18px 32px rgba(15, 23, 42, 0.24); border-radius: 10px;",
        padding: SHARED_CHART_TEXT.tooltipPadding,
        valueFormatter: (value: unknown) => {
          if (typeof value === "number") {
            return `${value.toFixed(2)}%`;
          }
          if (typeof value === "string") {
            return value;
          }
          return "";
        },
      },
      xAxis: {
        type: "category" as const,
        data: categories,
        axisLine: { lineStyle: { color: "rgba(52, 70, 95, 0.28)", width: 1 } },
        axisTick: { show: false },
        axisLabel: {
          color: "#5a6779",
          fontSize: SHARED_CHART_TEXT.axisSize,
          fontWeight: SHARED_CHART_TEXT.axisWeight,
          margin: 14,
        },
      },
      yAxis: [
        {
          type: "value" as const,
          min: cumulativeBounds.min,
          max: cumulativeBounds.max,
          splitNumber: 5,
          axisLabel: {
            color: "#637083",
            formatter: (value: number) => `${value}%`,
          },
          axisLine: { show: false },
          axisTick: { show: false },
          splitLine: {
            lineStyle: {
              color: "rgba(52, 70, 95, 0.11)",
              width: 1,
            },
          },
        },
        {
          type: "value" as const,
          min: barBounds.min,
          max: barBounds.max,
          show: false,
        },
      ],
      series: [
        ...(includeAbsoluteSeries
          ? [
              {
                name: "Portfolio Period",
                type: "bar" as const,
                yAxisIndex: 1,
                data: portfolioPeriodic,
                barWidth: 14,
                barGap: "18%",
                barCategoryGap: "34%",
                z: 1,
                itemStyle: {
                  color: "rgba(218, 30, 40, 0.38)",
                  borderRadius: SHARED_CHART_TEXT.barRadius,
                  borderColor: "rgba(218, 30, 40, 0.66)",
                  borderWidth: 1,
                },
              },
            ]
          : []),
        ...(showBenchmarkSeries
          ? [
              {
                name: "Benchmark Period",
                type: "bar" as const,
                yAxisIndex: 1,
                data: benchmarkPeriodic,
                barWidth: 14,
                z: 1,
                itemStyle: {
                  color: "rgba(31, 46, 69, 0.36)",
                  borderRadius: SHARED_CHART_TEXT.barRadius,
                  borderColor: "rgba(31, 46, 69, 0.6)",
                  borderWidth: 1,
                },
              },
            ]
          : []),
        ...(showActivePeriodicSeries
          ? [
              {
                name: "Active Period",
                type: "bar" as const,
                yAxisIndex: 1,
                data: activePeriodic,
                barWidth: 14,
                z: 1,
                itemStyle: {
                  color: "rgba(47, 95, 151, 0.34)",
                  borderRadius: SHARED_CHART_TEXT.barRadius,
                  borderColor: "rgba(47, 95, 151, 0.58)",
                  borderWidth: 1,
                },
              },
            ]
          : []),
        ...(includeAbsoluteSeries
          ? [
              {
                name: "Portfolio Return",
                type: "line" as const,
                data: portfolioCumulative,
                smooth: false,
                symbol: "circle",
                symbolSize: 6,
                showSymbol: true,
                connectNulls: true,
                z: 4,
                lineStyle: {
                  width: 4,
                  color: CHART_COLORS.portfolio,
                  cap: "round" as const,
                  join: "round" as const,
                },
                label: {
                  show: true,
                  position: "right" as const,
                  color: CHART_COLORS.portfolio,
                  fontWeight: 800,
                  formatter: (params: CallbackDataParams) =>
                    formatEndLabel(params, "Portfolio", portfolioCumulative.length - 1),
                },
                areaStyle: {
                  color: "rgba(218, 30, 40, 0.035)",
                },
              },
            ]
          : []),
        ...(showBenchmarkSeries
          ? [
              {
                name: returnPathPresentation.benchmarkLabel,
                type: "line" as const,
                data: benchmarkCumulative,
                smooth: false,
                symbol: "circle",
                symbolSize: 6,
                showSymbol: true,
                connectNulls: true,
                z: 4,
                lineStyle: {
                  width: 3.5,
                  color: CHART_COLORS.benchmark,
                  cap: "round" as const,
                  join: "round" as const,
                },
                label: {
                  show: true,
                  position: "right" as const,
                  color: CHART_COLORS.benchmark,
                  fontWeight: 800,
                  formatter: (params: CallbackDataParams) =>
                    formatEndLabel(params, "Benchmark", benchmarkCumulative.length - 1),
                },
              },
            ]
          : []),
        ...(showActiveCumulativeSeries
          ? [
              {
                name: "Active Cumulative",
                type: "line" as const,
                data: activeCumulative,
                smooth: false,
                symbol: "circle",
                symbolSize: 6,
                showSymbol: true,
                connectNulls: true,
                z: 4,
                lineStyle: {
                  width: 2.2,
                  type: "dashed" as const,
                  color: CHART_COLORS.active,
                  cap: "round" as const,
                  join: "round" as const,
                },
                label: {
                  show: chartViewMode !== "combined",
                  position: "right" as const,
                  color: CHART_COLORS.active,
                  fontWeight: 760,
                  formatter: (params: CallbackDataParams) =>
                    formatEndLabel(params, "Active", activeCumulative.length - 1),
                },
              },
            ]
          : []),
      ],
    } satisfies EChartsOption;
  }, [chartViewMode, hasBenchmarkSeries, points, returnPathPresentation.benchmarkLabel]);

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

  const outcomeItems = returnPathPresentation.metrics;
  const latestPortfolioReturn = getLatestNumeric(
    points.map((point) => point.cumulative_portfolio_return_pct)
  );
  const latestBenchmarkReturn = getLatestNumeric(
    points.map((point) => point.cumulative_benchmark_return_pct)
  );
  const latestActiveReturn = getLatestNumeric(
    points.map((point) => point.cumulative_active_return_pct)
  );
  const resolvedWindowLabel =
    resolvedReportDates.startDate && resolvedReportDates.endDate
      ? `${formatDate(resolvedReportDates.startDate)} - ${formatDate(resolvedReportDates.endDate)}`
      : period;
  const resolvedBasisLabel = detailBasis === "GROSS" ? "Gross" : "Net";
  const chartLegendItems = [
    {
      key: "portfolio",
      label: "Portfolio cumulative",
      value: latestPortfolioReturn == null ? "Unavailable" : formatPct(latestPortfolioReturn),
      className: "performance-chart-legend-item-portfolio",
    },
    ...(hasBenchmarkSeries
      ? [
          {
            key: "benchmark",
            label: returnPathPresentation.benchmarkLabel,
            value:
              latestBenchmarkReturn == null ? "Unavailable" : formatPct(latestBenchmarkReturn),
            className: "performance-chart-legend-item-benchmark",
          },
        ]
      : []),
    ...(hasActiveSeries
      ? [
          {
            key: "active",
            label: "Active cumulative",
            value: latestActiveReturn == null ? "Unavailable" : formatPct(latestActiveReturn),
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
            portfolioId={portfolioId}
            period={period}
            detailBasis={detailBasis}
            benchmarkContextValue={returnPathPresentation.benchmarkContextValue}
            activeReturn={returnPathPresentation.activeReturnValue}
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
          <div className="performance-chart-loading-state">
            <p className="muted">Loading analytical time series and benchmark comparison.</p>
          </div>
        ) : undefined
      }
      fallbackState={
        !isDetailsPending ? (
          <div className="performance-chart-unavailable" aria-label={`${title} unavailable`}>
            <CapabilityStatePanel
              capability={capabilities.returnPath}
              partialTitle="Return History Is Partial"
              unavailableTitle="Return History Unavailable"
              body={
                capabilities.returnPath.reason ??
                "The resolved window does not currently have published performance observations for this mandate."
              }
              partialHint="Adjust the period or explicit dates once performance history is available for this resolved window."
              unavailableHint="Adjust the period or explicit dates once performance history is available for this resolved window."
              surface="analysis"
            />
          </div>
        ) : undefined
      }
    >
      {capabilities.returnPath.state === "supported" && points.length ? (
        <>
          {returnPathPresentation.benchmarkStateBody ? (
            <div className="performance-chart-benchmark-state">
              <strong>Benchmark unassigned</strong>
              <span>{returnPathPresentation.benchmarkStateBody}</span>
            </div>
          ) : null}
          <div className="performance-chart-analysis-grid">
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
            <PerformanceDecisionReadout
              activeReturn={returnPathPresentation.activeReturnValue}
              windowLabel={resolvedWindowLabel}
              basisLabel={resolvedBasisLabel}
              benchmark={returnPathPresentation.benchmarkContextValue}
              comparisonBasis={
                returnPathPresentation.benchmarkSourceLabel
                  ? `${returnPathPresentation.benchmarkSourceLabel} return series`
                  : "Benchmark-relative return series"
              }
              observationCadence={chartFrequency === "quarterly" ? "Quarterly" : "Monthly"}
            />
          </div>
          <PerformanceObservationTrail tableModel={chartTableModel} />
        </>
      ) : null}
    </WorkbenchChartShell>
  );
}
