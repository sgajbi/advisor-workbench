import type {
  PerformanceRiskConcentrationContextRow,
  PerformanceRiskContextRow,
} from "../../risk-workspace-view-model";
import { Text } from "@/design-system";

import RiskContextRows from "./risk-context-rows";

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
      <RiskContextRows rows={rows} compact={compact} />
    </section>
  );
}
