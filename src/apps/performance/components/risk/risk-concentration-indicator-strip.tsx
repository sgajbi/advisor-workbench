import { WorkbenchSummaryMetricStrip } from "@/design-system";

import type { PerformanceRiskConcentrationIndicator } from "../../risk-workspace-view-model";

export default function RiskConcentrationIndicatorStrip({
  indicators,
}: {
  indicators: PerformanceRiskConcentrationIndicator[];
}) {
  return (
    <section aria-label="Risk concentration indicator strip">
      <WorkbenchSummaryMetricStrip
        ariaLabel="Risk concentration headline metrics"
        className="performance-risk-metric-strip performance-risk-concentration-metric-strip"
        items={indicators.map((indicator) => ({
          key: indicator.key,
          label: indicator.label,
          value: indicator.value,
          support: indicator.support,
          definition: indicator.definition,
          className:
            indicator.tone === "danger"
              ? "performance-risk-concentration-indicator-danger"
              : indicator.tone === "warn"
                ? "performance-risk-concentration-indicator-warn"
                : undefined,
        }))}
      />
    </section>
  );
}
