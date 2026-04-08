import { SemanticBadge, Text } from "@/design-system";

import type {
  PerformanceRiskOverviewItem,
  PerformanceRiskWhatMattersItem,
} from "../../risk-workspace-view-model";

export default function RiskExecutiveOverview({
  overview,
  mattersNow,
}: {
  overview: PerformanceRiskOverviewItem[];
  mattersNow: PerformanceRiskWhatMattersItem[];
}) {
  if (!overview.length && !mattersNow.length) {
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
              <Text variant="eyebrow">Risk executive overview</Text>
              <SemanticBadge tone={primary.tone} emphasis="strong">
                {primary.value}
              </SemanticBadge>
            </div>
            <div className="performance-risk-executive-primary-copy">
              <Text variant="pageTitle" as="h2" className="performance-risk-executive-primary-title">
                {primary.label}
              </Text>
              <Text variant="body" className="performance-risk-executive-primary-support">
                {primary.support}
              </Text>
            </div>
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
                  <Text
                    variant="secondary"
                    className="performance-risk-executive-secondary-support"
                  >
                    {item.support}
                  </Text>
                </article>
              ))}
            </div>
          </div>
        ) : null}
      </div>

      {mattersNow.length ? (
        <section className="performance-risk-matters" aria-label="What matters now">
          <div className="performance-risk-matters-header">
            <Text variant="cardTitle" className="performance-risk-section-title">
              What matters now
            </Text>
            <Text variant="metadata">Cross-panel front-office reading</Text>
          </div>
          <div className="performance-risk-matters-list">
            {mattersNow.map((item, index) => (
              <div key={item.key} className="performance-risk-matters-item">
                <Text variant="eyebrow" className="performance-risk-matters-index">
                  {String(index + 1).padStart(2, "0")}
                </Text>
                <div className="performance-risk-matters-copy">
                  <Text variant="label">{item.title}</Text>
                  <Text variant="body">{item.body}</Text>
                </div>
              </div>
            ))}
          </div>
        </section>
      ) : null}
    </section>
  );
}
