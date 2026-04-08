import type { PerformanceRiskViewModel } from "../../risk-workspace-view-model";
import RiskDrawdownBusinessReading from "./risk-drawdown-business-reading";
import RiskDrawdownDetail from "./risk-drawdown-detail";
import RiskDrawdownHeadlineMetrics from "./risk-drawdown-headline-metrics";
import RiskExpandAction from "./risk-expand-action";
import RiskModuleShell from "./risk-module-shell";
import RiskPanelInfoDrawer from "./risk-panel-info-drawer";

type RiskDrawdownPanelProps = {
  viewModel: PerformanceRiskViewModel;
  underwaterExpanded: boolean;
  onToggleUnderwater: () => void;
};

export default function RiskDrawdownPanel({
  viewModel,
  underwaterExpanded,
  onToggleUnderwater,
}: RiskDrawdownPanelProps) {
  return (
    <RiskModuleShell
      title="Drawdown"
      subtitle="Realized loss path, recovery posture, and benchmark-relative drawdown evidence."
      className="performance-risk-drawdown-panel"
      actions={
        <>
          <RiskPanelInfoDrawer panelTitle="Drawdown" rows={viewModel.drawdownContextRows} />
          <RiskExpandAction
            expanded={underwaterExpanded}
            onToggle={onToggleUnderwater}
            expandedLabel="Collapse underwater path"
            collapsedLabel="Expand underwater path"
          />
        </>
      }
      businessReading={
        <RiskDrawdownBusinessReading summary={viewModel.drawdownExecutiveSummary} />
      }
      headlineMetrics={
        <RiskDrawdownHeadlineMetrics metrics={viewModel.drawdownHeadlineMetrics} />
      }
      detail={
        <RiskDrawdownDetail
          viewModel={viewModel}
          underwaterExpanded={underwaterExpanded}
        />
      }
    />
  );
}
