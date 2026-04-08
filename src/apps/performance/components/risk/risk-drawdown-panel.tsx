import type { PerformanceRiskViewModel } from "../../risk-workspace-view-model";
import RiskDrawdownBusinessReading from "./risk-drawdown-business-reading";
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
      subtitle="Realized loss path, recovery posture, and benchmark-relative drawdown evidence."
      priority="primary"
      className="performance-risk-drawdown-panel"
      actions={
        <RiskPanelUtilityRow
          panelTitle="Drawdown"
          methodologyRows={viewModel.drawdownContextRows}
          drilldownAction={{ label: "View underwater path", onClick: onViewUnderwater }}
        />
      }
      businessReading={
        <RiskDrawdownBusinessReading summary={viewModel.drawdownExecutiveSummary} />
      }
      headlineMetrics={
        <RiskDrawdownHeadlineMetrics metrics={viewModel.drawdownHeadlineMetrics} />
      }
      detail={
        <RiskDrawdownDetail viewModel={viewModel} />
      }
    />
  );
}
