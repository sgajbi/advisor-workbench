import StatusChip from "@/design-system/components/status-chip";

import type { PerformanceTrustStripPresentation } from "./performance-workspace-view-helpers";

export default function PerformanceCapabilityTrustStrip({
  presentation,
}: {
  presentation: PerformanceTrustStripPresentation;
}) {
  return (
    <section
      aria-label="Trust and completeness strip"
      className="performance-trust-strip workbench-summary-panel workbench-summary-card workbench-summary-card-compact workbench-summary-module-card"
    >
      <div className="performance-trust-strip-grid">
        {presentation.items.map((item) => (
          <div key={item.label} className="performance-trust-item">
            <span className="performance-trust-item-label">{item.label}</span>
            <div className="performance-trust-item-body">
              <StatusChip tone={item.tone} className="performance-trust-item-chip">
                {item.value}
              </StatusChip>
              {item.support ? (
                <span className="performance-trust-item-support">{item.support}</span>
              ) : null}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
