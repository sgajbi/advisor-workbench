import PerformanceAnalysisDecisionSummary from "./performance-analysis-decision-summary";
import PerformanceAnalysisAttributionSection from "./performance-analysis-attribution-section";
import PerformanceAnalysisContributionSection from "./performance-analysis-contribution-section";
import PerformanceAttributionTrendPanel from "./performance-attribution-trend-panel";
import PerformanceAnalysisControlBar from "./performance-analysis-control-bar";
import PerformanceWorkspaceStageSurface from "./performance-workspace-stage-surface";
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
}: PerformanceAnalysisModeProps) {
  return (
    <PerformanceWorkspaceStageSurface
      intro={null}
      shellClassName="performance-analysis-shell"
    >
      <PerformanceAnalysisControlBar
        controlBarAriaLabel="Performance analysis controls"
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
        ariaLabel="Performance analysis source selection"
        onRequestChange={onRequestChange ?? (async () => false)}
      />
      <PerformanceAnalysisDecisionSummary
        workspace={workspace}
        detailBasis={detailBasis}
        capabilities={capabilities}
      />
      <section className="performance-analysis-stage performance-lotus-stage performance-lotus-stage-analysis">
        <PerformanceAttributionTrendPanel
          portfolioId={workspace.portfolio.portfolio_id}
          period={period}
          chartFrequency={chartFrequency}
          attributionDimension={attributionDimension}
          detailBasis={detailBasis}
          benchmark={workspace.benchmark_code ?? benchmark}
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
        />
        <PerformanceAnalysisContributionSection
          workspace={workspace}
          contributionDimension={contributionDimension}
          onRequestChange={onRequestChange}
          isUpdating={isUpdating}
          isDetailsPending={isDetailsPending}
          capabilities={capabilities}
        />
      </section>
    </PerformanceWorkspaceStageSurface>
  );
}
