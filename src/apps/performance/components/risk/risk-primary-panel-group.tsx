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
      <div className="performance-risk-primary-feature">{snapshot}</div>
      <div className="performance-risk-primary-grid">
        <div className="performance-risk-primary-grid-item">{drawdown}</div>
        <div className="performance-risk-primary-grid-item">{concentration}</div>
      </div>
    </section>
  );
}
