"use client";

type PortfolioPerformanceSparklinePoint = {
  label: string;
  return_pct: number | null;
};

export default function PortfolioPerformanceSparkline({
  points,
}: {
  points: PortfolioPerformanceSparklinePoint[];
}) {
  const numericPoints = points
    .map((point, index) =>
      typeof point.return_pct === "number" ? { index, value: point.return_pct } : null
    )
    .filter((point): point is { index: number; value: number } => point !== null);

  if (numericPoints.length < 2) {
    return null;
  }

  const values = numericPoints.map((point) => point.value);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const width = 180;
  const height = 52;

  const path = numericPoints
    .map((point, sequence) => {
      const x =
        numericPoints.length === 1 ? width / 2 : (sequence / (numericPoints.length - 1)) * width;
      const y = height - ((point.value - min) / range) * height;
      return `${sequence === 0 ? "M" : "L"} ${x.toFixed(2)} ${y.toFixed(2)}`;
    })
    .join(" ");

  return (
    <figure className="portfolio-performance-sparkline" aria-label="Performance snapshot trend">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        role="img"
        aria-label="Performance snapshot sparkline"
        focusable="false"
      >
        <path className="portfolio-performance-sparkline-line" d={path} />
      </svg>
      <figcaption className="portfolio-performance-sparkline-copy">
        {points[0]?.label} to {points[points.length - 1]?.label}
      </figcaption>
    </figure>
  );
}
