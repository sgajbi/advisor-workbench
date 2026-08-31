import type { APIRequestContext } from '@playwright/test';

import type {
  PerformanceModuleCapability,
  WorkbenchPerformanceWorkspaceSummary,
} from '../../src/features/workbench/types';

const PERFORMANCE_SMOKE_PAGE_SELECTION = new URLSearchParams({
  period: 'YTD',
  chartFrequency: 'monthly',
  contributionDimension: 'asset_class',
  attributionDimension: 'asset_class',
  detailBasis: 'NET',
});
const PERFORMANCE_SMOKE_API_SELECTION = new URLSearchParams({
  period: 'YTD',
  chart_frequency: 'monthly',
  contribution_dimension: 'asset_class',
  attribution_dimension: 'asset_class',
  detail_basis: 'NET',
});

type PerformanceCapabilityState = PerformanceModuleCapability['state'];

export type PerformanceSummaryPosture = {
  populated: boolean;
  benchmarkAssigned: boolean;
  capabilities: {
    summary: PerformanceCapabilityState;
    returnPath: PerformanceCapabilityState;
    benchmark: PerformanceCapabilityState;
    horizon: PerformanceCapabilityState;
    contributors: PerformanceCapabilityState;
    evidence: PerformanceCapabilityState;
  };
  metrics: {
    openingMarketValue: boolean;
    netFlow: boolean;
    openingCash: boolean;
    closingCash: boolean;
    flowAdjustedMarketValue: boolean;
    endingMarketValue: boolean;
    moneyWeightedReturn: boolean;
  };
};

export function buildPerformanceSmokePagePath(portfolioId: string): string {
  return `/performance?portfolioId=${encodeURIComponent(portfolioId)}&${PERFORMANCE_SMOKE_PAGE_SELECTION}`;
}

export function buildPerformanceSmokeSummaryPath(portfolioId: string): string {
  return `/api/bff/api/v1/workbench/${encodeURIComponent(portfolioId)}/performance/summary?${PERFORMANCE_SMOKE_API_SELECTION}`;
}

export async function loadPerformanceSmokeSummary(
  request: APIRequestContext,
  portfolioId: string,
): Promise<WorkbenchPerformanceWorkspaceSummary> {
  const response = await request.get(
    buildPerformanceSmokeSummaryPath(portfolioId),
    {
      headers: { 'cache-control': 'no-store' },
      timeout: 60_000,
    },
  );
  if (!response.ok()) {
    throw new Error(
      `Performance summary supportability request failed with HTTP ${response.status()}.`,
    );
  }
  return (await response.json()) as WorkbenchPerformanceWorkspaceSummary;
}

export function classifyPerformanceSummaryPosture(
  summary: WorkbenchPerformanceWorkspaceSummary,
): PerformanceSummaryPosture {
  if (!summary.capabilities) {
    throw new Error('Performance summary contract did not expose module capabilities.');
  }

  const selectedPerformance =
    summary.detail_basis.toUpperCase() === 'GROSS'
      ? summary.gross_performance
      : summary.net_performance;
  const metrics = {
    openingMarketValue: isReported(selectedPerformance.begin_market_value),
    netFlow: isReported(selectedPerformance.net_cash_flow),
    openingCash: isReported(selectedPerformance.beginning_cash_flow),
    closingCash: isReported(selectedPerformance.ending_cash_flow),
    flowAdjustedMarketValue: isReported(selectedPerformance.flow_adjusted_end_market_value),
    endingMarketValue: isReported(selectedPerformance.end_market_value),
    moneyWeightedReturn: isReported(summary.money_weighted_return?.money_weighted_return_pct),
  };
  const capabilities = {
    summary: summary.capabilities.summary_kpis.state,
    returnPath: summary.capabilities.return_path.state,
    benchmark: summary.capabilities.benchmark_comparison.state,
    horizon: summary.capabilities.multi_horizon_returns.state,
    contributors: summary.capabilities.contribution_ranking.state,
    evidence: summary.capabilities.evidence.state,
  };

  return {
    populated:
      [
        capabilities.summary,
        capabilities.returnPath,
        capabilities.benchmark,
        capabilities.horizon,
        capabilities.contributors,
      ].every((state) => state === 'supported') &&
      Object.values(metrics).every(Boolean),
    benchmarkAssigned:
      Boolean(summary.benchmark_code) ||
      (summary.benchmark_options ?? []).some((option) => option.is_assigned),
    capabilities,
    metrics,
  };
}

function isReported(value: number | null | undefined): boolean {
  return value !== null && value !== undefined && Number.isFinite(value);
}
