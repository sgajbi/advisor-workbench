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
import RiskProvenanceStrip from "./risk/risk-provenance-strip";
import RiskRollingPanel from "./risk/risk-rolling-panel";
import RiskSnapshotPanel from "./risk/risk-snapshot-panel";
import RiskStatusBar from "./risk/risk-status-bar";
import RiskSupportabilityPanel from "./risk/risk-supportability-panel";

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
    riskDrawdown,
    riskDrawdownDetail,
    riskRolling,
    riskRollingDetail,
    isLoading,
    isDrawdownDetailLoading,
    isRollingDetailLoading,
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
    riskDrawdown,
    riskDrawdownDetail,
    riskRolling,
    riskRollingDetail,
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
        actions={<RiskStatusBar state={viewModel.state} warnings={viewModel.warnings} />}
      >
        <div className="performance-risk-context-grid" aria-label="Risk context">
          {viewModel.contextItems.map((item) => (
            <div key={item.label} className="performance-risk-context-item">
              <Text variant="label">{item.label}</Text>
              <Text variant="cardTitle">{item.value}</Text>
            </div>
          ))}
        </div>
        <div className="performance-risk-synopsis">
          <Text variant="eyebrow">Risk briefing</Text>
          <Text variant="body">{viewModel.synopsis}</Text>
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
          <div className="performance-risk-grid">
            <div className="performance-risk-main-column">
              <RiskSnapshotPanel viewModel={viewModel} />
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
              <RiskConcentrationPanel viewModel={viewModel} />
            </div>
            <aside className="performance-risk-side-rail" aria-label="Risk support rail">
              <RiskSupportabilityPanel viewModel={viewModel} />
            </aside>
          </div>
        )}
        <RiskProvenanceStrip viewModel={viewModel} />
      </SectionBlock>
    </section>
  );
}
