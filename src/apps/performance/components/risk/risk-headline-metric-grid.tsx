import RiskMetricCard from "./risk-metric-card";

type RiskHeadlineMetric = {
  key: string;
  label: string;
  value: string;
  support: string;
  metadata?: string;
  definition?: string;
  state?:
    | "loading"
    | "ready"
    | "partial"
    | "empty"
    | "permission_blocked"
    | "unavailable"
    | "error";
};

export default function RiskHeadlineMetricGrid({
  ariaLabel,
  metrics,
  className,
  itemClassName,
  supportMode = "full",
  metadataMode = "hidden",
}: {
  ariaLabel: string;
  metrics: RiskHeadlineMetric[];
  className?: string;
  itemClassName?: string;
  supportMode?: "full" | "hidden";
  metadataMode?: "full" | "hidden";
}) {
  if (!metrics.length) {
    return null;
  }

  return (
    <section className="performance-risk-headline-section" aria-label={ariaLabel}>
      <div className={["performance-risk-metric-strip", className].filter(Boolean).join(" ")}>
        {metrics.map((metric) => (
          <RiskMetricCard
            key={metric.key}
            label={metric.label}
            value={metric.value}
            support={metric.support}
            metadata={metric.metadata}
            definition={metric.definition}
            density="compact"
            className={itemClassName}
            displaySupport={supportMode === "full"}
            displayMetadata={metadataMode === "full"}
            ariaLabel={`${metric.label}: ${metric.value}.${metric.definition ? ` ${metric.definition}` : ""}`}
            title={metric.definition}
          />
        ))}
      </div>
    </section>
  );
}
