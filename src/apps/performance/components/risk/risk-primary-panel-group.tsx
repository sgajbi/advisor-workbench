import type { ReactNode } from "react";

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
      <div className="performance-risk-primary-group-header">
        <div className="performance-risk-primary-group-copy">
          <span className="ui-text ui-text-eyebrow">Front-line risk review</span>
          <span className="ui-text ui-text-secondary">
            Snapshot, drawdown, and concentration define the current portfolio risk posture before
            deeper analytics are reviewed.
          </span>
        </div>
      </div>
      <div className="performance-risk-primary-feature">{snapshot}</div>
      <div className="performance-risk-primary-grid">
        <div className="performance-risk-primary-grid-item">{drawdown}</div>
        <div className="performance-risk-primary-grid-item">{concentration}</div>
      </div>
    </section>
  );
}
