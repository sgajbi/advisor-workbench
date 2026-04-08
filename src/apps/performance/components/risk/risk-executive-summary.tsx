import { Text } from "@/design-system";

import type { PerformanceRiskExecutiveSummary } from "../../risk-workspace-view-model";

export default function RiskExecutiveSummary({
  summary,
  ariaLabel,
}: {
  summary: PerformanceRiskExecutiveSummary;
  ariaLabel: string;
}) {
  return (
    <section className="performance-risk-briefing-card" aria-label={ariaLabel}>
      <Text variant="cardTitle">{summary.heading}</Text>
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
