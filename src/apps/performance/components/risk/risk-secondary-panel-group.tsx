import type { ReactNode } from "react";
import PerformanceSectionHeading from "../performance-section-heading";

export default function RiskSecondaryPanelGroup({
  rolling,
  attribution,
}: {
  rolling: ReactNode;
  attribution: ReactNode;
}) {
  return (
    <section className="performance-risk-secondary-group" aria-label="Secondary risk analysis">
      <PerformanceSectionHeading
        className="performance-risk-secondary-group-header"
        kicker="Stability and attribution"
        title="Rolling stability and contributors"
        description="Use rolling stability and attribution after the primary posture is understood."
      />
      <div className="performance-risk-secondary-workspace performance-risk-secondary-workspace-equal">
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
