import type { PerformanceRiskExecutiveSummary } from "../../risk-workspace-view-model";
import RiskExecutiveSummary from "./risk-executive-summary";

export default function RiskSnapshotBusinessReading({
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
      ariaLabel="Risk snapshot business reading"
    />
  );
}
