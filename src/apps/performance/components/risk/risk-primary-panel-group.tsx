import type { ReactNode } from "react";
import PerformanceSectionHeading from "../performance-section-heading";

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
    <section className="performance-risk-primary-group" aria-label="Primary risk review">
      <PerformanceSectionHeading
        className="performance-risk-primary-group-header"
        kicker="Primary review"
        title="Posture, drawdown, and concentration"
        description="Lead with current posture, downside path, and concentration."
      />
      <div className="performance-risk-primary-feature">{snapshot}</div>
      <div className="performance-risk-primary-grid">
        <div className="performance-risk-primary-grid-item">{drawdown}</div>
        <div className="performance-risk-primary-grid-item">{concentration}</div>
      </div>
    </section>
  );
}
