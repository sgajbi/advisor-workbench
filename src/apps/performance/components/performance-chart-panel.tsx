import { Panel } from "@/design-system";
import type { PerformanceChartPoint } from "@/features/workbench/types";

import { formatCompactPct, formatLabel, formatPct } from "../formatters";

function buildChartPath(points: number[]): string {
  if (points.length === 0) {
    return "";
  }
  const width = 320;
  const height = 120;
  const max = Math.max(...points);
  const min = Math.min(...points);
  const range = max - min || 1;

  return points
    .map((point, index) => {
      const x = (index / Math.max(points.length - 1, 1)) * width;
      const y = height - ((point - min) / range) * height;
      return `${index === 0 ? "M" : "L"}${x.toFixed(2)} ${y.toFixed(2)}`;
    })
    .join(" ");
}

function buildAreaPath(path: string): string {
  if (!path) {
    return "";
  }
  return `${path} L320 120 L0 120 Z`;
}

export default function PerformanceChartPanel({
  title,
  points,
  tone,
  id,
}: {
  title: string;
  points: PerformanceChartPoint[];
  tone: "net" | "gross";
  id?: string;
}) {
  const portfolioSeries = points.map((point) => point.cumulative_portfolio_return_pct ?? 0);
  const hasBenchmark = points.some(
    (point) =>
      point.benchmark_return_pct !== null || point.cumulative_benchmark_return_pct !== null
  );
  const hasActiveReturn = points.some((point) => point.active_return_pct !== null);
  const benchmarkSeries = points.map((point) => point.cumulative_benchmark_return_pct ?? 0);
  const portfolioPath = buildChartPath(portfolioSeries);
  const portfolioArea = buildAreaPath(portfolioPath);
  const benchmarkPath = hasBenchmark ? buildChartPath(benchmarkSeries) : "";
  const latestPoint = points[points.length - 1];
  const highestPoint = portfolioSeries.length ? Math.max(...portfolioSeries) : null;
  const lowestPoint = portfolioSeries.length ? Math.min(...portfolioSeries) : null;
  const hasMeaningfulHistory = points.length >= 2;
  const gridLines = [20, 50, 80, 110];

  return (
    <Panel id={id} className="performance-chart-panel">
      <div className="performance-section-heading">
        <h3>{title}</h3>
        <span>{points.length ? formatLabel(points[0].frequency) : "No series"}</span>
      </div>
      {points.length ? (
        <>
          <div className="performance-chart-summary">
            <div>
              <span>Latest</span>
              <strong>{formatPct(latestPoint?.cumulative_portfolio_return_pct)}</strong>
            </div>
            <div>
              <span>High</span>
              <strong>{formatPct(highestPoint)}</strong>
            </div>
            <div>
              <span>Low</span>
              <strong>{formatPct(lowestPoint)}</strong>
            </div>
            <div>
              <span>Observations</span>
              <strong>{points.length}</strong>
            </div>
          </div>
          <div className="performance-chart-frame">
            <svg
              className={`performance-chart performance-chart-${tone}`}
              viewBox="0 0 320 120"
              role="img"
              aria-label={`${title} chart`}
            >
              {gridLines.map((line) => (
                <path key={line} className="performance-chart-track" d={`M0 ${line} H320`} />
              ))}
              {portfolioArea ? <path className="performance-chart-fill" d={portfolioArea} /> : null}
              {benchmarkPath ? <path className="performance-chart-benchmark" d={benchmarkPath} /> : null}
              {portfolioPath ? <path className="performance-chart-portfolio" d={portfolioPath} /> : null}
              {portfolioPath && latestPoint ? (
                <circle
                  className="performance-chart-marker"
                  cx="320"
                  cy={(() => {
                    const max = Math.max(...portfolioSeries);
                    const min = Math.min(...portfolioSeries);
                    const range = max - min || 1;
                    return 120 - (((latestPoint.cumulative_portfolio_return_pct ?? 0) - min) / range) * 120;
                  })()}
                  r="4"
                />
              ) : null}
            </svg>
          </div>
          <div className="performance-chart-legend">
            <span>Portfolio</span>
            {hasBenchmark ? <span>Benchmark</span> : null}
          </div>
          {hasMeaningfulHistory ? (
            <div className="table-wrap">
              <table className="position-table">
                <thead>
                  <tr>
                    <th align="left">Period</th>
                    <th align="right">Portfolio</th>
                    {hasBenchmark ? <th align="right">Benchmark</th> : null}
                    {hasActiveReturn ? <th align="right">Active</th> : null}
                    <th align="right">Cum. Portfolio</th>
                  </tr>
                </thead>
                <tbody>
                  {points.map((point) => (
                    <tr key={`${point.label}-${point.period_end ?? point.period_start ?? point.frequency}`}>
                      <td>{point.label}</td>
                      <td align="right">{formatPct(point.portfolio_return_pct)}</td>
                      {hasBenchmark ? (
                        <td align="right">{formatPct(point.benchmark_return_pct)}</td>
                      ) : null}
                      {hasActiveReturn ? (
                        <td align="right">{formatPct(point.active_return_pct)}</td>
                      ) : null}
                      <td align="right">{formatCompactPct(point.cumulative_portfolio_return_pct)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="muted performance-chart-note">
              Only one measurement is currently available for this view, so trend comparison is limited.
            </p>
          )}
        </>
      ) : (
        <p className="muted">Performance breakdown is not available for the selected period.</p>
      )}
    </Panel>
  );
}
