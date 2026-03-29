import { useState } from "react";

import { Panel, WorkspaceLayout, WorkspaceMain } from "@/design-system";
import type { WorkbenchPerformanceWorkspace } from "@/features/workbench/types";

import {
  getPerformanceWorkspacePresentation,
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

  const presentation = workspace ? getPerformanceWorkspacePresentation(workspace) : null;
  const selectedBenchmarkCode = workspace?.benchmark_code ?? benchmark ?? undefined;
  const selectedBenchmarkLabel = workspace
    ? getBenchmarkLabel(workspace, selectedBenchmarkCode)
    : undefined;
  const selectedPerformance =
    workspace && detailBasis === "GROSS" ? workspace.gross_performance : workspace?.net_performance;

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
      hasBenchmark={presentation?.hasBenchmark ?? false}
      hasHistory={presentation?.hasHistory ?? false}
      selectedBenchmarkCode={selectedBenchmarkCode}
      selectedBenchmarkLabel={selectedBenchmarkLabel}
      selectedPerformance={selectedPerformance}
      primaryDriver={presentation?.primaryDriver ?? null}
      hasMoneyWeightedReturn={presentation?.hasMoneyWeightedReturn ?? false}
      suspiciousMoneyWeightedReturn={presentation?.suspiciousMoneyWeightedReturn ?? false}
      hasContribution={presentation?.hasContribution ?? false}
      hasPositionRanking={presentation?.hasPositionRanking ?? false}
      contributorScale={presentation?.contributorScale ?? 0.01}
      positivePositionContributors={presentation?.positivePositionContributors ?? []}
      negativePositionContributors={presentation?.negativePositionContributors ?? []}
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
      hasAttribution={presentation?.hasAttribution ?? false}
      hasContribution={presentation?.hasContribution ?? false}
      relativeSegmentRows={presentation?.relativeSegmentRows ?? []}
      topAttributionEffectRows={presentation?.topAttributionEffectRows ?? []}
      attributionEffectScale={presentation?.attributionEffectScale ?? 0.01}
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
