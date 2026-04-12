import type { ReactNode } from "react";

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
          <span className="performance-risk-zone-kicker">Stability and attribution</span>
          <h2>Rolling risk and source-backed contributors</h2>
        </div>
        <p>
          Window stability and attribution evidence remain subordinate to the primary risk
          posture while staying ready for drilldown.
        </p>
      </div>
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
