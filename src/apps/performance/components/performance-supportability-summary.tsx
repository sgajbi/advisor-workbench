export default function PerformanceSupportabilitySummary({
  items,
  className,
}: {
  items: Array<{ label: string; value: string | number }>;
  className?: string;
}) {
  const rootClassName = ["performance-supportability-summary", className]
    .filter(Boolean)
    .join(" ");

  return (
    <div className={rootClassName}>
      {items.map((item) => (
        <div key={item.label} className="performance-supportability-summary-card">
          <span className="performance-supportability-summary-label">{item.label}</span>
          <strong>{item.value}</strong>
        </div>
      ))}
    </div>
  );
}
