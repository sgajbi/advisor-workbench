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
          <span className="ui-text ui-text-eyebrow">Analytical follow-through</span>
          <span className="ui-text ui-text-secondary">
            Rolling behaviour and attribution stay available as drill-down review after the current
            book, path, and concentration posture are understood.
          </span>
        </div>
      </div>
      <div className="performance-risk-secondary-grid">
        <div className="performance-risk-secondary-grid-item performance-risk-secondary-grid-item-rolling">
          <div className="performance-risk-secondary-panel-slot performance-risk-secondary-panel-slot-rolling">
            {rolling}
          </div>
        </div>
        <div className="performance-risk-secondary-grid-item performance-risk-secondary-grid-item-attribution">
          <div className="performance-risk-secondary-panel-slot performance-risk-secondary-panel-slot-attribution">
            {attribution}
          </div>
        </div>
      </div>
    </section>
  );
}
