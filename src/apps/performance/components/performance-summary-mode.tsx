import dynamic from "next/dynamic";

import {
  DeferredModulePlaceholder,
  WorkspaceGrid,
  WorkbenchDeferredSection,
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
  capabilities,
  selectedBenchmarkCode,
  selectedBenchmarkLabel,
  selectedPerformance,
  hasMoneyWeightedReturn,
  suspiciousMoneyWeightedReturn,
  contributorScale,
  positivePositionContributors,
  negativePositionContributors,
}: PerformanceSummaryModeProps) {
  return (
    <>
      <PerformanceSummaryHeaderSection
        workspace={workspace}
        detailBasis={detailBasis}
        capabilities={capabilities}
        selectedBenchmarkCode={selectedBenchmarkCode}
        selectedBenchmarkLabel={selectedBenchmarkLabel}
        selectedPerformance={selectedPerformance}
        hasMoneyWeightedReturn={hasMoneyWeightedReturn}
        suspiciousMoneyWeightedReturn={suspiciousMoneyWeightedReturn}
      />

      <WorkspaceGrid className="performance-chart-grid workbench-summary-region">
        <WorkbenchDeferredSection
          className="performance-summary-context-section"
          title="Return path and benchmark context"
          subtitle="How the portfolio tracked against the selected benchmark over the current period."
          loadingTitle="Loading return path"
          loadingMessage="Return path is loading after first paint."
          deferHeader
          placeholder={null}
        >
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
            capabilities={capabilities}
            onRequestChange={onRequestChange ?? (() => undefined)}
            isUpdating={isUpdating}
            isDetailsPending={isDetailsPending}
            id="performance-trend"
          />
        </WorkbenchDeferredSection>
      </WorkspaceGrid>

      <WorkspaceGrid className="performance-detail-grid performance-secondary-zone workbench-summary-region">
        <WorkbenchDeferredSection
          className="performance-summary-driver-section"
          title="How did this compare across horizons?"
          subtitle="Benchmark-aware return comparison across standard reporting windows."
          loadingTitle="Loading horizons"
          loadingMessage="Horizon comparisons are loading after first paint."
          deferHeader
          placeholder={null}
        >
          <DeferredPerformanceMultiHorizonPanel
            portfolioId={workspace.portfolio.portfolio_id}
            period={period}
            detailBasis={detailBasis}
            benchmark={workspace.benchmark_code ?? benchmark}
            chartFrequency={chartFrequency}
            benchmarkOptions={workspace.benchmark_options ?? []}
          />
        </WorkbenchDeferredSection>
        <WorkbenchDeferredSection
          className="performance-summary-driver-section"
          title="What drove the result?"
          subtitle="Top contributors and detractors for the current performance outcome."
          loadingTitle="Loading contributors"
          loadingMessage="Contributor ranking is loading after first paint."
          deferHeader
          placeholder={null}
        >
          <DeferredPerformanceSummaryContributorsSection
            workspace={workspace}
            capabilities={capabilities}
            contributorScale={contributorScale}
            positivePositionContributors={positivePositionContributors}
            negativePositionContributors={negativePositionContributors}
            isDetailsPending={isDetailsPending}
          />
        </WorkbenchDeferredSection>
      </WorkspaceGrid>
    </>
  );
}
