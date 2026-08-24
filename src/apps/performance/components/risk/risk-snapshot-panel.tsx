import type { PerformanceRiskViewModel } from "../../risk-workspace-view-model";
import RiskModuleShell from "./risk-module-shell";
import RiskPanelUtilityRow from "./risk-panel-utility-row";
import RiskSnapshotHeadlineMetrics from "./risk-snapshot-headline-metrics";

export default function RiskSnapshotPanel({
  viewModel,
}: {
  viewModel: PerformanceRiskViewModel;
}) {
  return (
    <RiskModuleShell
      title="Risk snapshot"
      priority="primary"
      density="compact"
      className="performance-risk-snapshot-panel"
      actions={
        <RiskPanelUtilityRow
          panelTitle="Risk snapshot"
          methodologyRows={viewModel.snapshotContextRows}
        />
      }
      headlineMetrics={
        <RiskSnapshotHeadlineMetrics
          metrics={[...viewModel.snapshotHeadlineMetrics, ...viewModel.snapshotSupportingMetrics]}
        />
      }
    />
  );
}
