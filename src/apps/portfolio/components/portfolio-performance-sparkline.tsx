"use client";

type PortfolioPerformanceSparklinePoint = {
  label: string;
  portfolio_return_pct: number | null;
  benchmark_return_pct?: number | null;
  active_return_pct?: number | null;
};

export default function PortfolioPerformanceSparkline({
  points,
  benchmarkLabel,
}: {
  points: PortfolioPerformanceSparklinePoint[];
  benchmarkLabel?: string | null;
}) {
  const portfolioSeries = toSeries(points, "portfolio_return_pct");
  const benchmarkSeries = toSeries(points, "benchmark_return_pct");
  const activeSeries = toSeries(points, "active_return_pct");
  const series = [
    {
      key: "portfolio",
      label: "Portfolio",
      className: "portfolio-performance-sparkline-line",
      points: portfolioSeries,
    },
    {
      key: "benchmark",
      label: benchmarkLabel ?? "Benchmark",
      className: "portfolio-performance-sparkline-line portfolio-performance-sparkline-line-benchmark",
      points: benchmarkSeries,
    },
    {
      key: "active",
      label: "Active",
      className: "portfolio-performance-sparkline-line portfolio-performance-sparkline-line-active",
      points: activeSeries,
    },
  ].filter((entry) => entry.points.length >= 2);

  if (!series.some((entry) => entry.key === "portfolio")) {
    return null;
  }

  const values = series.flatMap((entry) => entry.points.map((point) => point.value));
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const width = 180;
  const height = 52;
  const zeroLineY = height - ((0 - min) / range) * height;

  return (
    <figure className="portfolio-performance-sparkline" aria-label="Performance snapshot trend">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        role="img"
        aria-label="Performance snapshot comparison sparkline"
        focusable="false"
      >
        {zeroLineY >= 0 && zeroLineY <= height ? (
          <line
            className="portfolio-performance-sparkline-baseline"
            x1="0"
            y1={zeroLineY}
            x2={width}
            y2={zeroLineY}
          />
        ) : null}
        {series.map((entry) => (
          <path
            key={entry.key}
            className={entry.className}
            d={buildPath(entry.points, width, height, min, range)}
          />
        ))}
      </svg>
      <div className="portfolio-performance-sparkline-legend" aria-label="Performance snapshot trend legend">
        {series.map((entry) => (
          <span key={entry.key} className="portfolio-performance-sparkline-legend-item">
            <span
              className={`portfolio-performance-sparkline-swatch portfolio-performance-sparkline-swatch-${entry.key}`}
              aria-hidden="true"
            />
            <span>{entry.label}</span>
          </span>
        ))}
      </div>
      <figcaption className="portfolio-performance-sparkline-copy">
        {points[0]?.label} to {points[points.length - 1]?.label}
      </figcaption>
    </figure>
  );
}

type SeriesPoint = {
  index: number;
  value: number;
};

function toSeries(
  points: PortfolioPerformanceSparklinePoint[],
  field: "portfolio_return_pct" | "benchmark_return_pct" | "active_return_pct"
) {
  return points
    .map((point, index) =>
      typeof point[field] === "number" ? { index, value: point[field] as number } : null
    )
    .filter((point): point is SeriesPoint => point !== null);
}

function buildPath(
  points: SeriesPoint[],
  width: number,
  height: number,
  min: number,
  range: number
) {
  return points
    .map((point, sequence) => {
      const x = points.length === 1 ? width / 2 : (sequence / (points.length - 1)) * width;
      const y = height - ((point.value - min) / range) * height;
      return `${sequence === 0 ? "M" : "L"} ${x.toFixed(2)} ${y.toFixed(2)}`;
    })
    .join(" ");
}
