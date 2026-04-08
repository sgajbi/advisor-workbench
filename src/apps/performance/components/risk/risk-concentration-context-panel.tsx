import { Text } from "@/design-system";

import type { PerformanceRiskConcentrationContextRow } from "../../risk-workspace-view-model";
import RiskConcentrationTermLabel from "./risk-concentration-term-label";

export default function RiskConcentrationContextPanel({
  rows,
}: {
  rows: PerformanceRiskConcentrationContextRow[];
}) {
  return (
    <section
      className="performance-risk-concentration-context-panel"
      aria-label="Risk concentration context"
    >
      <div className="performance-risk-concentration-section-header">
        <Text variant="cardTitle">Coverage and methodology</Text>
      </div>
      <div className="performance-risk-concentration-context-list">
        {rows.map((row) => (
          <div key={row.key} className="performance-risk-concentration-context-row">
            <div className="performance-risk-concentration-context-copy">
              <RiskConcentrationTermLabel label={row.label} definition={row.definition} />
              <Text variant="metadata">{row.support}</Text>
            </div>
            <Text variant="metricValueCompact">{row.value}</Text>
          </div>
        ))}
      </div>
    </section>
  );
}
