import type { PerformanceRiskExecutiveSummary } from "../../risk-workspace-view-model";
import RiskExecutiveSummary from "./risk-executive-summary";

export default function RiskDrawdownBusinessReading({
  summary,
}: {
  summary: PerformanceRiskExecutiveSummary | null;
}) {
  if (!summary) {
    return null;
  }

  return <RiskExecutiveSummary summary={summary} ariaLabel="Drawdown business reading" />;
}
