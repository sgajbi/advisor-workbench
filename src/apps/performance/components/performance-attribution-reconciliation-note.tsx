import type { AttributionSummaryView } from "@/features/workbench/types";

import { getAttributionReconciliationText } from "./performance-attribution-presentations";

export default function PerformanceAttributionReconciliationNote({
  attribution,
  className = "performance-analysis-summary-fallback-copy",
}: {
  attribution: AttributionSummaryView;
  className?: string;
}) {
  const reconciliation = getAttributionReconciliationText(attribution);

  return (
    <div className={className} role="note">
      <strong>{reconciliation.headline}</strong>
      <span>{reconciliation.detail}</span>
    </div>
  );
}
