import { createServer, type Server } from 'node:http';

import type {
  PerformanceComparativeSummary,
  WorkbenchPerformanceWorkspaceDetails,
  WorkbenchPerformanceWorkspaceSummary,
} from '../../src/features/workbench/types';
import {
  buildPerformanceAttributionTrend,
  buildPerformanceHorizonComparison,
  buildPerformanceWorkspaceDetails,
  buildPerformanceWorkspaceSummary,
} from '../fixtures/performance-workspace-fixtures';

export type PerformanceFixtureGatewayScenario = 'populated' | 'unavailable';

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

    if (!portfolioId) {
      sendJson(response, { code: 'fixture_route_not_found' }, 404);
      return;
    }

    if (requestUrl.pathname.endsWith('/performance/summary')) {
      sendJson(
        response,
        buildSummaryResponse(portfolioId, scenario),
        200,
        'perf-reference;dur=1, perf-benchmark;dur=1, perf-summary;dur=1',
      );
      return;
    }
    if (requestUrl.pathname.endsWith('/performance/details')) {
      sendJson(
        response,
        buildDetailsResponse(portfolioId, scenario),
        200,
        'perf-reference;dur=1, perf-benchmark;dur=1, perf-summary;dur=1',
      );
      return;
    }
    if (requestUrl.pathname.endsWith('/performance/horizon-comparison')) {
      const horizon = buildPerformanceHorizonComparison(portfolioId);
      sendJson(
        response,
        scenario === 'populated'
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
      sendJson(
        response,
        buildPerformanceAttributionTrend(portfolioId),
        200,
        'perf-reference;dur=1, perf-benchmark;dur=1, perf-attribution;dur=1',
      );
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

function buildSummaryResponse(
  portfolioId: string,
  scenario: PerformanceFixtureGatewayScenario,
): WorkbenchPerformanceWorkspaceSummary {
  const summary = buildPerformanceWorkspaceSummary(
    portfolioId,
    scenario === 'unavailable'
      ? { unassignedBenchmark: true, unavailableSummarySeries: true }
      : undefined,
  );
  if (scenario === 'populated') {
    return {
      ...summary,
      capabilities: buildPopulatedCapabilities(summary.capabilities),
      evidence_view: summary.evidence_view
        ? { ...summary.evidence_view, state: 'supported', reason: null }
        : null,
    };
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
): WorkbenchPerformanceWorkspaceDetails {
  const details = buildPerformanceWorkspaceDetails(
    portfolioId,
    scenario === 'unavailable'
      ? { unassignedBenchmark: true, unavailableSummarySeries: true }
      : undefined,
  );
  if (scenario === 'populated') {
    return {
      ...details,
      capabilities: buildPopulatedCapabilities(details.capabilities),
      evidence_view: details.evidence_view
        ? { ...details.evidence_view, state: 'supported', reason: null }
        : null,
    };
  }
  return {
    ...details,
    capabilities: buildUnavailableCapabilities(details.capabilities),
    net_chart: [],
    gross_chart: [],
    contribution: null,
  };
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
