"use client";

import { useMemo } from "react";
import ReactECharts from "echarts-for-react";
import type { EChartsOption } from "echarts";

import { Panel } from "@/design-system";
import type { PerformanceChartPoint } from "@/features/workbench/types";

import { formatDate, formatLabel, formatPct } from "../formatters";
import {
  BASIS_OPTIONS,
  BENCHMARK_OPTIONS,
  CHART_FREQUENCY_OPTIONS,
  PERIOD_OPTIONS,
  buildPerformanceHref,
} from "../navigation";

type ComparativeSummary = {
  portfolio_return_pct: number | null;
  benchmark_return_pct: number | null;
  active_return_pct: number | null;
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

function formatBenchmarkLabel(benchmark?: string) {
  if (!benchmark) {
    return "Benchmark";
  }
  return BENCHMARK_OPTIONS.find((option) => option.value === benchmark)?.label ?? benchmark;
}

function resolveExplicitDateRange(points: PerformanceChartPoint[]) {
  const start = points.find((point) => point.period_start)?.period_start ?? null;
  const end = [...points].reverse().find((point) => point.period_end)?.period_end ?? null;
  if (!start && !end) {
    return null;
  }
  return `${formatDate(start)} - ${formatDate(end)}`;
}

export default function PerformanceChartPanel({
  title,
  points,
  summary,
  portfolioId,
  period,
  detailBasis,
  detailDimension,
  chartFrequency,
  benchmark,
  id,
}: {
  title: string;
  points: PerformanceChartPoint[];
  summary: ComparativeSummary;
  portfolioId: string;
  period: string;
  detailBasis: string;
  detailDimension: string;
  chartFrequency: string;
  benchmark?: string;
  id?: string;
}) {
  const hasBenchmarkSeries = points.some(
    (point) =>
      point.benchmark_return_pct !== null || point.cumulative_benchmark_return_pct !== null
  );

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
      color: ["#cf4156", "#32465f", "#e8b55f", "#9db5c9"],
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
          ...(hasBenchmarkSeries ? [formatBenchmarkLabel(benchmark)] : []),
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
            color: "rgba(207, 65, 86, 0.18)",
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
                  color: "rgba(50, 70, 95, 0.16)",
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
            color: "#cf4156",
          },
          areaStyle: {
            color: "rgba(207, 65, 86, 0.05)",
          },
        },
        ...(hasBenchmarkSeries
          ? [
              {
                name: formatBenchmarkLabel(benchmark),
                type: "line" as const,
                data: benchmarkCumulative,
                smooth: true,
                symbol: "none",
                z: 3,
                lineStyle: {
                  width: 3,
                  color: "#32465f",
                },
              },
            ]
          : []),
      ],
    } satisfies EChartsOption;
  }, [benchmark, hasBenchmarkSeries, points]);

  const latest = points.at(-1);
  const periodicPortfolioValues = points
    .map((point) => toNumeric(point.portfolio_return_pct))
    .filter((value): value is number => value !== null);
  const latestValue = latest?.portfolio_return_pct ?? summary.portfolio_return_pct;
  const highestValue = periodicPortfolioValues.length ? Math.max(...periodicPortfolioValues) : null;
  const lowestValue = periodicPortfolioValues.length ? Math.min(...periodicPortfolioValues) : null;
  const explicitDateRange = resolveExplicitDateRange(points);

  return (
    <Panel id={id} className="performance-chart-stage">
      <div className="performance-chart-toolbar">
        <div className="performance-chart-toolbar-left">
          <div className="performance-section-heading performance-chart-stage-heading">
            <h3>{title}</h3>
            <span>{explicitDateRange ?? formatLabel(chartFrequency)}</span>
          </div>
          <div className="performance-chart-inline-controls">
            <div className="performance-chart-pill-group">
              <span>Horizon</span>
              <div className="performance-chart-pill-row">
                {PERIOD_OPTIONS.map((option) => (
                  <a
                    key={option}
                    href={buildPerformanceHref({
                      portfolioId,
                      period: option,
                      detailBasis,
                      detailDimension,
                      chartFrequency,
                      benchmark,
                    })}
                    className={`performance-control-option ${option === period ? "performance-control-option-active" : ""}`}
                  >
                    {option}
                  </a>
                ))}
              </div>
            </div>
            <label className="performance-chart-select-group">
              <span>Frequency</span>
              <select
                aria-label="Frequency"
                value={chartFrequency}
                onChange={(event) => {
                  window.location.href = buildPerformanceHref({
                    portfolioId,
                    period,
                    detailBasis,
                    detailDimension,
                    chartFrequency: event.currentTarget.value,
                    benchmark,
                  });
                }}
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
                onChange={(event) => {
                  window.location.href = buildPerformanceHref({
                    portfolioId,
                    period,
                    detailBasis,
                    detailDimension,
                    chartFrequency,
                    benchmark: event.currentTarget.value || undefined,
                  });
                }}
              >
                {BENCHMARK_OPTIONS.map((option) => (
                  <option key={option.value || "none"} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
            <div className="performance-chart-pill-group">
              <span>Basis</span>
              <div className="performance-chart-pill-row">
                {BASIS_OPTIONS.map((option) => (
                  <a
                    key={option}
                    href={buildPerformanceHref({
                      portfolioId,
                      period,
                      detailBasis: option,
                      detailDimension,
                      chartFrequency,
                      benchmark,
                    })}
                    className={`performance-control-option ${option === detailBasis ? "performance-control-option-active" : ""}`}
                  >
                    {option}
                  </a>
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
            <span>{formatBenchmarkLabel(benchmark)}</span>
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
      ) : (
        <p className="muted">Performance breakdown is not available for the selected period.</p>
      )}
    </Panel>
  );
}
