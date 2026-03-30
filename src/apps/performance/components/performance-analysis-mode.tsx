import { WorkspaceGrid } from "@/design-system";

import PerformanceAnalysisAttributionSection from "./performance-analysis-attribution-section";
import PerformanceAnalysisContributionSection from "./performance-analysis-contribution-section";
import PerformanceAttributionTrendPanel from "./performance-attribution-trend-panel";
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
  return (
    <WorkspaceGrid className="performance-detail-grid performance-analysis-stage">
      <PerformanceAttributionTrendPanel
        portfolioId={workspace.portfolio.portfolio_id}
        period={period}
        chartFrequency={chartFrequency}
        attributionDimension={attributionDimension}
        detailBasis={detailBasis}
        benchmark={workspace.benchmark_code ?? benchmark}
        reportStartDate={workspace.report_start_date}
        reportEndDate={workspace.report_end_date}
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
  );
}
