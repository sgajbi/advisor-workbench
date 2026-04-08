import type { ReactNode } from "react";

import { riskSecondaryGroupCopy } from "./risk-secondary-copy";

export default function RiskSecondaryPanelGroup({
  rolling,
  attribution,
}: {
  rolling: ReactNode;
  attribution: ReactNode;
}) {
  return (
    <section className="performance-risk-secondary-group" aria-label="Secondary risk analysis">
      <div className="performance-risk-secondary-group-header">
        <div className="performance-risk-secondary-group-copy">
          <span className="ui-text ui-text-eyebrow">{riskSecondaryGroupCopy.eyebrow}</span>
          <span className="ui-text ui-text-secondary">
            {riskSecondaryGroupCopy.subtitle}
          </span>
        </div>
      </div>
      <div className="performance-risk-secondary-workspace">
        <div className="performance-risk-secondary-main performance-risk-secondary-grid-item performance-risk-secondary-grid-item-rolling">
          <div className="performance-risk-secondary-panel-slot performance-risk-secondary-panel-slot-rolling">
            {rolling}
          </div>
        </div>
        <aside className="performance-risk-secondary-sidecar performance-risk-secondary-grid-item performance-risk-secondary-grid-item-attribution">
          <div className="performance-risk-secondary-panel-slot performance-risk-secondary-panel-slot-attribution">
            {attribution}
          </div>
        </aside>
      </div>
    </section>
  );
}
