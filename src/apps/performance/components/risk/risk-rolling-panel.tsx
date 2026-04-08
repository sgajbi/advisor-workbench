import type { PerformanceRiskViewModel } from "../../risk-workspace-view-model";
import RiskModuleShell from "./risk-module-shell";
import RiskPanelUtilityRow from "./risk-panel-utility-row";
import RiskRollingBusinessReading from "./risk-rolling-business-reading";
import RiskRollingHeadlineMetrics from "./risk-rolling-headline-metrics";
import RiskRollingWindowDetail from "./risk-rolling-window-detail";

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
      priority="secondary"
      density="compact"
      className="performance-risk-rolling-panel"
      actions={
        <RiskPanelUtilityRow
          panelTitle="Rolling Risk"
          methodologyRows={viewModel.rollingContextRows}
          drilldownAction={{
            label: "View rolling series",
            onClick: () => onViewSeries(selectedWindow?.key ?? resolvedSelectedWindowKey),
          }}
        />
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
