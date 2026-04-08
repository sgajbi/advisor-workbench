import { Text } from "@/design-system";

import RiskTermLabel from "./risk-term-label";

export default function RiskMetricCard({
  label,
  value,
  support,
  definition,
  tone = "default",
  className,
  ariaLabel,
  title,
}: {
  label: string;
  value: string;
  support: string;
  definition?: string;
  tone?: "default" | "warn" | "danger";
  className?: string;
  ariaLabel?: string;
  title?: string;
}) {
  return (
    <article
      className={[
        "performance-risk-metric-card",
        tone === "warn"
          ? "performance-risk-metric-card-warn"
          : tone === "danger"
            ? "performance-risk-metric-card-danger"
            : "",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      aria-label={ariaLabel ?? `${label}: ${value}. ${support}`}
      title={title}
    >
      <div className="performance-risk-metric-card-copy">
        {definition ? (
          <RiskTermLabel label={label} definition={definition} />
        ) : (
          <Text variant="label">{label}</Text>
        )}
        <Text variant="metadata">{support}</Text>
      </div>
      <Text variant="cardTitle" className="performance-risk-metric-card-value">
        {value}
      </Text>
    </article>
  );
}
