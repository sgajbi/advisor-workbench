import type { PerformanceRiskViewModel } from "../../risk-workspace-view-model";
import RiskPanelInfoDrawer from "./risk-panel-info-drawer";
import RiskModuleShell from "./risk-module-shell";
import RiskSnapshotBusinessReading from "./risk-snapshot-business-reading";
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
      actions={
        <RiskPanelInfoDrawer
          panelTitle="Risk Snapshot"
          rows={viewModel.snapshotContextRows}
        />
      }
      businessReading={
        <RiskSnapshotBusinessReading summary={viewModel.snapshotExecutiveSummary} />
      }
      headlineMetrics={
        <RiskSnapshotHeadlineMetrics metrics={viewModel.snapshotHeadlineMetrics} />
      }
      detail={
        <RiskSnapshotSupportingMeasures metrics={viewModel.snapshotSupportingMetrics} />
      }
    />
  );
}
