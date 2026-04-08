import { WorkbenchSummaryMetricStrip } from "@/design-system";

type RiskHeadlineMetric = {
  key: string;
  label: string;
  value: string;
  support: string;
  state?: "loading" | "ready" | "partial" | "empty" | "unavailable" | "error";
};

export default function RiskHeadlineMetricGrid({
  ariaLabel,
  metrics,
  className,
  itemClassName,
}: {
  ariaLabel: string;
  metrics: RiskHeadlineMetric[];
  className?: string;
  itemClassName?: string;
}) {
  if (!metrics.length) {
    return null;
  }

  return (
    <section className="performance-risk-headline-section">
      <WorkbenchSummaryMetricStrip
        ariaLabel={ariaLabel}
        className={["performance-risk-metric-strip", className].filter(Boolean).join(" ")}
        itemClassName={itemClassName}
        items={metrics.map((metric) => ({
          key: metric.key,
          label: metric.label,
          value: metric.value,
          support: metric.support,
          unavailable: metric.state === "unavailable",
        }))}
      />
    </section>
  );
}
