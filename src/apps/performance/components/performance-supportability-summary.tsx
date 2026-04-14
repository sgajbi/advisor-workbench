import { Text } from "@/design-system";

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
          <Text as="span" variant="bodySmall" className="performance-supportability-summary-label">
            {item.label}
          </Text>
          <Text as="strong" variant="metricValueM">
            {item.value}
          </Text>
        </div>
      ))}
    </div>
  );
}
