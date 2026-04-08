import type { PerformanceRiskViewModel } from "../../risk-workspace-view-model";
import RiskModuleShell from "./risk-module-shell";
import RiskPanelUtilityRow from "./risk-panel-utility-row";
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
      priority="primary"
      density="compact"
      className="performance-risk-snapshot-panel"
      actions={
        <RiskPanelUtilityRow
          panelTitle="Risk Snapshot"
          methodologyRows={viewModel.snapshotContextRows}
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
