import { useEffect, useState } from "react";

import type { PerformanceRiskViewModel } from "../../risk-workspace-view-model";
import RiskExpandAction from "./risk-expand-action";
import RiskModuleShell from "./risk-module-shell";
import RiskRollingBusinessReading from "./risk-rolling-business-reading";
import RiskRollingHeadlineMetrics from "./risk-rolling-headline-metrics";
import RiskRollingWindowDetail from "./risk-rolling-window-detail";
import RiskPanelInfoDrawer from "./risk-panel-info-drawer";

type RiskRollingPanelProps = {
  viewModel: PerformanceRiskViewModel;
  rollingExpanded: boolean;
  onToggleRolling: () => void;
};

export default function RiskRollingPanel({
  viewModel,
  rollingExpanded,
  onToggleRolling,
}: RiskRollingPanelProps) {
  const defaultWindowKey = viewModel.rollingWindows[0]?.key ?? "";
  const [selectedWindowKey, setSelectedWindowKey] = useState(defaultWindowKey);

  useEffect(() => {
    setSelectedWindowKey(defaultWindowKey);
  }, [defaultWindowKey]);

  const selectedWindow =
    viewModel.rollingWindows.find((window) => window.key === selectedWindowKey) ??
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
          <RiskExpandAction
            expanded={rollingExpanded}
            onToggle={onToggleRolling}
            expandedLabel="Collapse rolling series"
            collapsedLabel="Expand rolling series"
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
          selectedWindowKey={selectedWindowKey}
          onWindowChange={setSelectedWindowKey}
          rollingExpanded={rollingExpanded}
        />
      }
    />
  );
}
