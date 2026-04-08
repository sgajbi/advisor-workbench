import type { PerformanceRiskViewModel } from "../../risk-workspace-view-model";
import RiskDrilldownAction from "./risk-drilldown-action";
import RiskModuleShell from "./risk-module-shell";
import RiskRollingBusinessReading from "./risk-rolling-business-reading";
import RiskRollingHeadlineMetrics from "./risk-rolling-headline-metrics";
import RiskRollingWindowDetail from "./risk-rolling-window-detail";
import RiskPanelInfoDrawer from "./risk-panel-info-drawer";

type RiskRollingPanelProps = {
  viewModel: PerformanceRiskViewModel;
  selectedWindowKey: string;
  onWindowChange: (value: string) => void;
  onViewSeries: (selectedWindowKey: string) => void;
};

export default function RiskRollingPanel({
  viewModel,
  selectedWindowKey,
  onWindowChange,
  onViewSeries,
}: RiskRollingPanelProps) {
  const defaultWindowKey = viewModel.rollingWindows[0]?.key ?? "";
  const resolvedSelectedWindowKey =
    viewModel.rollingWindows.find((window) => window.key === selectedWindowKey)?.key ??
    defaultWindowKey;

  const selectedWindow =
    viewModel.rollingWindows.find((window) => window.key === resolvedSelectedWindowKey) ??
    viewModel.rollingWindows[0] ??
    null;

  return (
    <RiskModuleShell
      title="Rolling Risk"
      subtitle="Selected-window behaviour, relative reliability, and next-horizon review."
      className="performance-risk-rolling-panel"
      actions={
        <>
          <RiskPanelInfoDrawer
            panelTitle="Rolling Risk"
            rows={viewModel.rollingContextRows}
          />
          <RiskDrilldownAction
            label="View rolling series"
            onClick={() => onViewSeries(selectedWindow?.key ?? resolvedSelectedWindowKey)}
          />
        </>
      }
      businessReading={
        <RiskRollingBusinessReading
          summary={selectedWindow?.selectedWindowBusinessReading ?? viewModel.rollingExecutiveSummary}
        />
      }
      headlineMetrics={<RiskRollingHeadlineMetrics window={selectedWindow} />}
      detail={
        <RiskRollingWindowDetail
          viewModel={viewModel}
          selectedWindow={selectedWindow}
          selectedWindowKey={resolvedSelectedWindowKey}
          onWindowChange={onWindowChange}
        />
      }
    />
  );
}
