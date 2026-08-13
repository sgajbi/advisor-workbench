import { createServer, type Server } from 'node:http';

import type {
  PerformanceComparativeSummary,
  WorkbenchPerformanceAdvisorBrief,
  WorkbenchPerformanceWorkspaceDetails,
  WorkbenchPerformanceWorkspaceSummary,
} from '../../src/features/workbench/types';
import {
  buildPerformanceAttributionTrend,
  buildPerformanceHorizonComparison,
  buildPerformanceWorkspaceDetails,
  buildPerformanceWorkspaceSummary,
} from '../fixtures/performance-workspace-fixtures';
import { fallbackNormalizedCapabilities } from '../../src/features/platform-capabilities/api';

export type PerformanceFixtureGatewayScenario =
  | 'populated'
  | 'unavailable'
  | 'refresh-integrity'
  | 'trend-integrity'
  | 'horizon-integrity'
  | 'analysis-controls';

export type PerformanceFixtureGateway = {
  close: () => Promise<void>;
  port: number;
};

export async function startPerformanceFixtureGateway({
  port,
  scenario,
}: {
  port: number;
  scenario: PerformanceFixtureGatewayScenario;
}): Promise<PerformanceFixtureGateway> {
  let summaryRefreshFailuresRemaining = scenario === 'refresh-integrity' ? 1 : 0;
  let detailsRefreshFailuresRemaining = scenario === 'refresh-integrity' ? 1 : 0;
  let trendRefreshFailuresRemaining = scenario === 'trend-integrity' ? 1 : 0;
  let horizonRefreshFailuresRemaining = scenario === 'horizon-integrity' ? 1 : 0;
  const server = createServer((request, response) => {
    const requestUrl = new URL(request.url ?? '/', `http://127.0.0.1:${port}`);
    const portfolioId = resolvePortfolioId(requestUrl.pathname);

    if (requestUrl.pathname === '/api/v1/lookups/portfolios') {
      sendJson(response, {
        items: [
          {
            id: 'PB_SG_GLOBAL_BAL_001',
            label: 'Global Balanced Mandate',
          },
        ],
      });
      return;
    }

    if (requestUrl.pathname === '/api/v1/platform/capabilities') {
      sendJson(response, {
        data: {
          consumerSystem: requestUrl.searchParams.get('consumerSystem') ?? 'UI',
          tenantId: requestUrl.searchParams.get('tenantId') ?? 'default',
          contractVersion: 'v1',
          sources: {},
          partialFailure: false,
          errors: [],
          normalized: fallbackNormalizedCapabilities(),
        },
      });
      return;
    }

    if (!portfolioId) {
      sendJson(response, { code: 'fixture_route_not_found' }, 404);
      return;
    }

    if (requestUrl.pathname.endsWith('/performance/summary')) {
      if (requestUrl.searchParams.get('period') === '3Y' && summaryRefreshFailuresRemaining > 0) {
        summaryRefreshFailuresRemaining -= 1;
        sendJson(response, { code: 'performance_summary_temporarily_unavailable' }, 503);
        return;
      }
      const summaryResponse = buildSummaryResponse(portfolioId, scenario, requestUrl);
      const sendSummary = () =>
        sendJson(
          response,
          summaryResponse,
          200,
          'perf-reference;dur=1, perf-benchmark;dur=1, perf-summary;dur=1',
        );
      if (scenario === 'analysis-controls' && isChangedSourceSelection(requestUrl)) {
        setTimeout(sendSummary, 250);
      } else {
        sendSummary();
      }
      return;
    }
    if (requestUrl.pathname.endsWith('/performance/details')) {
      if (
        requestUrl.searchParams.get('contribution_dimension') === 'sector' &&
        detailsRefreshFailuresRemaining > 0
      ) {
        detailsRefreshFailuresRemaining -= 1;
        sendJson(response, { code: 'performance_details_temporarily_unavailable' }, 502);
        return;
      }
      const detailsResponse = buildDetailsResponse(portfolioId, scenario, requestUrl);
      const sendDetails = () =>
        sendJson(
          response,
          detailsResponse,
          200,
          'perf-reference;dur=1, perf-benchmark;dur=1, perf-summary;dur=1',
        );
      if (scenario === 'analysis-controls' && isChangedSourceSelection(requestUrl)) {
        setTimeout(sendDetails, 250);
      } else {
        sendDetails();
      }
      return;
    }
    if (requestUrl.pathname.endsWith('/performance/horizon-comparison')) {
      if (horizonRefreshFailuresRemaining > 0) {
        horizonRefreshFailuresRemaining -= 1;
        sendJson(response, { code: 'performance_horizon_comparison_temporarily_unavailable' }, 503);
        return;
      }
      const horizon = buildPerformanceHorizonComparison(portfolioId);
      if (scenario === 'horizon-integrity') {
        setTimeout(() => {
          sendJson(
            response,
            horizon,
            200,
            'perf-reference;dur=1, perf-benchmark;dur=1, perf-horizon;dur=1',
          );
        }, 250);
        return;
      }
      sendJson(
        response,
        scenario !== 'unavailable'
          ? horizon
          : {
              ...horizon,
              benchmark_code: null,
              benchmark_options: [],
              rows: [],
            },
        200,
        'perf-reference;dur=1, perf-benchmark;dur=1, perf-horizon;dur=1',
      );
      return;
    }
    if (requestUrl.pathname.endsWith('/performance/attribution-trend')) {
      if (trendRefreshFailuresRemaining > 0) {
        trendRefreshFailuresRemaining -= 1;
        sendJson(response, { code: 'performance_attribution_trend_temporarily_unavailable' }, 503);
        return;
      }
      if (scenario === 'trend-integrity') {
        setTimeout(() => {
          sendJson(
            response,
            buildPerformanceAttributionTrend(portfolioId),
            200,
            'perf-reference;dur=1, perf-benchmark;dur=1, perf-attribution;dur=1',
          );
        }, 250);
        return;
      }
      sendJson(
        response,
        buildPerformanceAttributionTrend(portfolioId),
        200,
        'perf-reference;dur=1, perf-benchmark;dur=1, perf-attribution;dur=1',
      );
      return;
    }
    if (requestUrl.pathname.endsWith('/performance/advisor-brief')) {
      sendJson(response, buildAdvisorBriefResponse(portfolioId));
      return;
    }

    sendJson(response, { code: 'fixture_route_not_found' }, 404);
  });

  await listen(server, port);
  return {
    port,
    close: () => close(server),
  };
}

function buildAdvisorBriefResponse(portfolioId: string): WorkbenchPerformanceAdvisorBrief {
  return {
    correlation_id: 'corr-advisor-brief-e2e',
    contract_version: 'v1',
    portfolio_id: portfolioId,
    portfolio: {
      portfolio_id: portfolioId,
      client_id: 'CIF_1001',
      base_currency: 'USD',
      booking_center_code: 'SG',
    },
    as_of_date: '2026-02-24',
    period: 'YTD',
    report_start_date: '2026-01-01',
    report_end_date: '2026-02-24',
    detail_basis: 'NET',
    chart_frequency: 'monthly',
    contribution_dimension: 'asset_class',
    attribution_dimension: 'asset_class',
    benchmark_code: 'BMK_GLOBAL_BALANCED_60_40',
    status: 'ready',
    summary: 'Source-grounded performance narrative is ready for advisor review.',
    talking_points: [
      {
        headline: 'Portfolio outperformed its benchmark over the selected period.',
        detail: 'Active return was positive on a net basis.',
        tone: 'positive',
        evidence_refs: [
          {
            metric_label: 'Active Return',
            metric_value: '0.51%',
            source_surface: 'performance.return_path',
            target_mode: 'summary',
            route: `/performance?portfolioId=${portfolioId}`,
          },
        ],
      },
    ],
    recommended_actions: [],
    risks_and_exceptions: [],
    source_metrics: [
      {
        label: 'Active Return',
        value: '0.51%',
        support_label: 'YTD Net',
        target_mode: 'summary',
        route: `/performance?portfolioId=${portfolioId}`,
        state: 'ready',
      },
    ],
    supportability: [{ label: 'Advisor Brief', value: 'Ready', tone: 'success' }],
    workflow_pack_run: {
      run_id: 'packrun_advisor_brief_e2e',
      runtime_state: 'COMPLETED',
      review_state: 'AWAITING_REVIEW',
      allowed_review_actions: ['ACCEPT', 'REJECT'],
      supportability_status: 'ACTION_REQUIRED',
      review_pending: true,
      superseded: false,
      workflow_authority_owner: 'lotus-gateway',
      current_summary_note: 'Human review is required before downstream use.',
      replacement_run_id: null,
      findings: [],
    },
    ai_audit: {
      task_id: 'explain.v1',
      provider_mode: 'local_openai_compatible',
      provider_id: 'text.local',
      model_id: 'qwen3:8b',
      generated_at: '2026-02-24T00:00:00Z',
      stubbed: false,
    },
    ai_evidence: {
      source_refs: [
        `lotus-gateway:workbench:${portfolioId}:performance-summary:YTD`,
        'lotus-ai:task:explain.v1',
      ],
    },
    warnings: [],
    partial_failures: [],
  };
}

function buildSummaryResponse(
  portfolioId: string,
  scenario: PerformanceFixtureGatewayScenario,
  requestUrl: URL,
): WorkbenchPerformanceWorkspaceSummary {
  const summary = buildPerformanceWorkspaceSummary(
    portfolioId,
    scenario === 'unavailable'
      ? { unassignedBenchmark: true, unavailableSummarySeries: true }
      : undefined,
  );
  if (scenario !== 'unavailable') {
    return applyRequestedSummaryContext(
      {
        ...summary,
        benchmark_options: buildFixtureBenchmarkOptions(summary.benchmark_options),
        capabilities: buildPopulatedCapabilities(summary.capabilities),
        evidence_view: summary.evidence_view
          ? { ...summary.evidence_view, state: 'supported', reason: null }
          : null,
      },
      requestUrl,
    );
  }
  return {
    ...summary,
    capabilities: buildUnavailableCapabilities(summary.capabilities),
    money_weighted_return: null,
    net_performance: clearPerformanceEconomics(summary.net_performance),
    gross_performance: clearPerformanceEconomics(summary.gross_performance),
  };
}

function buildDetailsResponse(
  portfolioId: string,
  scenario: PerformanceFixtureGatewayScenario,
  requestUrl: URL,
): WorkbenchPerformanceWorkspaceDetails {
  const details = buildPerformanceWorkspaceDetails(
    portfolioId,
    scenario === 'unavailable'
      ? { unassignedBenchmark: true, unavailableSummarySeries: true }
      : undefined,
  );
  if (scenario !== 'unavailable') {
    return applyRequestedDetailContext(
      {
        ...details,
        capabilities: buildPopulatedCapabilities(details.capabilities),
        evidence_view: details.evidence_view
          ? { ...details.evidence_view, state: 'supported', reason: null }
          : null,
      },
      requestUrl,
    );
  }
  return {
    ...details,
    capabilities: buildUnavailableCapabilities(details.capabilities),
    net_chart: [],
    gross_chart: [],
    contribution: null,
  };
}

function applyRequestedSummaryContext(
  summary: WorkbenchPerformanceWorkspaceSummary,
  requestUrl: URL,
): WorkbenchPerformanceWorkspaceSummary {
  const period = requestUrl.searchParams.get('period') ?? summary.period;
  const benchmarkCode = requestUrl.searchParams.get('benchmark_code') ?? summary.benchmark_code;
  return {
    ...summary,
    period,
    benchmark_code: benchmarkCode,
    report_start_date: period === '3Y' ? '2023-03-28' : summary.report_start_date,
  };
}

function applyRequestedDetailContext(
  details: WorkbenchPerformanceWorkspaceDetails,
  requestUrl: URL,
): WorkbenchPerformanceWorkspaceDetails {
  const period = requestUrl.searchParams.get('period') ?? details.period;
  const contributionDimension =
    requestUrl.searchParams.get('contribution_dimension') ?? details.contribution_dimension;
  const attributionDimension =
    requestUrl.searchParams.get('attribution_dimension') ?? details.attribution_dimension;
  const benchmarkCode = requestUrl.searchParams.get('benchmark_code') ?? details.benchmark_code;
  return {
    ...details,
    period,
    benchmark_code: benchmarkCode,
    report_start_date: period === '3Y' ? '2023-03-28' : details.report_start_date,
    contribution_dimension: contributionDimension,
    attribution_dimension: attributionDimension,
    segment: contributionDimension,
  };
}

function buildFixtureBenchmarkOptions(
  options: WorkbenchPerformanceWorkspaceSummary['benchmark_options'],
) {
  return [
    ...(options ?? []),
    {
      benchmark_code: 'BMK_PRIVATE_BANK',
      benchmark_name: 'Private Bank Composite',
      benchmark_currency: 'USD',
      benchmark_type: 'composite',
      benchmark_family: 'private_bank_reference',
      benchmark_provider: 'LOTUS_DEMO',
      is_assigned: false,
    },
  ];
}

function isChangedSourceSelection(requestUrl: URL) {
  return (
    requestUrl.searchParams.get('period') === '3Y' ||
    requestUrl.searchParams.get('benchmark_code') === 'BMK_PRIVATE_BANK'
  );
}

function buildPopulatedCapabilities(
  capabilities: WorkbenchPerformanceWorkspaceSummary['capabilities'],
): NonNullable<WorkbenchPerformanceWorkspaceSummary['capabilities']> {
  if (!capabilities) {
    throw new Error('Performance fixture requires explicit module capabilities.');
  }
  return {
    ...capabilities,
    evidence: {
      state: 'supported',
      reason: 'Calculation and lineage evidence is available for the populated fixture.',
    },
  };
}

function buildUnavailableCapabilities(
  capabilities: WorkbenchPerformanceWorkspaceSummary['capabilities'],
): NonNullable<WorkbenchPerformanceWorkspaceSummary['capabilities']> {
  if (!capabilities) {
    throw new Error('Performance fixture requires explicit module capabilities.');
  }
  return {
    ...capabilities,
    return_path: {
      state: 'unavailable',
      reason: 'Published return observations are unavailable for the governed fixture window.',
    },
    benchmark_comparison: {
      state: 'unavailable',
      reason: 'No benchmark is assigned to the governed fixture mandate.',
    },
    multi_horizon_returns: {
      state: 'unavailable',
      reason: 'Horizon returns are unavailable for the governed fixture mandate.',
    },
    contribution_ranking: {
      state: 'unavailable',
      reason: 'Contribution ranking is unavailable for the governed fixture mandate.',
    },
  };
}

function clearPerformanceEconomics(
  performance: PerformanceComparativeSummary,
): PerformanceComparativeSummary {
  return {
    ...performance,
    begin_market_value: null,
    end_market_value: null,
    beginning_cash_flow: null,
    ending_cash_flow: null,
    flow_adjusted_end_market_value: null,
    net_cash_flow: null,
  };
}

function resolvePortfolioId(pathname: string): string | null {
  const match = pathname.match(/^\/api\/v1\/workbench\/([^/]+)\/performance\//);
  return match ? decodeURIComponent(match[1]) : null;
}

function sendJson(
  response: import('node:http').ServerResponse,
  body: unknown,
  status = 200,
  serverTiming?: string,
): void {
  response.statusCode = status;
  response.setHeader('content-type', 'application/json');
  response.setHeader('cache-control', 'no-store');
  if (serverTiming) {
    response.setHeader('server-timing', serverTiming);
  }
  response.end(JSON.stringify(body));
}

function listen(server: Server, port: number): Promise<void> {
  return new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(port, '127.0.0.1', () => {
      server.off('error', reject);
      resolve();
    });
  });
}

function close(server: Server): Promise<void> {
  return new Promise((resolve, reject) => {
    server.close((error) => {
      if (error) {
        reject(error);
        return;
      }
      resolve();
    });
  });
}
