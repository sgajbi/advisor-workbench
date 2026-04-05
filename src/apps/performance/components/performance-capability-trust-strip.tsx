import { WorkbenchStatusStrip } from "@/design-system";

import type { PerformanceTrustStripPresentation } from "./performance-workspace-view-helpers";

export default function PerformanceCapabilityTrustStrip({
  presentation,
}: {
  presentation: PerformanceTrustStripPresentation;
}) {
  return (
    <WorkbenchStatusStrip
      label="Trust and completeness strip"
      items={presentation.items}
      className="performance-trust-strip performance-lotus-trust-strip workbench-summary-panel workbench-summary-card workbench-summary-card-compact workbench-summary-module-card"
      gridClassName="performance-trust-strip-grid"
      itemClassName="performance-trust-item"
      itemLabelClassName="performance-trust-item-label"
      itemBodyClassName="performance-trust-item-body"
      itemChipClassName="performance-trust-item-chip"
      itemSupportClassName="performance-trust-item-support"
    />
  );
}
