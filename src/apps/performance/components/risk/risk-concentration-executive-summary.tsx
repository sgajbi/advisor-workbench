import { SemanticBadge, Text } from "@/design-system";

import type { PerformanceRiskConcentrationExecutiveSummary } from "../../risk-workspace-view-model";

const POSTURE_TONE = {
  acceptable: "success",
  moderate: "default",
  elevated: "warn",
  high: "danger",
  partial: "warn",
} as const;

export default function RiskConcentrationExecutiveSummary({
  summary,
}: {
  summary: PerformanceRiskConcentrationExecutiveSummary;
}) {
  return (
    <section
      className="performance-risk-concentration-executive"
      aria-label="Risk concentration executive summary"
    >
      <div className="performance-risk-concentration-section-header">
        <Text variant="cardTitle" className="performance-risk-concentration-anchor-title">
          {summary.heading}
        </Text>
        <SemanticBadge
          tone={POSTURE_TONE[summary.postureState]}
          emphasis="strong"
          className="performance-risk-concentration-posture-badge"
        >
          {summary.postureLabel}
        </SemanticBadge>
      </div>
      <Text variant="metricValueCompact" className="performance-risk-concentration-briefing-headline">
        {summary.businessReadingHeadline}
      </Text>
      <Text variant="secondary" className="performance-risk-concentration-briefing-detail">
        {summary.businessReadingDetail}
      </Text>
      {summary.actionCue ? (
        <Text variant="metadata" className="performance-risk-concentration-action-cue">
          Next: {summary.actionCue}
        </Text>
      ) : null}
    </section>
  );
}
