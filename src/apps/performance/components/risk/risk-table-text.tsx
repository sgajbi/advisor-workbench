export default function RiskTableText({
  value,
  title,
  truncate = false,
  clamp = false,
  className,
}: {
  value: string;
  title?: string;
  truncate?: boolean;
  clamp?: boolean;
  className?: string;
}) {
  return (
    <span
      className={[
        "performance-risk-table-text",
        truncate ? "performance-risk-table-text-truncate" : "",
        clamp ? "performance-risk-table-text-clamp" : "",
        className ?? "",
      ]
        .filter(Boolean)
        .join(" ")}
      title={title ?? value}
    >
      {value}
    </span>
  );
}
