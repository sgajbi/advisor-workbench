import { useEffect, useState } from "react";

import {
  ScreenStatePanel,
  SectionBlock,
  Text,
  WorkbenchStatusRow,
} from "@/design-system";

import { buildPerformanceRiskViewModel } from "../risk-workspace-view-model";
import { usePerformanceRiskContract } from "../use-performance-risk-contract";
import type { PerformanceRiskModeProps } from "./performance-workspace-types";
import RiskConcentrationPanel from "./risk/risk-concentration-panel";
import RiskDrawdownPanel from "./risk/risk-drawdown-panel";
import RiskAttributionPanel from "./risk/risk-attribution-panel";
import RiskExecutiveOverview from "./risk/risk-executive-overview";
import RiskPrimaryPanelGroup from "./risk/risk-primary-panel-group";
import RiskRollingPanel from "./risk/risk-rolling-panel";
import RiskSecondaryPanelGroup from "./risk/risk-secondary-panel-group";
import RiskSnapshotPanel from "./risk/risk-snapshot-panel";
import RiskStatusBar from "./risk/risk-status-bar";

export default function PerformanceRiskMode({
  workspace,
  period,
  detailBasis,
  isDetailsPending,
}: PerformanceRiskModeProps) {
  const [underwaterExpanded, setUnderwaterExpanded] = useState(false);
  const [rollingExpanded, setRollingExpanded] = useState(false);
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
    setUnderwaterExpanded(false);
    setRollingExpanded(false);
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

  return (
    <section className="performance-risk-stage" aria-label="Risk">
      <SectionBlock
        title="Stateful Risk"
        subtitle="Portfolio risk, concentration pressure, and supportability for the selected performance context."
        className="performance-risk-shell performance-lotus-stage"
        actions={<RiskStatusBar state={viewModel.state} />}
      >
        <div className="performance-risk-context-grid" aria-label="Risk context">
          {viewModel.contextItems.map((item) => (
            <div key={item.label} className="performance-risk-context-item">
              <Text variant="label">{item.label}</Text>
              <Text variant="cardTitle">{item.value}</Text>
            </div>
          ))}
        </div>
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
            <RiskExecutiveOverview
              overview={viewModel.workspaceOverview}
              mattersNow={viewModel.whatMattersNow}
            />
            <RiskPrimaryPanelGroup
              snapshot={<RiskSnapshotPanel viewModel={viewModel} />}
              drawdown={
                <RiskDrawdownPanel
                  viewModel={viewModel}
                  underwaterExpanded={underwaterExpanded}
                  onToggleUnderwater={() => {
                    const nextExpanded = !underwaterExpanded;
                    setUnderwaterExpanded(nextExpanded);
                    if (nextExpanded) {
                      requestDrawdownDetail();
                    }
                  }}
                />
              }
              concentration={<RiskConcentrationPanel viewModel={viewModel} />}
            />
            <RiskSecondaryPanelGroup
              rolling={
                <RiskRollingPanel
                  viewModel={viewModel}
                  rollingExpanded={rollingExpanded}
                  onToggleRolling={() => {
                    const nextExpanded = !rollingExpanded;
                    setRollingExpanded(nextExpanded);
                    if (nextExpanded) {
                      requestRollingDetail();
                    }
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
          </div>
        )}
      </SectionBlock>
    </section>
  );
}
