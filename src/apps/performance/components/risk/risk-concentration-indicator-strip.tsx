import { Text } from "@/design-system";

import type { PerformanceRiskConcentrationIndicator } from "../../risk-workspace-view-model";
import RiskTermLabel from "./risk-term-label";

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
          <article
            key={indicator.key}
            className={[
              "performance-risk-concentration-indicator-tile",
              indicator.tone === "danger"
                ? "performance-risk-concentration-indicator-tile-danger"
                : indicator.tone === "warn"
                  ? "performance-risk-concentration-indicator-tile-warn"
                  : "",
            ]
              .filter(Boolean)
              .join(" ")}
            title={indicator.definition}
            aria-label={`${indicator.label}: ${indicator.value}. ${indicator.support}. ${indicator.definition}`}
          >
            <div className="performance-risk-concentration-indicator-header">
              <RiskTermLabel label={indicator.label} definition={indicator.definition} />
            </div>
            <Text
              variant="metricValueCompact"
              className="performance-risk-concentration-indicator-value"
            >
              {indicator.value}
            </Text>
            <Text variant="metadata" className="performance-risk-concentration-indicator-support">
              {indicator.support}
            </Text>
          </article>
        ))}
      </div>
    </section>
  );
}
