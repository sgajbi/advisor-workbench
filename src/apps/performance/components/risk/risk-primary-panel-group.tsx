import type { ReactNode } from "react";
import PerformanceWorkspaceSection from "../performance-workspace-section";

export default function RiskPrimaryPanelGroup({
  snapshot,
  drawdown,
  concentration,
}: {
  snapshot: ReactNode;
  drawdown: ReactNode;
  concentration: ReactNode;
}) {
  return (
    <PerformanceWorkspaceSection
      ariaLabel="Primary risk review"
      className="performance-risk-primary-group"
      headingClassName="performance-risk-primary-group-header"
        kicker="Primary review"
        title="Posture, drawdown, and concentration"
        description="Lead with current posture, downside path, and concentration."
    >
      <div className="performance-risk-primary-feature">{snapshot}</div>
      <div className="performance-risk-primary-grid">
        <div className="performance-risk-primary-grid-item">{drawdown}</div>
        <div className="performance-risk-primary-grid-item">{concentration}</div>
      </div>
    </PerformanceWorkspaceSection>
  );
}
