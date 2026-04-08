import type { PerformanceRiskContextRow } from "../../risk-workspace-view-model";
import RiskContextList from "./risk-context-list";

export default function RiskRollingContextPanel({
  rows,
}: {
  rows: PerformanceRiskContextRow[];
}) {
  return (
    <RiskContextList
      rows={rows}
      ariaLabel="Rolling risk context and methodology"
      compact
      title="Context and methodology"
    />
  );
}
