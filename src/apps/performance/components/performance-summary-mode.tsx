import {
  WorkspaceGrid,
} from "@/design-system";

import PerformanceChartPanel from "./performance-chart-panel";
import PerformanceMultiHorizonPanel from "./performance-multi-horizon-panel";
import PerformanceSummaryContributorsSection from "./performance-summary-contributors-section";
import PerformanceSummaryHeaderSection from "./performance-summary-header-section";
import type { PerformanceSummaryModeProps } from "./performance-workspace-types";

export default function PerformanceSummaryMode({
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
  hasBenchmark,
  hasHistory,
  selectedBenchmarkCode,
  selectedBenchmarkLabel,
  selectedPerformance,
  primaryDriver,
  hasMoneyWeightedReturn,
  suspiciousMoneyWeightedReturn,
  hasContribution,
  hasPositionRanking,
  contributorScale,
  positivePositionContributors,
  negativePositionContributors,
}: PerformanceSummaryModeProps) {
  return (
    <>
      <PerformanceSummaryHeaderSection
        workspace={workspace}
        detailBasis={detailBasis}
        hasBenchmark={hasBenchmark}
        hasHistory={hasHistory}
        selectedBenchmarkCode={selectedBenchmarkCode}
        selectedBenchmarkLabel={selectedBenchmarkLabel}
        selectedPerformance={selectedPerformance}
        primaryDriver={primaryDriver}
        hasMoneyWeightedReturn={hasMoneyWeightedReturn}
        suspiciousMoneyWeightedReturn={suspiciousMoneyWeightedReturn}
      />

      <WorkspaceGrid className="performance-chart-grid">
        <PerformanceChartPanel
          title={detailBasis === "GROSS" ? "Gross Return Path" : "Net Return Path"}
          points={detailBasis === "GROSS" ? workspace.gross_chart : workspace.net_chart}
          summary={detailBasis === "GROSS" ? workspace.gross_performance : workspace.net_performance}
          portfolioId={workspace.portfolio.portfolio_id}
          period={period}
          detailBasis={detailBasis}
          contributionDimension={contributionDimension}
          attributionDimension={attributionDimension}
          chartFrequency={chartFrequency}
          benchmark={benchmark}
          benchmarkOptions={workspace.benchmark_options ?? []}
          reportStartDate={workspace.report_start_date}
          reportEndDate={workspace.report_end_date}
          onRequestChange={onRequestChange ?? (() => undefined)}
          isUpdating={isUpdating}
          isDetailsPending={isDetailsPending}
          id="performance-trend"
        />
      </WorkspaceGrid>

      <WorkspaceGrid className="performance-detail-grid">
        <PerformanceMultiHorizonPanel
          portfolioId={workspace.portfolio.portfolio_id}
          detailBasis={detailBasis}
          benchmark={workspace.benchmark_code ?? benchmark}
          chartFrequency={chartFrequency}
          benchmarkOptions={workspace.benchmark_options ?? []}
        />
        <PerformanceSummaryContributorsSection
          workspace={workspace}
          hasContribution={hasContribution}
          hasPositionRanking={hasPositionRanking}
          contributorScale={contributorScale}
          positivePositionContributors={positivePositionContributors}
          negativePositionContributors={negativePositionContributors}
          isDetailsPending={isDetailsPending}
        />
      </WorkspaceGrid>
    </>
  );
}
