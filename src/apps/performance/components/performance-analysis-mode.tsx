import { WorkspaceGrid } from "@/design-system";

import { getPerformanceWorkspaceModeDefinition } from "../performance-workspace-modes";
import PerformanceAnalysisDecisionSummary from "./performance-analysis-decision-summary";
import PerformanceAnalysisAttributionSection from "./performance-analysis-attribution-section";
import PerformanceAnalysisContributionSection from "./performance-analysis-contribution-section";
import PerformanceAttributionTrendPanel from "./performance-attribution-trend-panel";
import PerformanceWorkspaceStageSurface, {
  buildPerformanceWorkspaceContextItems,
} from "./performance-workspace-stage-surface";
import type { PerformanceAnalysisModeProps } from "./performance-workspace-types";

export default function PerformanceAnalysisMode({
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
  relativeSegmentRows,
  topAttributionEffectRows,
  attributionEffectScale,
}: PerformanceAnalysisModeProps) {
  const modeIntro = getPerformanceWorkspaceModeDefinition("analysis").intro!;
  const contextItems = buildPerformanceWorkspaceContextItems({
    workspace,
    period,
    detailBasis,
    benchmark,
  });

  return (
    <PerformanceWorkspaceStageSurface
      intro={modeIntro}
      contextAriaLabel="Performance analysis context"
      contextItems={contextItems}
      shellClassName="performance-analysis-shell"
    >
      <PerformanceAnalysisDecisionSummary
        workspace={workspace}
        detailBasis={detailBasis}
        capabilities={capabilities}
      />
      <WorkspaceGrid className="performance-detail-grid performance-analysis-stage performance-lotus-stage performance-lotus-stage-analysis">
        <PerformanceAttributionTrendPanel
          portfolioId={workspace.portfolio.portfolio_id}
          period={period}
          chartFrequency={chartFrequency}
          attributionDimension={attributionDimension}
          detailBasis={detailBasis}
          benchmark={workspace.benchmark_code ?? benchmark}
          benchmarkOptions={workspace.benchmark_options ?? []}
          reportStartDate={workspace.report_start_date}
          reportEndDate={workspace.report_end_date}
          onRequestChange={onRequestChange}
        />
        <PerformanceAnalysisAttributionSection
          workspace={workspace}
          attributionDimension={attributionDimension}
          onRequestChange={onRequestChange}
          isUpdating={isUpdating}
          isDetailsPending={isDetailsPending}
          capabilities={capabilities}
          relativeSegmentRows={relativeSegmentRows}
          topAttributionEffectRows={topAttributionEffectRows}
          attributionEffectScale={attributionEffectScale}
        />
        <PerformanceAnalysisContributionSection
          workspace={workspace}
          contributionDimension={contributionDimension}
          onRequestChange={onRequestChange}
          isUpdating={isUpdating}
          isDetailsPending={isDetailsPending}
          capabilities={capabilities}
        />
      </WorkspaceGrid>
    </PerformanceWorkspaceStageSurface>
  );
}
