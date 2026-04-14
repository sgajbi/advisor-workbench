import { Text } from "@/design-system";

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
      <Text
        as="span"
        variant="dataLabel"
        className="performance-summary-kpi-label workbench-summary-metric-label"
      >
        {label}
      </Text>
      <Text
        as="strong"
        variant={emphasize ? "metricValueXL" : priority === "comparison" ? "metricValueL" : "metricValueM"}
        className="performance-summary-kpi-value workbench-summary-metric-value"
      >
        {value}
      </Text>
      {support ? (
        <Text
          as="span"
          variant={priority === "primary" ? "helperText" : "bodySmall"}
          className="performance-summary-kpi-support workbench-summary-metric-support"
        >
          {support}
        </Text>
      ) : null}
    </div>
  );
}
