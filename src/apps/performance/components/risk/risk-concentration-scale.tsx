import { Text } from "@/design-system";

import type { PerformanceRiskConcentrationScale } from "../../risk-workspace-view-model";
import RiskTermLabel from "./risk-term-label";

const CONCENTRATION_SCALE_LEGEND = ["Diversified", "Moderate", "Elevated", "High"] as const;

export default function RiskConcentrationScale({
  scales,
}: {
  scales: PerformanceRiskConcentrationScale[];
}) {
  return (
    <div className="performance-risk-concentration-scale" aria-label="Risk concentration scale">
      <div className="performance-risk-concentration-scale-list">
        {scales.map((scale) => (
          <div key={scale.key} className="performance-risk-concentration-scale-card">
            <div className="performance-risk-concentration-scale-header">
              <RiskTermLabel label={scale.label} definition={scale.definition} />
              <Text variant="label" className="performance-risk-concentration-scale-band-label">
                {scale.interpretationBand}
              </Text>
            </div>
            <div className="performance-risk-concentration-scale-bands" aria-hidden="true">
              <div className="performance-risk-concentration-scale-band performance-risk-concentration-scale-band-diversified" />
              <div className="performance-risk-concentration-scale-band performance-risk-concentration-scale-band-moderate" />
              <div className="performance-risk-concentration-scale-band performance-risk-concentration-scale-band-elevated" />
              <div className="performance-risk-concentration-scale-band performance-risk-concentration-scale-band-high" />
              <div
                className="performance-risk-concentration-scale-marker"
                style={{ left: `${scale.markerPct}%` }}
              />
            </div>
          </div>
        ))}
      </div>
      <div className="performance-risk-concentration-scale-legend" aria-hidden="true">
        {CONCENTRATION_SCALE_LEGEND.map((label) => (
          <Text key={label} variant="metadata">
            {label}
          </Text>
        ))}
      </div>
    </div>
  );
}
