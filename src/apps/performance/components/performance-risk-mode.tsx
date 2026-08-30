import { useState, type ReactNode } from "react";

import {
  ScreenStatePanel,
  WorkbenchStatusRow,
} from "@/design-system";

import { getPerformanceWorkspaceModeDefinition } from "../performance-workspace-modes";
import { buildPerformanceRiskViewModel } from "../risk-workspace-view-model";
import { usePerformanceRiskContract } from "../use-performance-risk-contract";
import PerformanceAnalysisControlBar from "./performance-analysis-control-bar";
import PerformanceWorkspaceStageSurface from "./performance-workspace-stage-surface";
import type { PerformanceRiskModeProps } from "./performance-workspace-types";
import RiskConcentrationPanel from "./risk/risk-concentration-panel";
import RiskDrawdownPanel from "./risk/risk-drawdown-panel";
import RiskAttributionPanel from "./risk/risk-attribution-panel";
import RiskDrawdownDetailDrawer from "./risk/risk-drawdown-detail-drawer";
import RiskExecutiveOverview from "./risk/risk-executive-overview";
import RiskPrimaryPanelGroup from "./risk/risk-primary-panel-group";
import RiskMandateComparison from "./risk/risk-mandate-comparison";
import RiskRollingDetailDrawer from "./risk/risk-rolling-detail-drawer";
import RiskRollingPanel from "./risk/risk-rolling-panel";
import RiskSecondaryPanelGroup from "./risk/risk-secondary-panel-group";
import RiskSnapshotPanel from "./risk/risk-snapshot-panel";
import RiskStatusBar from "./risk/risk-status-bar";
import RiskSupportabilityPanel from "./risk/risk-supportability-panel";

type RiskDrawerState = {
  underwaterDrawerOpen: boolean;
  rollingDrawerOpen: boolean;
  selectedRollingWindowKey: string;
};

function buildClosedRiskDrawerState(): RiskDrawerState {
  return {
    underwaterDrawerOpen: false,
    rollingDrawerOpen: false,
    selectedRollingWindowKey: "",
  };
}

export default function PerformanceRiskMode({
  workspace,
  period,
  detailBasis,
  contributionDimension,
  attributionDimension,
  chartFrequency,
  benchmark,
  onRequestChange,
  isUpdating,
  isDetailsPending,
  capabilities,
}: PerformanceRiskModeProps) {
  const modeIntro = getPerformanceWorkspaceModeDefinition("risk").intro!;
  const riskContextKey = [
    workspace.portfolio.portfolio_id,
    workspace.as_of_date,
    workspace.benchmark_code ?? "",
    period,
    detailBasis,
  ].join("|");
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
    viewModel.state === "permission_blocked" ||
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

  return (
    <PerformanceRiskInteractionState
      key={riskContextKey}
      modeIntro={modeIntro}
      controlBar={
        <PerformanceAnalysisControlBar
          controlBarAriaLabel="Risk analysis controls"
          portfolioId={workspace.portfolio.portfolio_id}
          period={period}
          detailBasis={detailBasis}
          contributionDimension={contributionDimension}
          attributionDimension={attributionDimension}
          chartFrequency={chartFrequency}
          benchmark={workspace.benchmark_code ?? benchmark}
          benchmarkOptions={workspace.benchmark_options ?? []}
          reportStartDate={workspace.report_start_date}
          reportEndDate={workspace.report_end_date}
          capabilities={capabilities}
          isUpdating={isUpdating}
          ariaLabel="Risk analysis source selection"
          showFrequency={false}
          onRequestChange={onRequestChange ?? (async () => false)}
        />
      }
      requestAttribution={requestAttribution}
      requestDrawdownDetail={requestDrawdownDetail}
      requestRollingDetail={requestRollingDetail}
      statePanel={statePanel}
      viewModel={viewModel}
    />
  );
}

function PerformanceRiskInteractionState({
  controlBar,
  modeIntro,
  requestAttribution,
  requestDrawdownDetail,
  requestRollingDetail,
  statePanel,
  viewModel,
}: {
  controlBar: ReactNode;
  modeIntro: NonNullable<ReturnType<typeof getPerformanceWorkspaceModeDefinition>["intro"]>;
  requestAttribution: (attributionType: string, groupingDimension: string) => void;
  requestDrawdownDetail: () => void;
  requestRollingDetail: () => void;
  statePanel: ReactNode;
  viewModel: ReturnType<typeof buildPerformanceRiskViewModel>;
}) {
  const [drawerState, setDrawerState] = useState<RiskDrawerState>(
    buildClosedRiskDrawerState,
  );
  const resolvedSelectedRollingWindowKey =
    viewModel.rollingWindows.find((window) => window.key === drawerState.selectedRollingWindowKey)?.key ??
    viewModel.rollingWindows[0]?.key ??
    "";
  const selectedRollingWindow =
    viewModel.rollingWindows.find((window) => window.key === resolvedSelectedRollingWindowKey) ??
    viewModel.rollingWindows[0] ??
    null;

  return (
    <PerformanceWorkspaceStageSurface
      intro={modeIntro}
      shellClassName="performance-risk-shell performance-lotus-stage"
      shellHeader={<RiskStatusBar state={viewModel.state} />}
      shellAriaLabel="Risk"
      shellRole="region"
    >
      {controlBar}
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
          <RiskMandateComparison comparison={viewModel.mandateComparison} />
          <RiskPrimaryPanelGroup
            snapshot={<RiskSnapshotPanel viewModel={viewModel} />}
            drawdown={
              <RiskDrawdownPanel
                viewModel={viewModel}
                onViewUnderwater={() => {
                  setDrawerState({
                    ...drawerState,
                    underwaterDrawerOpen: true,
                  });
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
                onWindowChange={(windowKey) =>
                  setDrawerState({
                    ...drawerState,
                    selectedRollingWindowKey: windowKey,
                  })
                }
                onViewSeries={(windowKey) => {
                  setDrawerState({
                    ...drawerState,
                    selectedRollingWindowKey: windowKey,
                    rollingDrawerOpen: true,
                  });
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
        open={drawerState.underwaterDrawerOpen}
        viewModel={viewModel}
        onClose={() =>
          setDrawerState({
            ...drawerState,
            underwaterDrawerOpen: false,
          })
        }
      />
      <RiskRollingDetailDrawer
        open={drawerState.rollingDrawerOpen}
        viewModel={viewModel}
        selectedWindow={selectedRollingWindow}
        onClose={() =>
          setDrawerState({
            ...drawerState,
            rollingDrawerOpen: false,
          })
        }
      />
    </PerformanceWorkspaceStageSurface>
  );
}
