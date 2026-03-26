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

export default function PerformanceChartPanel({
  title,
  points,
  tone,
}: {
  title: string;
  points: PerformanceChartPoint[];
  tone: "net" | "gross";
}) {
  const portfolioSeries = points.map((point) => point.cumulative_portfolio_return_pct ?? 0);
  const benchmarkSeries = points.map((point) => point.cumulative_benchmark_return_pct ?? 0);
  const portfolioPath = buildChartPath(portfolioSeries);
  const benchmarkPath = buildChartPath(benchmarkSeries);

  return (
    <Panel className="performance-chart-panel">
      <div className="performance-section-heading">
        <h3>{title}</h3>
        <span>{points.length ? formatLabel(points[0].frequency) : "No series"}</span>
      </div>
      {points.length ? (
        <>
          <div className="performance-chart-frame">
            <svg
              className={`performance-chart performance-chart-${tone}`}
              viewBox="0 0 320 120"
              role="img"
              aria-label={`${title} chart`}
            >
              <path className="performance-chart-track" d="M0 110 H320" />
              {benchmarkPath ? <path className="performance-chart-benchmark" d={benchmarkPath} /> : null}
              {portfolioPath ? <path className="performance-chart-portfolio" d={portfolioPath} /> : null}
            </svg>
          </div>
          <div className="performance-chart-legend">
            <span>Portfolio</span>
            <span>Benchmark</span>
          </div>
          <div className="table-wrap">
            <table className="position-table">
              <thead>
                <tr>
                  <th align="left">Period</th>
                  <th align="right">Portfolio</th>
                  <th align="right">Benchmark</th>
                  <th align="right">Active</th>
                  <th align="right">Cum. Portfolio</th>
                </tr>
              </thead>
              <tbody>
                {points.map((point) => (
                  <tr key={`${point.label}-${point.period_end ?? point.period_start ?? point.frequency}`}>
                    <td>{point.label}</td>
                    <td align="right">{formatPct(point.portfolio_return_pct)}</td>
                    <td align="right">{formatPct(point.benchmark_return_pct)}</td>
                    <td align="right">{formatPct(point.active_return_pct)}</td>
                    <td align="right">{formatCompactPct(point.cumulative_portfolio_return_pct)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      ) : (
        <p className="muted">Performance breakdown is not available for the selected period.</p>
      )}
    </Panel>
  );
}
