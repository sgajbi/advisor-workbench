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
          <span className="performance-risk-zone-kicker">Primary review</span>
          <h2>Risk posture, drawdown, and concentration</h2>
        </div>
        <p>
          Volatility, downside recovery, and mandate concentration are grouped as the first
          risk decision surface.
        </p>
      </div>
      <div className="performance-risk-primary-feature">{snapshot}</div>
      <div className="performance-risk-primary-grid">
        <div className="performance-risk-primary-grid-item">{drawdown}</div>
        <div className="performance-risk-primary-grid-item">{concentration}</div>
      </div>
    </section>
  );
}
