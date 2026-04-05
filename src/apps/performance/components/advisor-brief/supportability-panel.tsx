import { Panel } from "@/design-system";

import type { PerformanceAdvisorBriefSupportabilityItem } from "../../advisor-brief-view-model";

export default function SupportabilityPanel({
  items,
}: {
  items: PerformanceAdvisorBriefSupportabilityItem[];
}) {
  return (
    <Panel className="performance-advisor-brief-supportability-panel">
      <div className="performance-advisor-brief-section-heading">
        <p className="performance-advisor-brief-eyebrow">Supportability</p>
        <h3 className="performance-advisor-brief-rail-heading">
          Source readiness and brief coverage
        </h3>
      </div>
      <div
        className="performance-advisor-brief-supportability-grid"
        aria-label="Advisor brief supportability"
      >
        {items.map((item) => (
          <div key={item.label} className="performance-advisor-brief-supportability-row">
            <span className="performance-advisor-brief-supportability-label">{item.label}</span>
            <span
              className={`performance-advisor-brief-supportability-state performance-advisor-brief-supportability-state-${item.tone}`}
            >
              <span
                aria-hidden="true"
                className="performance-advisor-brief-supportability-dot"
              />
              {item.value}
            </span>
          </div>
        ))}
      </div>
    </Panel>
  );
}
