import type { APIRequestContext } from '@playwright/test';
import { describe, expect, it, vi } from 'vitest';

import {
  buildPerformanceSmokePagePath,
  buildPerformanceSmokeSummaryPath,
  classifyPerformanceSummaryPosture,
  loadPerformanceSmokeSummary,
} from '../e2e/performance-workbench-supportability';
import {
  buildBenchmarkUnassignedPerformanceScenario,
  buildSupportedPerformanceScenario,
} from '../fixtures/performance-workspace-fixtures';

describe('Performance E2E supportability posture', () => {
  it('uses one explicit selection for the page and source contract', () => {
    expect(buildPerformanceSmokePagePath('PB SG/001')).toBe(
      '/performance?portfolioId=PB%20SG%2F001&period=YTD&chartFrequency=monthly&contributionDimension=asset_class&attributionDimension=asset_class&detailBasis=NET',
    );
    expect(buildPerformanceSmokeSummaryPath('PB SG/001')).toBe(
      '/api/bff/api/v1/workbench/PB%20SG%2F001/performance/summary?period=YTD&chart_frequency=monthly&contribution_dimension=asset_class&attribution_dimension=asset_class&detail_basis=NET',
    );
  });

  it('probes the configured Workbench origin through Playwright base URL resolution', async () => {
    const summary = buildSupportedPerformanceScenario().workspace;
    const get = vi.fn().mockResolvedValue({
      ok: () => true,
      json: () => Promise.resolve(summary),
    });

    await expect(
      loadPerformanceSmokeSummary({ get } as unknown as APIRequestContext, 'PB SG/001'),
    ).resolves.toBe(summary);
    expect(get).toHaveBeenCalledWith(buildPerformanceSmokeSummaryPath('PB SG/001'), {
      headers: { 'cache-control': 'no-store' },
      timeout: 60_000,
    });
  });

  it('classifies the governed populated precondition exactly', () => {
    expect(
      classifyPerformanceSummaryPosture(buildSupportedPerformanceScenario().workspace),
    ).toEqual({
      populated: true,
      benchmarkAssigned: true,
      capabilities: {
        summary: 'supported',
        returnPath: 'supported',
        benchmark: 'supported',
        horizon: 'supported',
        contributors: 'supported',
        evidence: 'unavailable',
      },
      metrics: {
        openingMarketValue: true,
        netFlow: true,
        openingCash: true,
        closingCash: true,
        flowAdjustedMarketValue: true,
        endingMarketValue: true,
        moneyWeightedReturn: true,
      },
    });
  });

  it('keeps a truthful unavailable contract out of populated layout proof', () => {
    const scenario = buildBenchmarkUnassignedPerformanceScenario();
    const posture = classifyPerformanceSummaryPosture(
      {
        ...scenario.workspace,
        net_performance: {
          ...scenario.workspace.net_performance,
          begin_market_value: null,
          net_cash_flow: null,
        },
      },
    );

    expect(posture.populated).toBe(false);
    expect(posture.benchmarkAssigned).toBe(false);
    expect(posture.capabilities).toMatchObject({
      returnPath: 'unavailable',
      benchmark: 'unavailable',
      evidence: 'unavailable',
    });
    expect(posture.metrics).toMatchObject({
      openingMarketValue: false,
      netFlow: false,
      moneyWeightedReturn: false,
    });
  });

  it('fails closed when the source contract omits capability posture', () => {
    const summary = {
      ...buildSupportedPerformanceScenario().workspace,
      capabilities: undefined,
    };

    expect(() => classifyPerformanceSummaryPosture(summary)).toThrow(
      'Performance summary contract did not expose module capabilities.',
    );
  });
});
