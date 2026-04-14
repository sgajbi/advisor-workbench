import type { ReactNode } from "react";
import PerformanceWorkspaceSection from "../performance-workspace-section";

export default function RiskSecondaryPanelGroup({
  rolling,
  attribution,
}: {
  rolling: ReactNode;
  attribution: ReactNode;
}) {
  return (
    <PerformanceWorkspaceSection
      ariaLabel="Secondary risk analysis"
      className="performance-risk-secondary-group"
      headingClassName="performance-risk-secondary-group-header"
        kicker="Stability and attribution"
        title="Rolling stability and contributors"
        description="Use rolling stability and attribution after the primary posture is understood."
    >
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
    </PerformanceWorkspaceSection>
  );
}
