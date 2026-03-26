"use client";

import { Panel } from "@/design-system";
import type { PerformanceChartPoint } from "@/features/workbench/types";

import { formatCompactPct, formatLabel, formatPct } from "../formatters";
import {
  BENCHMARK_OPTIONS,
  CHART_FREQUENCY_OPTIONS,
  buildPerformanceHref,
} from "../navigation";

type ComparativeSummary = {
  portfolio_return_pct: number | null;
  benchmark_return_pct: number | null;
  active_return_pct: number | null;
};

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function buildLinePath(points: number[], width: number, height: number, min: number, max: number): string {
  const range = max - min || 1;
  return points
    .map((point, index) => {
      const x = (index / Math.max(points.length - 1, 1)) * width;
      const y = height - ((point - min) / range) * height;
      return `${index === 0 ? "M" : "L"}${x.toFixed(2)} ${y.toFixed(2)}`;
    })
    .join(" ");
}

function buildAreaPath(path: string, width: number, height: number): string {
  if (!path) {
    return "";
  }
  return `${path} L${width} ${height} L0 ${height} Z`;
}

function buildBarLayout(points: PerformanceChartPoint[]) {
  const values = points.flatMap((point) => [
    Math.abs(point.portfolio_return_pct ?? 0),
    Math.abs(point.benchmark_return_pct ?? 0),
  ]);
  const maxMagnitude = Math.max(0.01, ...values);
  return points.map((point) => ({
    label: point.label,
    portfolio: point.portfolio_return_pct ?? 0,
    benchmark: point.benchmark_return_pct ?? 0,
    portfolioHeight: (Math.abs(point.portfolio_return_pct ?? 0) / maxMagnitude) * 100,
    benchmarkHeight: (Math.abs(point.benchmark_return_pct ?? 0) / maxMagnitude) * 100,
  }));
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
  const width = 760;
  const height = 300;
  const portfolioSeries = points.map((point) => point.cumulative_portfolio_return_pct ?? 0);
  const benchmarkSeries = points.map((point) => point.cumulative_benchmark_return_pct ?? 0);
  const hasBenchmark = points.some(
    (point) =>
      point.benchmark_return_pct !== null || point.cumulative_benchmark_return_pct !== null
  );
  const allSeries = [...portfolioSeries, ...(hasBenchmark ? benchmarkSeries : [])];
  const min = Math.min(0, ...allSeries);
  const max = Math.max(0, ...allSeries);
  const range = max - min || 1;
  const portfolioPath = buildLinePath(portfolioSeries, width, height, min, max);
  const benchmarkPath = hasBenchmark
    ? buildLinePath(benchmarkSeries, width, height, min, max)
    : "";
  const areaPath = buildAreaPath(portfolioPath, width, height);
  const latest = points.at(-1);
  const latestValue = latest?.portfolio_return_pct ?? summary.portfolio_return_pct;
  const highestValue = points.length
    ? Math.max(...points.map((point) => point.portfolio_return_pct ?? Number.NEGATIVE_INFINITY))
    : summary.portfolio_return_pct;
  const lowestValue = points.length
    ? Math.min(...points.map((point) => point.portfolio_return_pct ?? Number.POSITIVE_INFINITY))
    : summary.portfolio_return_pct;
  const barRows = buildBarLayout(points);
  const zeroLineY = height - ((0 - min) / range) * height;
  const gridValues = Array.from({ length: 5 }, (_, index) => max - (range / 4) * index);

  return (
    <Panel id={id} className="performance-chart-stage">
      <div className="performance-chart-toolbar">
        <div className="performance-chart-toolbar-left">
          <div className="performance-section-heading performance-chart-stage-heading">
            <h3>{title}</h3>
            <span>{formatLabel(chartFrequency)}</span>
          </div>
          <div className="performance-chart-inline-controls">
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
          </div>
        </div>
        <div className="performance-chart-toolbar-right">
          <div className="performance-chart-chip performance-chart-chip-portfolio">
            <span>Portfolio</span>
            <strong>{formatPct(summary.portfolio_return_pct)}</strong>
          </div>
          <div className="performance-chart-chip performance-chart-chip-benchmark">
            <span>Benchmark</span>
            <strong>{hasBenchmark ? formatPct(summary.benchmark_return_pct) : "N/A"}</strong>
          </div>
          <div className="performance-chart-chip performance-chart-chip-active">
            <span>Active</span>
            <strong>{hasBenchmark ? formatPct(summary.active_return_pct) : "N/A"}</strong>
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

          <div className="performance-chart-canvas-wrap">
            <div className="performance-chart-axis">
              {gridValues.map((value) => (
                <span key={value}>{formatCompactPct(value)}</span>
              ))}
            </div>
            <svg
              className="performance-chart-canvas"
              viewBox={`0 0 ${width} ${height}`}
              role="img"
              aria-label={`${title} chart`}
            >
              {gridValues.map((value) => {
                const y = height - ((value - min) / range) * height;
                return (
                  <path
                    key={value}
                    className="performance-chart-grid-line"
                    d={`M0 ${y.toFixed(2)} H${width}`}
                  />
                );
              })}
              <path
                className="performance-chart-zero-line"
                d={`M0 ${clamp(zeroLineY, 0, height).toFixed(2)} H${width}`}
              />
              {areaPath ? <path className="performance-chart-area" d={areaPath} /> : null}
              {benchmarkPath ? <path className="performance-chart-line-benchmark" d={benchmarkPath} /> : null}
              {portfolioPath ? <path className="performance-chart-line-portfolio" d={portfolioPath} /> : null}
            </svg>
          </div>

          <div className="performance-chart-legend performance-chart-legend-strong">
            <span className="performance-chart-legend-item performance-chart-legend-item-portfolio">
              Portfolio
            </span>
            <span className="performance-chart-legend-item performance-chart-legend-item-benchmark">
              Benchmark
            </span>
          </div>

          <div className="performance-return-bars">
            {barRows.map((row) => (
              <div key={row.label} className="performance-return-bar-group">
                <div className="performance-return-bar-stack">
                  <div
                    className={`performance-return-bar performance-return-bar-portfolio ${
                      row.portfolio < 0 ? "performance-return-bar-negative" : ""
                    }`}
                    style={{ height: `${row.portfolioHeight}%` }}
                    title={`Portfolio ${formatPct(row.portfolio)}`}
                  />
                  <div
                    className={`performance-return-bar performance-return-bar-benchmark ${
                      row.benchmark < 0 ? "performance-return-bar-negative" : ""
                    }`}
                    style={{ height: `${row.benchmarkHeight}%` }}
                    title={`Benchmark ${formatPct(row.benchmark)}`}
                  />
                </div>
                <span>{row.label}</span>
              </div>
            ))}
          </div>
        </>
      ) : (
        <p className="muted">Performance breakdown is not available for the selected period.</p>
      )}
    </Panel>
  );
}
