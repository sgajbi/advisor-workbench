export type PerformanceReturnPathLegendItem = {
  key: string;
  label: string;
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
        <div
          key={item.key}
          className={`performance-chart-legend-item ${item.className}`}
        >
          <span className="performance-chart-legend-label">{item.label}</span>
        </div>
      ))}
    </div>
  );
}
