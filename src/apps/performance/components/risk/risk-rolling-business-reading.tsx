import type { PerformanceRiskExecutiveSummary } from "../../risk-workspace-view-model";
import RiskExecutiveSummary from "./risk-executive-summary";

export default function RiskRollingBusinessReading({
  summary,
}: {
  summary: PerformanceRiskExecutiveSummary | null;
}) {
  if (!summary) {
    return null;
  }

  return (
    <RiskExecutiveSummary
      summary={summary}
      ariaLabel="Rolling risk business reading"
      density="compact"
    />
  );
}
