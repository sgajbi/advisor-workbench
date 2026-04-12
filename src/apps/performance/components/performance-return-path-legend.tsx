export type PerformanceReturnPathLegendItem = {
  key: string;
  label: string;
  value: string;
  className: string;
};

export default function PerformanceReturnPathLegend({
  items,
}: {
  items: PerformanceReturnPathLegendItem[];
}) {
  return (
    <div className="performance-chart-legend" aria-label="Return path legend">
      {items.map((item) => (
        <span
          key={item.key}
          className={`performance-chart-legend-item ${item.className}`}
        >
          <span className="performance-chart-legend-label">{item.label}</span>
          <strong className="performance-chart-legend-value">{item.value}</strong>
        </span>
      ))}
    </div>
  );
}
