import { Text } from "@/design-system";

import type { PerformanceRiskWhatMattersItem } from "../../risk-workspace-view-model";

export default function RiskWhatMattersNow({
  items,
}: {
  items: PerformanceRiskWhatMattersItem[];
}) {
  if (!items.length) {
    return null;
  }

  return (
    <section className="performance-risk-matters" aria-label="What matters now">
      <div className="performance-risk-section-header">
        <Text variant="cardTitle" className="performance-risk-section-title">
          What matters now
        </Text>
      </div>
      <div className="performance-risk-matters-list">
        {items.map((item) => (
          <div key={item.key} className="performance-risk-matters-item">
            <Text variant="label">{item.title}</Text>
            <Text variant="body">{item.body}</Text>
          </div>
        ))}
      </div>
    </section>
  );
}
