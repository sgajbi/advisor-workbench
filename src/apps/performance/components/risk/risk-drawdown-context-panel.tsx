import type { PerformanceRiskContextRow } from "../../risk-workspace-view-model";
import RiskContextList from "./risk-context-list";

export default function RiskDrawdownContextPanel({
  rows,
}: {
  rows: PerformanceRiskContextRow[];
}) {
  return (
    <RiskContextList
      rows={rows}
      ariaLabel="Drawdown context and methodology"
      compact
      title="Context and methodology"
    />
  );
}
