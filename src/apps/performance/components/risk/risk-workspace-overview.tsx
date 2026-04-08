import { SemanticBadge, Text } from "@/design-system";

import type { PerformanceRiskOverviewItem } from "../../risk-workspace-view-model";

export default function RiskWorkspaceOverview({
  items,
}: {
  items: PerformanceRiskOverviewItem[];
}) {
  if (!items.length) {
    return null;
  }

  return (
    <section className="performance-risk-overview" aria-label="Risk overview">
      {items.map((item) => (
        <article key={item.key} className="performance-risk-overview-card">
          <div className="performance-risk-overview-header">
            <Text variant="label">{item.label}</Text>
            <SemanticBadge tone={item.tone}>{item.value}</SemanticBadge>
          </div>
          <Text variant="secondary" className="performance-risk-overview-support">
            {item.support}
          </Text>
        </article>
      ))}
    </section>
  );
}
