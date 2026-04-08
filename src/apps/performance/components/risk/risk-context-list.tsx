import { Text } from "@/design-system";

import type { PerformanceRiskContextRow } from "../../risk-workspace-view-model";

export default function RiskContextList({
  rows,
  ariaLabel,
  compact = false,
}: {
  rows: PerformanceRiskContextRow[];
  ariaLabel: string;
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
      aria-label={ariaLabel}
    >
      {rows.map((row) => (
        <div key={row.key} className="performance-risk-context-item">
          <div className="performance-risk-context-item-copy">
            <Text variant="label">{row.label}</Text>
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
