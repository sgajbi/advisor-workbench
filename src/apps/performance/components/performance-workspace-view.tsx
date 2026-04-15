import {
  MainWithSideRailLayout,
  Panel,
  WorkbenchPageFrame,
  WorkbenchSectionStack,
} from "@/design-system";

import { getPerformanceWorkspaceCapabilities } from "../capabilities";
import {
  getPerformanceWorkspaceModeDefinition,
} from "../performance-workspace-modes";
import {
  getPerformanceWorkspacePresentation,
} from "../view-model";
import PerformanceAdvisorBriefMode from "./performance-advisor-brief-mode";
import PerformanceAnalysisMode from "./performance-analysis-mode";
import PerformanceAnalyticalUnavailableState from "./performance-analytical-unavailable-state";
import PerformanceEvidenceMode from "./performance-evidence-mode";
import PerformanceRiskMode from "./performance-risk-mode";
import PerformanceSummaryMode from "./performance-summary-mode";
import PerformanceWorkspaceRail from "./performance-workspace-rail";
import PerformanceWorkspaceSidePanel from "./performance-workspace-side-panel";
import type {
  PerformanceWorkspaceControls,
  PerformanceWorkspaceViewProps,
} from "./performance-workspace-types";
import {
  getBenchmarkLabel,
  getPerformanceControlNormalizationNotice,
} from "./performance-workspace-view-helpers";

export default function PerformanceWorkspaceView({
  workspace,
  mode,
  period,
  detailBasis,
  contributionDimension,
  attributionDimension,
  chartFrequency,
  benchmark,
  onModeChange,
  onRequestChange,
  isUpdating = false,
  isDetailsPending = false,
}: PerformanceWorkspaceViewProps) {
  const presentation = workspace ? getPerformanceWorkspacePresentation(workspace) : null;
  const capabilities = workspace ? getPerformanceWorkspaceCapabilities(workspace) : null;
  const modeDefinition = getPerformanceWorkspaceModeDefinition(mode);
  const workspaceTitle = modeDefinition.workspaceTitle;
  const selectedBenchmarkCode = workspace?.benchmark_code ?? benchmark ?? undefined;
  const selectedBenchmarkLabel = workspace
    ? getBenchmarkLabel(workspace, selectedBenchmarkCode)
    : undefined;
  const selectedPerformance =
    workspace && detailBasis === "GROSS" ? workspace.gross_performance : workspace?.net_performance;
  const controlNormalizationNotice = workspace
    ? getPerformanceControlNormalizationNotice(workspace)
    : null;
  const controls: PerformanceWorkspaceControls = {
    period,
    detailBasis,
    contributionDimension,
    attributionDimension,
    chartFrequency,
    benchmark,
    onRequestChange,
    isUpdating,
    isDetailsPending,
  };

  const modePanel = !workspace ? null : mode === "summary" ? (
    <PerformanceSummaryMode
      workspace={workspace}
      {...controls}
      capabilities={capabilities!}
      selectedBenchmarkCode={selectedBenchmarkCode}
      selectedBenchmarkLabel={selectedBenchmarkLabel}
      selectedPerformance={selectedPerformance}
      primaryDriver={presentation?.primaryDriver ?? null}
      hasMoneyWeightedReturn={presentation?.hasMoneyWeightedReturn ?? false}
      suspiciousMoneyWeightedReturn={presentation?.suspiciousMoneyWeightedReturn ?? false}
      contributorScale={presentation?.contributorScale ?? 0.01}
      positivePositionContributors={presentation?.positivePositionContributors ?? []}
      negativePositionContributors={presentation?.negativePositionContributors ?? []}
      topContributors={presentation?.topContributors ?? []}
      bottomContributors={presentation?.bottomContributors ?? []}
    />
  ) : mode === "analysis" ? (
    <PerformanceAnalysisMode
      workspace={workspace}
      {...controls}
      capabilities={capabilities!}
    />
  ) : mode === "advisor" ? (
    <PerformanceAdvisorBriefMode
      workspace={workspace}
      {...controls}
      capabilities={capabilities!}
      onSelectMode={onModeChange}
    />
  ) : mode === "risk" ? (
    <PerformanceRiskMode
      workspace={workspace}
      {...controls}
      capabilities={capabilities!}
    />
  ) : (
    <PerformanceEvidenceMode capability={capabilities!.evidence} />
  );

  return (
    <MainWithSideRailLayout
      className="performance-layout"
      railClassName="performance-rail-shell"
      mainClassName="performance-main"
      sideClassName="performance-side performance-side-wide"
      sideDensity="comfortable"
      rail={
        <PerformanceWorkspaceRail
          workspace={workspace}
          mode={mode}
          period={period}
          isDetailsPending={isDetailsPending}
          capabilities={capabilities}
          selectedBenchmarkLabel={selectedBenchmarkLabel}
          onModeChange={onModeChange}
          onRequestChange={onRequestChange}
        />
      }
      main={
        !workspace ? (
            <WorkbenchPageFrame
            className={`performance-page-frame performance-page-frame-${mode}`}
            bodyClassName="performance-page-frame-body"
            title={workspaceTitle}
          >
            <WorkbenchSectionStack className="performance-page-sections">
              <Panel className="performance-page-unavailable-shell">
                <PerformanceAnalyticalUnavailableState
                  ariaLabel="Performance workspace unavailable"
                  status="unavailable"
                  title="Performance data unavailable"
                  body="The selected portfolio could not be loaded from the performance workspace contract."
                  hint="The performance workspace contract must resolve successfully before benchmark-aware return, contribution, and risk surfaces can render."
                  contextItems={[
                    { label: "Surface", value: workspaceTitle },
                    { label: "Mode", value: modeDefinition.label },
                  ]}
                  availableItems={[
                    {
                      label: "Shell",
                      value: "Workspace navigation and route context remain available.",
                    },
                  ]}
                />
              </Panel>
            </WorkbenchSectionStack>
          </WorkbenchPageFrame>
        ) : (
          <WorkbenchPageFrame
            className={`performance-page-frame performance-page-frame-${mode}`}
            bodyClassName="performance-page-frame-body"
            title={workspaceTitle}
          >
            <WorkbenchSectionStack className="performance-page-sections">
              {controlNormalizationNotice ? (
                <div
                  className="performance-control-normalization-note"
                  role="status"
                  aria-label="Performance control normalization"
                >
                  <p className="performance-control-normalization-note-title">
                    {controlNormalizationNotice.title}
                  </p>
                  <p className="performance-control-normalization-note-message">
                    {controlNormalizationNotice.message}
                  </p>
                </div>
              ) : null}
              {modePanel}
            </WorkbenchSectionStack>
          </WorkbenchPageFrame>
        )
      }
      side={
        <PerformanceWorkspaceSidePanel
          workspace={workspace}
          mode={mode}
          period={period}
          detailBasis={detailBasis}
          chartFrequency={chartFrequency}
          capabilities={capabilities}
          selectedBenchmarkLabel={selectedBenchmarkLabel}
          onModeChange={onModeChange}
        />
      }
    />
  );
}
