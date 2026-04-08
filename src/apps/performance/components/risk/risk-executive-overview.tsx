import { SemanticBadge, Text } from "@/design-system";

import type { PerformanceRiskOverviewItem } from "../../risk-workspace-view-model";

export default function RiskExecutiveOverview({
  overview,
}: {
  overview: PerformanceRiskOverviewItem[];
}) {
  if (!overview.length) {
    return null;
  }

  const primary = overview[0] ?? null;
  const secondary = overview.slice(1);

  return (
    <section className="performance-risk-executive" aria-label="Risk executive overview">
      <div className="performance-risk-executive-band">
        {primary ? (
          <article className="performance-risk-executive-primary">
            <div className="performance-risk-executive-primary-header">
              <Text variant="label">{primary.label}</Text>
              <SemanticBadge tone={primary.tone} emphasis="strong">
                {primary.value}
              </SemanticBadge>
            </div>
            <Text variant="pageTitle" as="h2" className="performance-risk-executive-primary-title">
              {primary.value}
            </Text>
          </article>
        ) : null}

        {secondary.length ? (
          <div className="performance-risk-executive-side">
            <div className="performance-risk-executive-secondary">
              {secondary.map((item) => (
                <article key={item.key} className="performance-risk-executive-secondary-card">
                  <div className="performance-risk-executive-secondary-header">
                    <Text variant="label">{item.label}</Text>
                    <SemanticBadge tone={item.tone}>{item.value}</SemanticBadge>
                  </div>
                </article>
              ))}
            </div>
          </div>
        ) : null}
      </div>
    </section>
  );
}
