import PerformanceSummaryMetricCard from "./performance-summary-metric-card";
import type { PerformanceExecutiveReturnPresentation } from "./performance-workspace-view-helpers";

export default function PerformanceExecutiveReturnStrip({
  presentation,
}: {
  presentation: PerformanceExecutiveReturnPresentation;
}) {
  return (
    <section
      aria-label="Executive return strip"
      className="performance-executive-strip workbench-summary-panel workbench-summary-card workbench-summary-card-compact workbench-summary-module-card"
    >
      <div className="performance-executive-strip-grid">
        {presentation.cards.map((card) => (
          <PerformanceSummaryMetricCard
            key={card.label}
            {...card}
            className={[
              "performance-summary-kpi-card",
              card.emphasize ? "performance-summary-kpi-card-primary" : "",
            ]
              .filter(Boolean)
              .join(" ")}
          />
        ))}
      </div>
    </section>
  );
}
