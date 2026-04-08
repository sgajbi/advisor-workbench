import { Text } from "@/design-system";

import type { PerformanceRiskConcentrationScale } from "../../risk-workspace-view-model";
import RiskTermLabel from "./risk-term-label";

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
              <Text variant="metricValueCompact">{scale.value}</Text>
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
            <div className="performance-risk-concentration-scale-legend">
              <Text variant="metadata">Diversified</Text>
              <Text variant="metadata">Moderate</Text>
              <Text variant="metadata">Elevated</Text>
              <Text variant="metadata">High</Text>
            </div>
            <Text variant="secondary" className="performance-risk-concentration-scale-reading">
              {scale.interpretation}
            </Text>
          </div>
        ))}
      </div>
    </div>
  );
}
