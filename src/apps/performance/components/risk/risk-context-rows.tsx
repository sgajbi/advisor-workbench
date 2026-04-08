import { Text } from "@/design-system";

import type {
  PerformanceRiskConcentrationContextRow,
  PerformanceRiskContextRow,
} from "../../risk-workspace-view-model";
import RiskTermLabel from "./risk-term-label";

export default function RiskContextRows({
  rows,
  compact = false,
}: {
  rows: Array<PerformanceRiskContextRow | PerformanceRiskConcentrationContextRow>;
  compact?: boolean;
}) {
  if (!rows.length) {
    return null;
  }

  return (
    <div
      className={[
        "performance-risk-context-list",
        compact ? "performance-risk-context-list-compact" : "",
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {rows.map((row) => (
        <div key={row.key} className="performance-risk-context-item">
          <div className="performance-risk-context-item-copy">
            {"definition" in row && row.definition ? (
              <RiskTermLabel label={row.label} definition={row.definition} />
            ) : (
              <Text variant="label">{row.label}</Text>
            )}
            <Text variant="metadata">{row.support}</Text>
          </div>
          <Text variant="cardTitle" className="performance-risk-context-item-value">
            {row.value}
          </Text>
        </div>
      ))}
    </div>
  );
}
