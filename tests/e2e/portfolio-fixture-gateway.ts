import { createServer, type Server, type ServerResponse } from 'node:http';

const PORTFOLIO_ID = 'PB_SG_GLOBAL_BAL_001';
const AS_OF_DATE = '2026-04-10';
const HISTORICAL_AS_OF_DATE = '2026-03-31';

export type PortfolioFixtureGateway = {
  close: () => Promise<void>;
  port: number;
};

export async function startPortfolioFixtureGateway({
  port,
}: {
  port: number;
}): Promise<PortfolioFixtureGateway> {
  const server = createServer((request, response) => {
    const requestUrl = new URL(request.url ?? '/', `http://127.0.0.1:${port}`);

    if (requestUrl.pathname === '/api/v1/foundation/portfolios') {
      sendJson(response, {
        items: [{ portfolio_id: PORTFOLIO_ID }],
      });
      return;
    }

    if (requestUrl.pathname === '/api/v1/portfolio/portfolios') {
      sendJson(response, {
        items: [
          {
            portfolio_id: PORTFOLIO_ID,
            display_name: 'Global Balanced Mandate',
            client_id: 'CLIENT_SG_001',
            base_currency: 'USD',
            booking_center_code: 'SG',
            portfolio_type: 'ADVISORY',
            status: 'ACTIVE',
          },
        ],
      });
      return;
    }

    if (requestUrl.pathname === `/api/v1/portfolio/portfolios/${PORTFOLIO_ID}/workspace`) {
      sendJson(response, buildWorkspaceResponse());
      return;
    }

    if (requestUrl.pathname === `/api/v1/portfolio/portfolios/${PORTFOLIO_ID}/book`) {
      sendJson(
        response,
        buildBookResponse(requestUrl.searchParams.get('as_of_date') ?? AS_OF_DATE)
      );
      return;
    }

    if (requestUrl.pathname === `/api/v1/portfolio/portfolios/${PORTFOLIO_ID}/income-summary`) {
      sendJson(response, { reporting_currency: 'USD' });
      return;
    }

    if (requestUrl.pathname === `/api/v1/portfolio/portfolios/${PORTFOLIO_ID}/activity-summary`) {
      sendJson(response, { reporting_currency: 'USD', buckets: [] });
      return;
    }

    if (
      requestUrl.pathname ===
      `/api/v1/portfolio/portfolios/${PORTFOLIO_ID}/performance-snapshot`
    ) {
      const period = requestUrl.searchParams.get('period') ?? 'EXPLICIT';
      sendJson(response, buildPerformanceResponse(period));
      return;
    }

    if (
      requestUrl.pathname ===
      `/api/v1/portfolio/portfolios/${PORTFOLIO_ID}/projected-cashflow`
    ) {
      const horizonDays = Number.parseInt(requestUrl.searchParams.get('horizon_days') ?? '10', 10);
      sendJson(response, buildProjectedCashflowResponse(horizonDays));
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

function buildWorkspaceResponse() {
  return {
    as_of_date: AS_OF_DATE,
    portfolio: {
      portfolio_id: PORTFOLIO_ID,
      display_name: 'Global Balanced Mandate',
      client_id: 'CLIENT_SG_001',
      base_currency: 'USD',
      booking_center_code: 'SG',
    },
    profile: {
      status: 'ACTIVE',
      portfolio_type: 'ADVISORY',
      risk_exposure: 'MODERATE',
      investment_time_horizon: 'LONG_TERM',
      objective: 'BALANCED_GROWTH',
      is_leverage_allowed: false,
      open_date: '2024-01-01',
    },
    summary: {
      assets_under_management_base: 12_500_000,
      invested_market_value_base: 11_750_000,
      cash_market_value_base: 750_000,
      cash_weight_pct: 6,
      position_count: 18,
      cash_balance_count: 2,
    },
    reporting: {
      status: 'READY',
      generated_at_utc: '2026-04-10T08:30:00Z',
      row_count: 18,
    },
    cashflow_outlook: buildCashflowOutlook(10),
    performance: null,
    rebalance: null,
    control_capabilities: {
      historical_snapshots: {
        state: 'supported',
        reason: 'Book evidence is available for governed historical review dates.',
        requested_as_of_date: AS_OF_DATE,
        effective_as_of_date: AS_OF_DATE,
        earliest_available_as_of_date: HISTORICAL_AS_OF_DATE,
        latest_available_as_of_date: AS_OF_DATE,
        module_capabilities: [
          {
            module: 'book',
            state: 'supported',
            reason: 'Book totals and holdings readiness honor the selected review date.',
          },
        ],
      },
      reporting_currency_restatement: {
        state: 'supported',
        reason: 'The fixture book is reported in its source-owned USD currency.',
        requested_reporting_currency: 'USD',
        effective_reporting_currency: 'USD',
        supported_currencies: ['USD'],
        module_capabilities: [
          {
            module: 'book',
            state: 'supported',
            reason: 'Book evidence is reported in USD.',
          },
        ],
      },
    },
    workflow_cues: [],
    warnings: [],
    partial_failures: [],
    operations: null,
  };
}

function buildProjectedCashflowResponse(horizonDays: number) {
  return {
    correlation_id: `corr-cashflow-${horizonDays}`,
    contract_version: 'v1',
    portfolio_id: PORTFOLIO_ID,
    as_of_date: AS_OF_DATE,
    cashflow_outlook: buildCashflowOutlook(horizonDays),
    warnings: [],
    partial_failures: [],
  };
}

function buildBookResponse(asOfDate: string) {
  const historicalSummary = {
    assets_under_management_base: 0,
    invested_market_value_base: 0,
    cash_market_value_base: 0,
    cash_weight_pct: 0,
    position_count: 0,
    cash_balance_count: 0,
  };

  return {
    as_of_date: asOfDate,
    portfolio: buildWorkspaceResponse().portfolio,
    summary:
      asOfDate === HISTORICAL_AS_OF_DATE
        ? historicalSummary
        : buildWorkspaceResponse().summary,
    cash_balances: [],
    allocation_views: [{ dimension: 'asset_class', buckets: [] }],
    top_positions: [],
    positions: [],
  };
}

function buildPerformanceResponse(period: string) {
  return {
    period,
    as_of_date: AS_OF_DATE,
    benchmark_code: 'BMK_GLOBAL_BALANCED_60_40',
    portfolio_return_pct:
      period === 'MTD' ? null : period === 'QTD' ? 1.8 : period === 'YTD' ? 4.6 : 2.4,
    benchmark_return_pct: null,
    excess_return_pct: null,
    sparkline: [],
    unavailable:
      period === 'MTD'
        ? {
            title: 'MTD performance unavailable',
            detail: 'MTD valuation history is incomplete; no return is shown.',
            requirements: ['Daily valuations through the review date'],
          }
        : null,
    warnings:
      period === 'EXPLICIT'
        ? ['Benchmark history contains one delayed market close.']
        : [],
    partial_failures: [],
  };
}

function buildCashflowOutlook(horizonDays: number) {
  const points = [
    { offset: 2, movement: 125_000 },
    { offset: Math.min(7, horizonDays), movement: -80_000 },
    ...(horizonDays >= 30 ? [{ offset: 24, movement: 55_000 }] : []),
  ];
  let cumulative = 0;

  return {
    as_of_date: AS_OF_DATE,
    range_end_date: offsetDate(AS_OF_DATE, horizonDays),
    total_net_cashflow_base: points.reduce((total, point) => total + point.movement, 0),
    projection_days: horizonDays,
    include_projected: true,
    notes: 'Projection includes booked and projected settlement events.',
    upcoming_points: points.map((point) => {
      cumulative += point.movement;
      return {
        projection_date: offsetDate(AS_OF_DATE, point.offset),
        net_cashflow_base: point.movement,
        projected_cumulative_cashflow_base: cumulative,
      };
    }),
  };
}

function offsetDate(date: string, offsetDays: number): string {
  const instant = new Date(`${date}T00:00:00Z`);
  instant.setUTCDate(instant.getUTCDate() + offsetDays);
  return instant.toISOString().slice(0, 10);
}

function sendJson(response: ServerResponse, body: unknown, status = 200): void {
  response.statusCode = status;
  response.setHeader('content-type', 'application/json');
  response.setHeader('cache-control', 'no-store');
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
