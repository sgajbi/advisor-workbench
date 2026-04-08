import type { PerformanceRiskContextRow } from "../../risk-workspace-view-model";
import RiskContextList from "./risk-context-list";

export default function RiskSnapshotContextPanel({
  rows,
}: {
  rows: PerformanceRiskContextRow[];
}) {
  return (
    <RiskContextList
      rows={rows}
      ariaLabel="Risk snapshot context"
      title="Context and methodology"
      compact
    />
  );
}
