import { useState } from "react";

import { Panel, WorkspaceLayout, WorkspaceMain } from "@/design-system";
import type { WorkbenchPerformanceWorkspace } from "@/features/workbench/types";

import {
  getBottomContributionRows,
  getNegativePositionContributionRows,
  getPositivePositionContributionRows,
  getPrimaryContributionRow,
  getRelativeSegmentRows,
  getTopAttributionEffectRows,
  getTopContributionRows,
  hasBenchmarkContext,
  hasMeaningfulHistory,
  hasPositionContributionRanking,
  hasUsableAttribution,
  hasUsableContribution,
  isMoneyWeightedReturnSuspicious,
} from "../view-model";
import PerformanceAnalysisMode from "./performance-analysis-mode";
import PerformanceEvidenceMode from "./performance-evidence-mode";
import PerformanceSummaryMode from "./performance-summary-mode";
import { getBenchmarkLabel } from "./performance-workspace-view-helpers";

export type PerformanceWorkspaceMode = "summary" | "analysis" | "evidence";

const WORKSPACE_MODES: Array<{ key: PerformanceWorkspaceMode; label: string }> = [
  { key: "summary", label: "Summary" },
  { key: "analysis", label: "Analysis" },
  { key: "evidence", label: "Evidence" },
];

export default function PerformanceWorkspaceView({
  workspace,
  period,
  detailBasis,
  contributionDimension,
  attributionDimension,
  chartFrequency,
  benchmark,
  onRequestChange,
  isUpdating = false,
  isDetailsPending = false,
}: {
  workspace: WorkbenchPerformanceWorkspace | null;
  period: string;
  detailBasis: string;
  contributionDimension: string;
  attributionDimension: string;
  chartFrequency: string;
  benchmark?: string;
  onRequestChange?: (patch: {
    portfolioId?: string;
    period?: string;
    detailBasis?: string;
    contributionDimension?: string;
    attributionDimension?: string;
    chartFrequency?: string;
    benchmark?: string;
    reportStartDate?: string;
    reportEndDate?: string;
  }) => void;
  isUpdating?: boolean;
  isDetailsPending?: boolean;
}) {
  const [mode, setMode] = useState<PerformanceWorkspaceMode>("summary");

  const hasBenchmark = workspace ? hasBenchmarkContext(workspace) : false;
  const hasAttribution = workspace ? hasUsableAttribution(workspace) : false;
  const hasContribution = workspace ? hasUsableContribution(workspace) : false;
  const hasHistory = workspace ? hasMeaningfulHistory(workspace.net_chart) : false;
  const primaryDriver = workspace ? getPrimaryContributionRow(workspace) : null;
  const hasPositionRanking = workspace ? hasPositionContributionRanking(workspace) : false;
  const hasMoneyWeightedReturn = Boolean(
    workspace?.money_weighted_return?.money_weighted_return_pct !== null &&
      workspace?.money_weighted_return?.money_weighted_return_pct !== undefined
  );
  const suspiciousMoneyWeightedReturn = workspace
    ? isMoneyWeightedReturnSuspicious(workspace)
    : false;
  const positivePositionContributors = workspace
    ? getPositivePositionContributionRows(workspace)
    : [];
  const negativePositionContributors = workspace
    ? getNegativePositionContributionRows(workspace)
    : [];
  const topContributors = workspace ? getTopContributionRows(workspace) : [];
  const bottomContributors = workspace ? getBottomContributionRows(workspace) : [];
  const relativeSegmentRows = workspace ? getRelativeSegmentRows(workspace) : [];
  const topAttributionEffectRows = workspace ? getTopAttributionEffectRows(workspace) : [];
  const contributorScale = Math.max(
    0.01,
    ...(hasPositionRanking ? positivePositionContributors : topContributors).map((row) =>
      Math.abs(row.contribution_pct)
    ),
    ...(hasPositionRanking ? negativePositionContributors : bottomContributors).map((row) =>
      Math.abs(row.contribution_pct)
    )
  );
  const selectedBenchmarkCode = workspace?.benchmark_code ?? benchmark ?? undefined;
  const selectedBenchmarkLabel = workspace
    ? getBenchmarkLabel(workspace, selectedBenchmarkCode)
    : undefined;
  const selectedPerformance =
    workspace && detailBasis === "GROSS" ? workspace.gross_performance : workspace?.net_performance;
  const attributionEffectScale = Math.max(
    0.01,
    ...topAttributionEffectRows.map((row) => Math.abs(row.total_effect_pct))
  );

  const modePanel = !workspace ? null : mode === "summary" ? (
    <PerformanceSummaryMode
      workspace={workspace}
      period={period}
      detailBasis={detailBasis}
      contributionDimension={contributionDimension}
      attributionDimension={attributionDimension}
      chartFrequency={chartFrequency}
      benchmark={benchmark}
      onRequestChange={onRequestChange}
      isUpdating={isUpdating}
      isDetailsPending={isDetailsPending}
      hasBenchmark={hasBenchmark}
      hasHistory={hasHistory}
      selectedBenchmarkCode={selectedBenchmarkCode}
      selectedBenchmarkLabel={selectedBenchmarkLabel}
      selectedPerformance={selectedPerformance}
      primaryDriver={primaryDriver}
      hasMoneyWeightedReturn={hasMoneyWeightedReturn}
      suspiciousMoneyWeightedReturn={suspiciousMoneyWeightedReturn}
      hasContribution={hasContribution}
      hasPositionRanking={hasPositionRanking}
      contributorScale={contributorScale}
      positivePositionContributors={positivePositionContributors}
      negativePositionContributors={negativePositionContributors}
    />
  ) : mode === "analysis" ? (
    <PerformanceAnalysisMode
      workspace={workspace}
      period={period}
      detailBasis={detailBasis}
      contributionDimension={contributionDimension}
      attributionDimension={attributionDimension}
      chartFrequency={chartFrequency}
      benchmark={benchmark}
      onRequestChange={onRequestChange}
      isUpdating={isUpdating}
      isDetailsPending={isDetailsPending}
      hasAttribution={hasAttribution}
      hasContribution={hasContribution}
      relativeSegmentRows={relativeSegmentRows}
      topAttributionEffectRows={topAttributionEffectRows}
      attributionEffectScale={attributionEffectScale}
    />
  ) : (
    <PerformanceEvidenceMode />
  );

  return (
    <WorkspaceLayout className="performance-layout">
      <WorkspaceMain className="performance-main">
        {!workspace ? (
          <Panel className="degraded-state-panel">
            <h2>Performance data unavailable</h2>
            <p className="error-text">
              The selected portfolio could not be loaded from the performance workspace contract.
            </p>
          </Panel>
        ) : (
          <>
            <div className="portfolio-segmented-control" role="tablist" aria-label="Performance workspace mode">
              {WORKSPACE_MODES.map((option) => {
                const isActive = option.key === mode;
                return (
                  <button
                    key={option.key}
                    type="button"
                    role="tab"
                    aria-selected={isActive}
                    className={`portfolio-segmented-control-button${
                      isActive ? " portfolio-segmented-control-button-active" : ""
                    }`}
                    onClick={() => setMode(option.key)}
                  >
                    {option.label}
                  </button>
                );
              })}
            </div>
            {modePanel}
          </>
        )}
      </WorkspaceMain>
    </WorkspaceLayout>
  );
}
