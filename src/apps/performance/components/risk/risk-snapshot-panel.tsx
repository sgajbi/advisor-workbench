import type { PerformanceRiskViewModel } from "../../risk-workspace-view-model";
import RiskModuleShell from "./risk-module-shell";
import RiskPanelUtilityRow from "./risk-panel-utility-row";
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
      priority="primary"
      density="compact"
      className="performance-risk-snapshot-panel"
      actions={
        <RiskPanelUtilityRow
          panelTitle="Risk Snapshot"
          methodologyRows={viewModel.snapshotContextRows}
        />
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
