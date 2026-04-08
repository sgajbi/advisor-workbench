import { SemanticBadge, Text } from "@/design-system";

import type {
  PerformanceRiskConcentrationExecutiveSummary,
  PerformanceRiskExecutiveSummary,
} from "../../risk-workspace-view-model";

export default function RiskExecutiveSummary({
  summary,
  ariaLabel,
  postureTone,
  density = "default",
}: {
  summary:
    | PerformanceRiskExecutiveSummary
    | (Omit<PerformanceRiskConcentrationExecutiveSummary, "postureState"> & {
        headline: string;
        detail: string;
      });
  ariaLabel: string;
  postureTone?: "success" | "default" | "warn" | "danger";
  density?: "default" | "compact";
}) {
  return (
    <section
      className={[
        "performance-risk-briefing-card",
        density === "compact" ? "performance-risk-briefing-card-compact" : "",
      ]
        .filter(Boolean)
        .join(" ")}
      aria-label={ariaLabel}
    >
      <div className="performance-risk-section-header">
        <Text variant="cardTitle" className="performance-risk-section-title">
          {summary.heading}
        </Text>
        {summary.postureLabel ? (
          <SemanticBadge
            tone={postureTone ?? "default"}
            emphasis="strong"
            className="performance-risk-briefing-badge"
          >
            {summary.postureLabel}
          </SemanticBadge>
        ) : null}
      </div>
      <Text variant="metricValueCompact" className="performance-risk-briefing-headline">
        {summary.headline}
      </Text>
      <Text variant="secondary">{summary.detail}</Text>
      {summary.actionCue ? (
        <Text variant="metadata" className="performance-risk-briefing-cue">
          Next: {summary.actionCue}
        </Text>
      ) : null}
    </section>
  );
}
