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
  detailMode = "full",
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
  detailMode?: "full" | "hidden";
}) {
  return (
    <section
      className={[
        "performance-risk-briefing-card",
        density === "compact" ? "performance-risk-briefing-card-compact" : "",
        detailMode === "hidden" ? "performance-risk-briefing-card-headline-only" : "",
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
      {detailMode === "full" ? <Text variant="secondary">{summary.detail}</Text> : null}
      {summary.actionCue ? (
        <Text variant="metadata" className="performance-risk-briefing-cue">
          Next: {summary.actionCue}
        </Text>
      ) : null}
    </section>
  );
}
