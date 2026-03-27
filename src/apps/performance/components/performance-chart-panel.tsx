"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import ReactECharts from "echarts-for-react";
import type { EChartsOption } from "echarts";

import { Panel } from "@/design-system";
import type {
  PerformanceBenchmarkOptionView,
  PerformanceChartPoint,
} from "@/features/workbench/types";

import { formatDate, formatPct } from "../formatters";
import { BASIS_OPTIONS, CHART_FREQUENCY_OPTIONS, PERIOD_OPTIONS } from "../navigation";

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
};

const CHART_COLORS = {
  portfolio: "#da1e28",
  benchmark: "#2d3748",
  portfolioBar: "rgba(218, 30, 40, 0.18)",
  benchmarkBar: "rgba(45, 55, 72, 0.16)",
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

function formatBenchmarkLabel(
  benchmark?: string,
  benchmarkOptions: PerformanceBenchmarkOptionView[] = []
) {
  if (!benchmark) {
    return "Benchmark";
  }
  return (
    benchmarkOptions.find((option) => option.benchmark_code === benchmark)?.benchmark_name ??
    benchmark
  );
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
  reportStartDate,
  reportEndDate,
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
  reportStartDate: string;
  reportEndDate: string;
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

  useEffect(() => {
    setFromDate(resolvedReportDates.startDate);
    setToDate(resolvedReportDates.endDate);
  }, [resolvedReportDates.endDate, resolvedReportDates.startDate]);

  const hasBenchmarkSeries = points.some(
    (point) =>
      point.benchmark_return_pct !== null || point.cumulative_benchmark_return_pct !== null
  );
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

  const chartOption = useMemo(() => {
    const categories = points.map((point) => point.label);
    const portfolioCumulative = points.map((point) =>
      toNumeric(point.cumulative_portfolio_return_pct)
    );
    const benchmarkCumulative = points.map((point) =>
      toNumeric(point.cumulative_benchmark_return_pct)
    );
    const portfolioPeriodic = points.map((point) => toNumeric(point.portfolio_return_pct));
    const benchmarkPeriodic = points.map((point) => toNumeric(point.benchmark_return_pct));

    const cumulativeBounds = buildPercentAxisBounds([
      ...portfolioCumulative,
      ...benchmarkCumulative,
    ]);
    const barBounds = buildPercentAxisBounds([...portfolioPeriodic, ...benchmarkPeriodic]);

    return {
      animation: false,
      color: [
        CHART_COLORS.portfolio,
        CHART_COLORS.benchmark,
        CHART_COLORS.portfolioBar,
        CHART_COLORS.benchmarkBar,
      ],
      grid: {
        left: 58,
        right: 24,
        top: 24,
        bottom: 52,
        containLabel: true,
      },
      legend: {
        bottom: 6,
        left: "center",
        itemWidth: 18,
        itemHeight: 8,
        textStyle: {
          color: "#586377",
          fontSize: 12,
          fontWeight: 700,
        },
        data: [
          "Portfolio Return",
          ...(hasBenchmarkSeries
            ? [formatBenchmarkLabel(benchmark, resolvedBenchmarkOptions)]
            : []),
          "Portfolio Period",
          ...(hasBenchmarkSeries ? ["Benchmark Period"] : []),
        ],
      },
      tooltip: {
        trigger: "axis",
        axisPointer: { type: "cross" },
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
        axisLine: { lineStyle: { color: "rgba(52, 70, 95, 0.18)" } },
        axisTick: { show: false },
        axisLabel: {
          color: "#5a6476",
          fontSize: 11,
          fontWeight: 600,
        },
      },
      yAxis: [
        {
          type: "value" as const,
          min: cumulativeBounds.min,
          max: cumulativeBounds.max,
          axisLabel: {
            color: "#5a6476",
            formatter: (value: number) => `${value}%`,
          },
          splitLine: {
            lineStyle: {
              color: "rgba(52, 70, 95, 0.1)",
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
        {
          name: "Portfolio Period",
          type: "bar" as const,
          yAxisIndex: 1,
          data: portfolioPeriodic,
          barWidth: 10,
          barGap: "20%",
          z: 1,
          itemStyle: {
            color: CHART_COLORS.portfolioBar,
            borderRadius: [4, 4, 0, 0],
          },
        },
        ...(hasBenchmarkSeries
          ? [
              {
                name: "Benchmark Period",
                type: "bar" as const,
                yAxisIndex: 1,
                data: benchmarkPeriodic,
                barWidth: 10,
                z: 1,
                itemStyle: {
                  color: CHART_COLORS.benchmarkBar,
                  borderRadius: [4, 4, 0, 0],
                },
              },
            ]
          : []),
        {
          name: "Portfolio Return",
          type: "line" as const,
          data: portfolioCumulative,
          smooth: true,
          symbol: "none",
          z: 3,
          lineStyle: {
            width: 4,
            color: CHART_COLORS.portfolio,
          },
          areaStyle: {
            color: "rgba(218, 30, 40, 0.05)",
          },
        },
        ...(hasBenchmarkSeries
          ? [
              {
                name: formatBenchmarkLabel(benchmark, resolvedBenchmarkOptions),
                type: "line" as const,
                data: benchmarkCumulative,
                smooth: true,
                symbol: "none",
                z: 3,
                lineStyle: {
                  width: 3,
                  color: CHART_COLORS.benchmark,
                },
              },
            ]
          : []),
      ],
    } satisfies EChartsOption;
  }, [benchmark, hasBenchmarkSeries, points, resolvedBenchmarkOptions]);

  const latest = points.at(-1);
  const periodicPortfolioValues = points
    .map((point) => toNumeric(point.portfolio_return_pct))
    .filter((value): value is number => value !== null);
  const latestValue = latest?.portfolio_return_pct ?? summary.portfolio_return_pct;
  const highestValue = periodicPortfolioValues.length ? Math.max(...periodicPortfolioValues) : null;
  const lowestValue = periodicPortfolioValues.length ? Math.min(...periodicPortfolioValues) : null;
  const explicitDateRange =
    resolvedReportDates.startDate && resolvedReportDates.endDate
      ? `${formatDate(resolvedReportDates.startDate)} - ${formatDate(resolvedReportDates.endDate)}`
      : "Date range unavailable";

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

  return (
    <Panel id={id} className="performance-chart-stage">
      <div className="performance-chart-toolbar">
        <div className="performance-chart-toolbar-left">
          <div className="performance-section-heading performance-chart-stage-heading">
            <h3>{title}</h3>
            <span>{explicitDateRange}</span>
          </div>
          <div className="performance-chart-inline-controls">
            <div className="performance-chart-pill-group">
              <span>Horizon</span>
              <div className="performance-chart-pill-row">
                {PERIOD_OPTIONS.map((option) => (
                  <button
                    type="button"
                    key={option}
                    onClick={() =>
                      updateSelection({
                        period: option,
                        reportStartDate: undefined,
                        reportEndDate: undefined,
                      })
                    }
                    className={`performance-control-option ${option === period ? "performance-control-option-active" : ""}`}
                    disabled={isUpdating && option === period}
                  >
                    {option}
                  </button>
                ))}
              </div>
            </div>
            <form className="performance-chart-date-form" onSubmit={applyExplicitDates}>
              <label className="performance-chart-select-group">
                <span>From</span>
                <input
                  aria-label="From"
                  type="date"
                  value={fromDate}
                  max={toDate || resolvedReportDates.endDate}
                  onChange={(event) => setFromDate(event.currentTarget.value)}
                />
              </label>
              <label className="performance-chart-select-group">
                <span>To</span>
                <input
                  aria-label="To"
                  type="date"
                  value={toDate}
                  min={fromDate}
                  max={resolvedReportDates.endDate}
                  onChange={(event) => setToDate(event.currentTarget.value)}
                />
              </label>
              <button className="performance-chart-apply" type="submit">
                {isUpdating ? "Updating..." : "Apply"}
              </button>
            </form>
            <label className="performance-chart-select-group">
              <span>Frequency</span>
              <select
                aria-label="Frequency"
                value={chartFrequency}
                onChange={(event) =>
                  updateSelection({
                    chartFrequency: event.currentTarget.value,
                  })
                }
                disabled={isUpdating}
              >
                {CHART_FREQUENCY_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="performance-chart-select-group">
              <span>Compared To</span>
              <select
                aria-label="Compared To"
                value={benchmark ?? ""}
                onChange={(event) =>
                  updateSelection({
                    benchmark: event.currentTarget.value || undefined,
                  })
                }
                disabled={isUpdating}
              >
                {resolvedBenchmarkOptions.map((option) => (
                  <option key={option.benchmark_code} value={option.benchmark_code}>
                    {option.benchmark_name}
                  </option>
                ))}
              </select>
            </label>
            <div className="performance-chart-pill-group">
              <span>Basis</span>
              <div className="performance-chart-pill-row">
                {BASIS_OPTIONS.map((option) => (
                  <button
                    type="button"
                    key={option}
                    onClick={() =>
                      updateSelection({
                        detailBasis: option,
                      })
                    }
                    className={`performance-control-option ${option === detailBasis ? "performance-control-option-active" : ""}`}
                    disabled={isUpdating && option === detailBasis}
                  >
                    {option}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
        <div className="performance-chart-toolbar-right">
          <div className="performance-chart-chip performance-chart-chip-portfolio">
            <span>Portfolio</span>
            <strong>{formatPct(summary.portfolio_return_pct)}</strong>
          </div>
          <div className="performance-chart-chip performance-chart-chip-benchmark">
            <span>{formatBenchmarkLabel(benchmark, resolvedBenchmarkOptions)}</span>
            <strong>{hasBenchmarkSeries ? formatPct(summary.benchmark_return_pct) : "N/A"}</strong>
          </div>
          <div className="performance-chart-chip performance-chart-chip-active">
            <span>Active</span>
            <strong>{hasBenchmarkSeries ? formatPct(summary.active_return_pct) : "N/A"}</strong>
          </div>
        </div>
      </div>

      {points.length ? (
        <>
          <div className="performance-chart-summary-band">
            <div>
              <span>Latest</span>
              <strong>{formatPct(latestValue)}</strong>
            </div>
            <div>
              <span>High</span>
              <strong>{formatPct(highestValue)}</strong>
            </div>
            <div>
              <span>Low</span>
              <strong>{formatPct(lowestValue)}</strong>
            </div>
            <div>
              <span>Observations</span>
              <strong>{points.length}</strong>
            </div>
          </div>

          <div
            className="performance-chart-library-frame"
            role="img"
            aria-label={`${title} chart`}
          >
            <ReactECharts
              option={chartOption}
              style={{ width: "100%", height: "460px" }}
              opts={{ renderer: "svg" }}
              notMerge
              lazyUpdate
            />
          </div>
        </>
      ) : isDetailsPending ? (
        <div className="performance-chart-loading-state">
          <p className="muted">Loading analytical time series and benchmark comparison.</p>
        </div>
      ) : (
        <p className="muted">Performance breakdown is not available for the selected period.</p>
      )}
    </Panel>
  );
}
