import type { PerformanceRiskConcentrationIndicator } from "../../risk-workspace-view-model";
import RiskMetricCard from "./risk-metric-card";

export default function RiskConcentrationIndicatorStrip({
  indicators,
}: {
  indicators: PerformanceRiskConcentrationIndicator[];
}) {
  return (
    <section
      className="performance-risk-concentration-indicator-strip"
      aria-label="Risk concentration indicator strip"
    >
      <div
        className="performance-risk-concentration-indicator-grid"
        aria-label="Risk concentration headline metrics"
      >
        {indicators.map((indicator) => (
          <RiskMetricCard
            key={indicator.key}
            label={indicator.label}
            value={indicator.value}
            support={indicator.support}
            definition={indicator.definition}
            tone={indicator.tone === "neutral" ? "default" : indicator.tone}
            density="compact"
            className={[
              "performance-risk-concentration-indicator-tile",
              "performance-risk-concentration-indicator-card",
            ].join(" ")}
            displaySupport={false}
            ariaLabel={`${indicator.label}: ${indicator.value}. ${indicator.support}. ${indicator.definition}`}
            title={indicator.definition}
          />
        ))}
      </div>
    </section>
  );
}
