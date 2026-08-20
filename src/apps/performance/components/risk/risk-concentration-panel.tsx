import type { PerformanceRiskViewModel } from "../../risk-workspace-view-model";
import RiskConcentrationIndicatorStrip from "./risk-concentration-indicator-strip";
import RiskModuleShell from "./risk-module-shell";
import RiskPanelUtilityRow from "./risk-panel-utility-row";

export default function RiskConcentrationPanel({
  viewModel,
}: {
  viewModel: PerformanceRiskViewModel;
}) {
  return (
    <RiskModuleShell
      title="Concentration"
      priority="primary"
      density="compact"
      className="performance-risk-concentration-panel"
      actions={
        <RiskPanelUtilityRow
          panelTitle="Concentration"
          methodologyRows={viewModel.concentrationContextRows}
        />
      }
      headlineMetrics={<RiskConcentrationIndicatorStrip indicators={viewModel.concentrationIndicators} />}
    />
  );
}
