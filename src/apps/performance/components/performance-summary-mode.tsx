"use client";

import { useState } from "react";

import {
  WorkspaceGrid,
} from "@/design-system";

import PerformanceChartPanel from "./performance-chart-panel";
import type { PerformanceChartViewMode } from "./performance-chart-panel-helpers";
import PerformanceMultiHorizonPanel from "./performance-multi-horizon-panel";
import PerformanceSummaryContributorsSection from "./performance-summary-contributors-section";
import PerformanceWorkspaceStageSurface from "./performance-workspace-stage-surface";
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
  capabilities,
  contributorScale,
  positivePositionContributors,
  negativePositionContributors,
  topContributors,
  bottomContributors,
}: PerformanceSummaryModeProps) {
  const [returnView, setReturnView] = useState<PerformanceChartViewMode>("absolute");

  return (
    <PerformanceWorkspaceStageSurface
      intro={null}
      shellClassName="performance-summary-shell"
      shellAriaLabel="Performance decision workspace"
    >
      <WorkspaceGrid className="performance-chart-grid performance-lotus-stage performance-lotus-stage-chart workbench-summary-region performance-analysis-top-region">
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
          moneyWeightedReturn={workspace.money_weighted_return}
          reportingCurrency={workspace.portfolio.base_currency}
          reportStartDate={workspace.report_start_date}
          reportEndDate={workspace.report_end_date}
          capabilities={capabilities}
          onRequestChange={onRequestChange ?? (() => undefined)}
          isUpdating={isUpdating}
          isDetailsPending={isDetailsPending}
          returnView={returnView}
          onReturnViewChange={setReturnView}
          id="performance-trend"
        />
      </WorkspaceGrid>

      <WorkspaceGrid
        className="performance-detail-grid performance-secondary-zone performance-lotus-stage performance-lotus-stage-secondary workbench-summary-region"
      >
        <section className="performance-summary-driver-section">
          <PerformanceMultiHorizonPanel
            portfolioId={workspace.portfolio.portfolio_id}
            period={period}
            detailBasis={detailBasis}
            benchmark={workspace.benchmark_code ?? benchmark}
            chartFrequency={chartFrequency}
            reportStartDate={workspace.report_start_date}
            reportEndDate={workspace.report_end_date}
            benchmarkOptions={workspace.benchmark_options ?? []}
            returnView={returnView}
            onRequestChange={onRequestChange}
          />
        </section>
        <section className="performance-summary-driver-section performance-summary-contributors-section">
          <PerformanceSummaryContributorsSection
            workspace={workspace}
            capabilities={capabilities}
            contributorScale={contributorScale}
            positivePositionContributors={positivePositionContributors}
            negativePositionContributors={negativePositionContributors}
            topContributors={topContributors}
            bottomContributors={bottomContributors}
            isDetailsPending={isDetailsPending}
          />
        </section>
      </WorkspaceGrid>
    </PerformanceWorkspaceStageSurface>
  );
}
