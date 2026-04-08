import { Text } from "@/design-system";

import type {
  PerformanceRiskConcentrationContextRow,
  PerformanceRiskContextRow,
} from "../../risk-workspace-view-model";
import RiskTermLabel from "./risk-term-label";

export default function RiskContextList({
  rows,
  ariaLabel,
  compact = false,
  title = "Context and methodology",
}: {
  rows: Array<PerformanceRiskContextRow | PerformanceRiskConcentrationContextRow>;
  ariaLabel: string;
  compact?: boolean;
  title?: string;
}) {
  if (!rows.length) {
    return null;
  }

  return (
    <section className="performance-risk-context-section" aria-label={ariaLabel}>
      <div className="performance-risk-section-header">
        <Text variant="cardTitle" className="performance-risk-section-title">
          {title}
        </Text>
      </div>
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
    </section>
  );
}
