import dynamic from "next/dynamic";
import { useState } from "react";

import {
  DeferredModulePlaceholder,
  Panel,
  WorkbenchPageHeader,
  WorkstationShell,
} from "@/design-system";

import {
  getPerformanceWorkspacePresentation,
} from "../view-model";
import PerformanceWorkspaceModeSwitch, {
  type PerformanceWorkspaceMode,
} from "./performance-workspace-mode-switch";
import PerformanceSummaryMode from "./performance-summary-mode";
import type {
  PerformanceWorkspaceControls,
  PerformanceWorkspaceViewProps,
} from "./performance-workspace-types";
import { getBenchmarkLabel } from "./performance-workspace-view-helpers";

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
  period,
  detailBasis,
  contributionDimension,
  attributionDimension,
  chartFrequency,
  benchmark,
  onRequestChange,
  isUpdating = false,
  isDetailsPending = false,
}: PerformanceWorkspaceViewProps) {
  const [mode, setMode] = useState<PerformanceWorkspaceMode>("summary");

  const presentation = workspace ? getPerformanceWorkspacePresentation(workspace) : null;
  const selectedBenchmarkCode = workspace?.benchmark_code ?? benchmark ?? undefined;
  const selectedBenchmarkLabel = workspace
    ? getBenchmarkLabel(workspace, selectedBenchmarkCode)
    : undefined;
  const selectedPerformance =
    workspace && detailBasis === "GROSS" ? workspace.gross_performance : workspace?.net_performance;
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
    <DeferredPerformanceAnalysisMode
      workspace={workspace}
      {...controls}
      hasAttribution={presentation?.hasAttribution ?? false}
      hasContribution={presentation?.hasContribution ?? false}
      relativeSegmentRows={presentation?.relativeSegmentRows ?? []}
      topAttributionEffectRows={presentation?.topAttributionEffectRows ?? []}
      attributionEffectScale={presentation?.attributionEffectScale ?? 0.01}
    />
  ) : (
    <DeferredPerformanceEvidenceMode />
  );

  return (
    <WorkstationShell
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
          <>
            <WorkbenchPageHeader
              title="Performance Workbench"
              subtitle="Benchmark-aware portfolio performance, attribution, and contribution analysis"
              actions={<PerformanceWorkspaceModeSwitch value={mode} onChange={setMode} />}
            />
            {modePanel}
          </>
        )
      }
    />
  );
}
