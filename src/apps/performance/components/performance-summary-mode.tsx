import dynamic from "next/dynamic";

import {
  DeferredModulePlaceholder,
  WorkspaceGrid,
} from "@/design-system";

import PerformanceSummaryHeaderSection from "./performance-summary-header-section";
import type { PerformanceSummaryModeProps } from "./performance-workspace-types";

// Workbench discipline:
// first paint keeps the header and compact summary region light.
// Heavy charting and secondary analytics modules load immediately after first paint.
const DeferredPerformanceChartPanel = dynamic(() => import("./performance-chart-panel"), {
  ssr: false,
  loading: () => (
    <DeferredModulePlaceholder
      title="Loading return path"
      message="Return path is loading after first paint."
    />
  ),
});

const DeferredPerformanceMultiHorizonPanel = dynamic(
  () => import("./performance-multi-horizon-panel"),
  {
    ssr: false,
    loading: () => (
      <DeferredModulePlaceholder
        title="Loading horizons"
        message="Horizon comparisons are loading after first paint."
      />
    ),
  }
);

const DeferredPerformanceSummaryContributorsSection = dynamic(
  () => import("./performance-summary-contributors-section"),
  {
    ssr: false,
    loading: () => (
      <DeferredModulePlaceholder
        title="Loading contributors"
        message="Contributor ranking is loading after first paint."
      />
    ),
  }
);

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
        <DeferredPerformanceChartPanel
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
        <DeferredPerformanceMultiHorizonPanel
          portfolioId={workspace.portfolio.portfolio_id}
          detailBasis={detailBasis}
          benchmark={workspace.benchmark_code ?? benchmark}
          chartFrequency={chartFrequency}
          benchmarkOptions={workspace.benchmark_options ?? []}
        />
        <DeferredPerformanceSummaryContributorsSection
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
