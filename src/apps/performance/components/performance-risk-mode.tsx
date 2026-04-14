import { useEffect, useState } from "react";

import {
  ScreenStatePanel,
  WorkbenchStatusRow,
} from "@/design-system";

import { getPerformanceWorkspaceModeDefinition } from "../performance-workspace-modes";
import { buildPerformanceRiskViewModel } from "../risk-workspace-view-model";
import { usePerformanceRiskContract } from "../use-performance-risk-contract";
import PerformanceWorkspaceStageSurface, {
  buildPerformanceWorkspaceContextItems,
} from "./performance-workspace-stage-surface";
import type { PerformanceRiskModeProps } from "./performance-workspace-types";
import RiskConcentrationPanel from "./risk/risk-concentration-panel";
import RiskDrawdownPanel from "./risk/risk-drawdown-panel";
import RiskAttributionPanel from "./risk/risk-attribution-panel";
import RiskDrawdownDetailDrawer from "./risk/risk-drawdown-detail-drawer";
import RiskExecutiveOverview from "./risk/risk-executive-overview";
import RiskPrimaryPanelGroup from "./risk/risk-primary-panel-group";
import RiskRollingDetailDrawer from "./risk/risk-rolling-detail-drawer";
import RiskRollingPanel from "./risk/risk-rolling-panel";
import RiskSecondaryPanelGroup from "./risk/risk-secondary-panel-group";
import RiskSnapshotPanel from "./risk/risk-snapshot-panel";
import RiskStatusBar from "./risk/risk-status-bar";
import RiskSupportabilityPanel from "./risk/risk-supportability-panel";

export default function PerformanceRiskMode({
  workspace,
  period,
  detailBasis,
  isDetailsPending,
}: PerformanceRiskModeProps) {
  const modeIntro = getPerformanceWorkspaceModeDefinition("risk").intro!;
  const contextItems = buildPerformanceWorkspaceContextItems({
    workspace,
    period,
    detailBasis,
    benchmark: workspace.benchmark_code ?? undefined,
  });
  const [underwaterDrawerOpen, setUnderwaterDrawerOpen] = useState(false);
  const [rollingDrawerOpen, setRollingDrawerOpen] = useState(false);
  const [selectedRollingWindowKey, setSelectedRollingWindowKey] = useState("");
  const {
    riskSummary,
    riskConcentration,
    riskAttribution,
    riskDrawdown,
    riskDrawdownDetail,
    riskRolling,
    riskRollingDetail,
    isLoading,
    isAttributionLoading,
    isDrawdownDetailLoading,
    isRollingDetailLoading,
    requestAttribution,
    requestDrawdownDetail,
    requestRollingDetail,
  } = usePerformanceRiskContract({
    workspace,
    period,
    detailBasis,
    isDetailsPending,
  });

  useEffect(() => {
    setUnderwaterDrawerOpen(false);
    setRollingDrawerOpen(false);
    setSelectedRollingWindowKey("");
  }, [detailBasis, period, workspace.as_of_date, workspace.benchmark_code, workspace.portfolio.portfolio_id]);

  const viewModel = buildPerformanceRiskViewModel({
    workspace,
    period,
    detailBasis,
    isDetailsPending: isLoading,
    riskSummary,
    riskConcentration,
    riskAttribution,
    riskDrawdown,
    riskDrawdownDetail,
    riskRolling,
    riskRollingDetail,
    isAttributionLoading,
    isDrawdownDetailLoading,
    isRollingDetailLoading,
  });

  const statePanel =
    viewModel.state === "loading" ||
    viewModel.state === "empty" ||
    viewModel.state === "unavailable" ||
    viewModel.state === "error" ? (
      <ScreenStatePanel
        kind={viewModel.state}
        title={viewModel.title}
        body={viewModel.synopsis}
        surface="analysis"
        chart={viewModel.state === "loading"}
        rows={3}
      />
    ) : null;

  const resolvedSelectedRollingWindowKey =
    viewModel.rollingWindows.find((window) => window.key === selectedRollingWindowKey)?.key ??
    viewModel.rollingWindows[0]?.key ??
    "";
  const selectedRollingWindow =
    viewModel.rollingWindows.find((window) => window.key === resolvedSelectedRollingWindowKey) ??
    viewModel.rollingWindows[0] ??
    null;

  return (
    <PerformanceWorkspaceStageSurface
      intro={modeIntro}
      contextAriaLabel="Risk context"
      contextItems={contextItems}
      shellClassName="performance-risk-shell performance-lotus-stage"
      shellHeader={<RiskStatusBar state={viewModel.state} />}
      shellAriaLabel="Risk"
      shellRole="region"
    >
      {viewModel.partialFailures.length ? (
        <WorkbenchStatusRow
          label="Risk partial failures"
          className="performance-risk-partial-failure-row"
          items={viewModel.partialFailures.map((failure) => ({
            value: failure,
            tone: "warn" as const,
          }))}
        />
      ) : null}
      {statePanel ?? (
        <div className="performance-risk-main-column">
          <RiskExecutiveOverview overview={viewModel.workspaceOverview} />
          <RiskPrimaryPanelGroup
            snapshot={<RiskSnapshotPanel viewModel={viewModel} />}
            drawdown={
              <RiskDrawdownPanel
                viewModel={viewModel}
                onViewUnderwater={() => {
                  setUnderwaterDrawerOpen(true);
                  requestDrawdownDetail();
                }}
              />
            }
            concentration={<RiskConcentrationPanel viewModel={viewModel} />}
          />
          <RiskSecondaryPanelGroup
            rolling={
              <RiskRollingPanel
                viewModel={viewModel}
                selectedWindowKey={resolvedSelectedRollingWindowKey}
                onWindowChange={setSelectedRollingWindowKey}
                onViewSeries={(windowKey) => {
                  setSelectedRollingWindowKey(windowKey);
                  setRollingDrawerOpen(true);
                  requestRollingDetail();
                }}
              />
            }
            attribution={
              <RiskAttributionPanel
                viewModel={viewModel}
                onSelectAttribution={requestAttribution}
              />
            }
          />
          <RiskSupportabilityPanel viewModel={viewModel} />
        </div>
      )}
      <RiskDrawdownDetailDrawer
        open={underwaterDrawerOpen}
        viewModel={viewModel}
        onClose={() => setUnderwaterDrawerOpen(false)}
      />
      <RiskRollingDetailDrawer
        open={rollingDrawerOpen}
        viewModel={viewModel}
        selectedWindow={selectedRollingWindow}
        onClose={() => setRollingDrawerOpen(false)}
      />
    </PerformanceWorkspaceStageSurface>
  );
}
