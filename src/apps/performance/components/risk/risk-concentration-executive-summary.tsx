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
        <Text variant="cardTitle">Business reading</Text>
        <SemanticBadge tone={POSTURE_TONE[summary.postureState]}>{summary.postureLabel}</SemanticBadge>
      </div>
      <Text variant="body">{summary.summary}</Text>
      {summary.actionCue ? (
        <Text variant="metadata" className="performance-risk-concentration-action-cue">
          Next: {summary.actionCue}
        </Text>
      ) : null}
    </section>
  );
}
