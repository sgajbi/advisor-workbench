import type { PerformanceRiskViewModel } from "../../risk-workspace-view-model";
import RiskDrawdownDetail from "./risk-drawdown-detail";
import RiskDrawdownHeadlineMetrics from "./risk-drawdown-headline-metrics";
import RiskModuleShell from "./risk-module-shell";
import RiskPanelUtilityRow from "./risk-panel-utility-row";

type RiskDrawdownPanelProps = {
  viewModel: PerformanceRiskViewModel;
  onViewUnderwater: () => void;
};

export default function RiskDrawdownPanel({
  viewModel,
  onViewUnderwater,
}: RiskDrawdownPanelProps) {
  return (
    <RiskModuleShell
      title="Drawdown"
      priority="primary"
      density="compact"
      className="performance-risk-drawdown-panel"
      actions={
        <RiskPanelUtilityRow
          panelTitle="Drawdown"
          methodologyRows={viewModel.drawdownContextRows}
          drilldownAction={{ label: "View underwater path", onClick: onViewUnderwater }}
        />
      }
      headlineMetrics={
        <RiskDrawdownHeadlineMetrics
          metrics={[...viewModel.drawdownHeadlineMetrics, ...viewModel.drawdownSupportingMetrics]}
        />
      }
      detail={
        <RiskDrawdownDetail viewModel={viewModel} />
      }
    />
  );
}
