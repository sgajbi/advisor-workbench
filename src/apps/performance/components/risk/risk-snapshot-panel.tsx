import type { PerformanceRiskViewModel } from "../../risk-workspace-view-model";
import RiskModuleShell from "./risk-module-shell";
import RiskSnapshotBusinessReading from "./risk-snapshot-business-reading";
import RiskSnapshotContextPanel from "./risk-snapshot-context-panel";
import RiskSnapshotHeadlineMetrics from "./risk-snapshot-headline-metrics";
import RiskSnapshotSupportingMeasures from "./risk-snapshot-supporting-measures";

export default function RiskSnapshotPanel({
  viewModel,
}: {
  viewModel: PerformanceRiskViewModel;
}) {
  return (
    <RiskModuleShell
      title="Risk Snapshot"
      subtitle="Executive risk posture, benchmark-relative reliability, and the key measures to review first."
      className="performance-risk-snapshot-panel"
      businessReading={
        <RiskSnapshotBusinessReading summary={viewModel.snapshotExecutiveSummary} />
      }
      headlineMetrics={
        <RiskSnapshotHeadlineMetrics metrics={viewModel.snapshotHeadlineMetrics} />
      }
      detail={
        <RiskSnapshotSupportingMeasures metrics={viewModel.snapshotSupportingMetrics} />
      }
      context={<RiskSnapshotContextPanel rows={viewModel.snapshotContextRows} />}
    />
  );
}
