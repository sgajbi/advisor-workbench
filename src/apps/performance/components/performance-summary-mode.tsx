import {
  AnalyticsModule,
  AnalyticsRankedList,
  WorkspaceGrid,
} from "@/design-system";

import { formatPct } from "../formatters";
import PerformanceChartPanel from "./performance-chart-panel";
import PerformanceMultiHorizonPanel from "./performance-multi-horizon-panel";
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
        <AnalyticsModule title="Top / Bottom Contributors" subtitle={`${workspace.period} position ranking`}>
          {hasContribution ? (
            hasPositionRanking ? (
              <div className="performance-contributors-grid">
                <AnalyticsRankedList
                  title="Highest"
                  label="Contribution"
                  scale={contributorScale}
                  rows={positivePositionContributors.map((row) => ({
                    key: `top-position-${row.position_id}`,
                    title: row.position_id,
                    subtitle: `Avg. Weight ${formatPct(row.weight_avg_pct)}`,
                    value: formatPct(row.contribution_pct),
                    magnitudePct: row.contribution_pct,
                    tone: "positive" as const,
                  }))}
                  emptyMessage="No positive contributors are present for the selected analytical slice."
                />
                <AnalyticsRankedList
                  title="Lowest"
                  label="Contribution"
                  scale={contributorScale}
                  rows={negativePositionContributors.map((row) => ({
                    key: `bottom-position-${row.position_id}`,
                    title: row.position_id,
                    subtitle: `Avg. Weight ${formatPct(row.weight_avg_pct)}`,
                    value: formatPct(row.contribution_pct),
                    magnitudePct: row.contribution_pct,
                    tone: "negative" as const,
                  }))}
                  emptyMessage="No detractors are present for the selected analytical slice."
                />
              </div>
            ) : (
              <p className="muted">
                Position-level contributor ranking is not available from the current analytics
                contract.
              </p>
            )
          ) : isDetailsPending ? (
            <p className="muted">Loading contributor ranking for the selected analytical slice.</p>
          ) : (
            <p className="muted">Contributor ranking is not available for the current selection.</p>
          )}
        </AnalyticsModule>
      </WorkspaceGrid>
    </>
  );
}
