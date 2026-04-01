type PerformanceSummaryMetricCardProps = {
  label: string;
  value: string | number;
  support?: string;
  emphasize?: boolean;
  unavailable?: boolean;
  priority?: "primary" | "comparison" | "supporting" | "utility";
  className?: string;
};

export default function PerformanceSummaryMetricCard({
  label,
  value,
  support,
  emphasize = false,
  unavailable = false,
  priority = "supporting",
  className = "",
}: PerformanceSummaryMetricCardProps) {
  return (
    <div
      className={[
        "performance-summary-kpi-card",
        "workbench-summary-metric-card",
        emphasize ? "performance-summary-kpi-card-primary" : "",
        unavailable ? "performance-summary-kpi-card-unavailable" : "",
        `performance-summary-kpi-card-${priority}`,
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <span className="performance-summary-kpi-label workbench-summary-metric-label">{label}</span>
      <strong className="performance-summary-kpi-value workbench-summary-metric-value">{value}</strong>
      {support ? (
        <span className="performance-summary-kpi-support workbench-summary-metric-support">{support}</span>
      ) : null}
    </div>
  );
}
