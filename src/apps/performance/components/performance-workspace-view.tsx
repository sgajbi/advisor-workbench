import dynamic from "next/dynamic";

import {
  DeferredWorkbenchMount,
  DeferredModulePlaceholder,
  MainWithSideRailLayout,
  Panel,
  WorkbenchPageFrame,
  WorkbenchSectionStack,
} from "@/design-system";

import { getPerformanceWorkspaceCapabilities } from "../capabilities";
import {
  getPerformanceWorkspacePresentation,
} from "../view-model";
import PerformanceWorkspaceModeSwitch, {
} from "./performance-workspace-mode-switch";
import PerformanceAdvisorBriefMode from "./performance-advisor-brief-mode";
import PerformanceRiskMode from "./performance-risk-mode";
import PerformanceSummaryMode from "./performance-summary-mode";
import type {
  PerformanceWorkspaceControls,
  PerformanceWorkspaceViewProps,
} from "./performance-workspace-types";
import {
  getBenchmarkLabel,
  getPerformanceControlNormalizationNotice,
} from "./performance-workspace-view-helpers";

// Workbench discipline:
// - summary header and compact KPI/status content are first paint
// - analysis and evidence content are deferred until the user selects those modes
const DeferredPerformanceAnalysisMode = dynamic(() => import("./performance-analysis-mode"), {
  ssr: false,
  loading: () => (
    <DeferredModulePlaceholder
      title="Loading analysis"
      message="Attribution and contribution detail are loading on demand."
    />
  ),
});

const DeferredPerformanceEvidenceMode = dynamic(() => import("./performance-evidence-mode"), {
  ssr: false,
  loading: () => (
    <DeferredModulePlaceholder
      title="Loading evidence"
      message="Evidence context is loading on demand."
    />
  ),
});

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
    <DeferredWorkbenchMount
      placeholder={
        <DeferredModulePlaceholder
          title="Loading analysis"
          message="Attribution and contribution detail are loading on demand."
        />
      }
    >
      <DeferredPerformanceAnalysisMode
        workspace={workspace}
        {...controls}
        capabilities={capabilities!}
        relativeSegmentRows={presentation?.relativeSegmentRows ?? []}
        topAttributionEffectRows={presentation?.topAttributionEffectRows ?? []}
        attributionEffectScale={presentation?.attributionEffectScale ?? 0.01}
      />
    </DeferredWorkbenchMount>
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
    <DeferredWorkbenchMount
      placeholder={
        <DeferredModulePlaceholder
          title="Loading evidence"
          message="Evidence context is loading on demand."
        />
      }
    >
      <DeferredPerformanceEvidenceMode capability={capabilities!.evidence} />
    </DeferredWorkbenchMount>
  );

  return (
    <MainWithSideRailLayout
      className="performance-layout"
      mainClassName="performance-main"
      main={
        !workspace ? (
          <Panel className="degraded-state-panel">
            <h2>Performance data unavailable</h2>
            <p className="error-text">
              The selected portfolio could not be loaded from the performance workspace contract.
            </p>
          </Panel>
        ) : (
          <WorkbenchPageFrame
            className={`performance-page-frame performance-page-frame-${mode}`}
            bodyClassName="performance-page-frame-body"
            title="Performance"
            actions={
              <PerformanceWorkspaceModeSwitch
                value={mode}
                onChange={onModeChange}
                capabilities={capabilities}
              />
            }
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
    />
  );
}
