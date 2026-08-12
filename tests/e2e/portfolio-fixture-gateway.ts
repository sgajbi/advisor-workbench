import { createServer, type Server, type ServerResponse } from 'node:http';

const PORTFOLIO_ID = 'PB_SG_GLOBAL_BAL_001';
const AS_OF_DATE = '2026-04-10';
const MISSING_HISTORICAL_SUMMARY_DATE = '2026-04-01';
const HISTORICAL_AS_OF_DATE = '2026-03-31';

export type PortfolioFixtureScenario =
  | 'cashflow'
  | 'income-activity'
  | 'shell-unavailable'
  | 'positions-status'
  | 'transactions-status';

export type PortfolioFixtureGateway = {
  close: () => Promise<void>;
  getWorkspaceRequestCount: () => number;
  port: number;
};

export async function startPortfolioFixtureGateway({
  port,
  scenario,
}: {
  port: number;
  scenario: PortfolioFixtureScenario;
}): Promise<PortfolioFixtureGateway> {
  let workspaceRequestCount = 0;
  const server = createServer((request, response) => {
    const requestUrl = new URL(request.url ?? '/', `http://127.0.0.1:${port}`);

    if (requestUrl.pathname === '/api/v1/platform/capabilities') {
      sendJson(response, buildPlatformCapabilitiesResponse());
      return;
    }

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
      workspaceRequestCount += 1;
      if (scenario === 'shell-unavailable') {
        sendJson(response, { code: 'portfolio_workspace_unavailable' }, 503);
        return;
      }
      sendJson(response, buildWorkspaceResponse(scenario));
      return;
    }

    if (requestUrl.pathname === `/api/v1/portfolio/portfolios/${PORTFOLIO_ID}/book`) {
      sendJson(
        response,
        buildBookResponse(requestUrl.searchParams.get('as_of_date') ?? AS_OF_DATE, scenario)
      );
      return;
    }

    if (requestUrl.pathname === `/api/v1/portfolio/portfolios/${PORTFOLIO_ID}/liquidity`) {
      sendJson(response, {
        cash_balances:
          scenario === 'positions-status'
            ? [
                {
                  security_id: 'CASH_USD_1',
                  instrument_name: 'USD Operating Cash',
                  currency: 'USD',
                  quantity: 750_000,
                  market_value_base: 750_000,
                  weight_pct: 6,
                },
              ]
            : [],
        cashflow_outlook: buildCashflowOutlook(10),
      });
      return;
    }

    if (requestUrl.pathname === `/api/v1/portfolio/portfolios/${PORTFOLIO_ID}/transactions`) {
      const transactions =
        scenario === 'transactions-status' ? buildTransactionSettlementMatrix() : [];
      sendJson(response, {
        total: transactions.length,
        skip: 0,
        limit: 200,
        transactions,
      });
      return;
    }

    if (requestUrl.pathname === `/api/v1/portfolio/portfolios/${PORTFOLIO_ID}/income-summary`) {
      sendJson(
        response,
        scenario === 'income-activity'
          ? buildIncomeSummaryResponse()
          : { reporting_currency: 'USD' }
      );
      return;
    }

    if (requestUrl.pathname === `/api/v1/portfolio/portfolios/${PORTFOLIO_ID}/activity-summary`) {
      sendJson(
        response,
        scenario === 'income-activity'
          ? buildActivitySummaryResponse()
          : { reporting_currency: 'USD', buckets: [] }
      );
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

    if (requestUrl.pathname === `/api/v1/portfolio/portfolios/${PORTFOLIO_ID}/workflow`) {
      sendJson(response, {
        actions: [
          {
            sequence: 1,
            title: 'Review performance evidence',
            impact:
              'Confirm the incomplete valuation history before using portfolio returns in the client discussion.',
            target: 'Performance review',
            href: `/performance?portfolioId=${PORTFOLIO_ID}`,
            cta_label: 'Open Performance',
            recommended: true,
          },
        ],
      });
      return;
    }

    sendJson(response, { code: 'fixture_route_not_found' }, 404);
  });

  await listen(server, port);
  return {
    port,
    close: () => close(server),
    getWorkspaceRequestCount: () => workspaceRequestCount,
  };
}

function buildPlatformCapabilitiesResponse() {
  const workspace = (
    id: string,
    label: string,
    href: string,
    enabled = true,
  ) => ({
    id,
    label,
    href,
    enabled,
    supportability: {
      state: enabled ? 'ready' : 'unavailable',
      reasons: enabled ? [] : [`${id}_unavailable`],
    },
    freshness: {
      state: 'current',
      freshnessClass: 'shell_navigation',
      evaluatedAt: `${AS_OF_DATE}T00:00:00Z`,
      maxAgeSeconds: 60,
    },
    evidence: {
      state: enabled ? 'source_backed' : 'unavailable',
      lineageSources: enabled ? ['lotus-gateway'] : [],
      partialFailure: false,
      sourceErrorServices: [],
    },
    versioning: {
      shellContractVersion: 'shell-bootstrap.v1',
      capabilityContractVersion: 'portfolio-fixture.v1',
      sourcePolicyVersion: null,
      sourcePolicyVersions: {},
    },
    caching: {
      cacheMode: 'request_scoped_composition',
      invalidationOwner: 'upstream_service',
      staleReadTolerance: 'bounded_navigation_refresh',
      revalidateOnNavigation: true,
      ttlSeconds: 60,
      correctnessCritical: false,
    },
  });

  return {
    data: {
      consumerSystem: 'UI',
      tenantId: 'default',
      contractVersion: 'portfolio-fixture.v1',
      sources: {},
      partialFailure: false,
      errors: [],
      normalized: {
        navigation: {},
        workflowFlags: {},
        inputModesBySource: {},
        inputModesUnion: [],
        moduleHealth: {},
        policyVersionsBySource: {},
        lotusCorePolicyDiagnostics: {
          available: true,
          allowedSections: ['OVERVIEW'],
          warnings: [],
          policyProvenance: {
            policyVersion: 'portfolio-fixture.v1',
            policySource: 'owned-fixture',
            matchedRuleId: 'portfolio-e2e',
            strictMode: false,
          },
        },
        shellBootstrap: {
          contractVersion: 'shell-bootstrap.v1',
          supportability: { state: 'ready', reasons: [] },
          freshness: {
            state: 'current',
            freshnessClass: 'shell_navigation',
            evaluatedAt: `${AS_OF_DATE}T00:00:00Z`,
            maxAgeSeconds: 60,
          },
          evidence: {
            state: 'source_backed',
            lineageSources: ['lotus-gateway'],
            partialFailure: false,
            sourceErrorServices: [],
          },
          versioning: {
            shellContractVersion: 'shell-bootstrap.v1',
            capabilityContractVersion: 'portfolio-fixture.v1',
            sourcePolicyVersions: {},
          },
          caching: {
            cacheMode: 'request_scoped_composition',
            invalidationOwner: 'upstream_service',
            staleReadTolerance: 'bounded_navigation_refresh',
            revalidateOnNavigation: true,
            ttlSeconds: 60,
            correctnessCritical: false,
          },
          workspaces: [
            workspace('portfolio', 'Portfolio', '/portfolio'),
            workspace('performance', 'Performance', '/performance'),
            workspace('risk', 'Risk', '/performance?mode=risk'),
            workspace('proposal', 'Proposal', '/proposals', false),
            workspace('advisory', 'Advisory', '/recommendations', false),
          ],
        },
      },
    },
  };
}

function buildIncomeSummaryResponse() {
  return {
    correlation_id: 'corr-income-activity-income',
    contract_version: 'v1',
    portfolio_id: PORTFOLIO_ID,
    reporting_currency: 'USD',
    window_start_date: '2026-03-12',
    window_end_date: AS_OF_DATE,
    totals_requested_window: buildIncomePeriod(12_000, 1_200, 300, 10_500, 3),
    totals_year_to_date: buildIncomePeriod(30_000, 3_000, 500, 26_500, 8),
    income_types: [
      {
        income_type: 'DIVIDEND',
        requested_window: buildIncomePeriod(8_000, 1_000, 0, 7_000, 2),
        year_to_date: buildIncomePeriod(20_000, 2_500, 0, 17_500, 5),
      },
      {
        income_type: 'INTEREST',
        requested_window: buildIncomePeriod(4_000, 200, 300, 3_500, 1),
        year_to_date: buildIncomePeriod(10_000, 500, 500, 9_000, 3),
      },
    ],
  };
}

function buildActivitySummaryResponse() {
  return {
    correlation_id: 'corr-income-activity-movements',
    contract_version: 'v1',
    portfolio_id: PORTFOLIO_ID,
    reporting_currency: 'USD',
    window_start_date: '2026-03-12',
    window_end_date: AS_OF_DATE,
    buckets: [
      buildActivityBucket('INFLOWS', 100_000, 150_000, 1),
      buildActivityBucket('OUTFLOWS', 25_000, 40_000, 1),
      buildActivityBucket('FEES', 1_000, 2_500, 1),
      buildActivityBucket('TAXES', 500, 1_500, 2),
      buildActivityBucket('CORPORATE_ACTIONS', 2_000, 3_000, 1),
    ],
  };
}

function buildIncomePeriod(
  gross: number,
  withholdingTax: number,
  otherDeductions: number,
  net: number,
  transactionCount: number
) {
  return {
    gross: { reporting_currency_amount: gross, transaction_count: transactionCount },
    withholding_tax: {
      reporting_currency_amount: withholdingTax,
      transaction_count: transactionCount,
    },
    other_deductions: {
      reporting_currency_amount: otherDeductions,
      transaction_count: transactionCount,
    },
    net: { reporting_currency_amount: net, transaction_count: transactionCount },
  };
}

function buildActivityBucket(bucket: string, requested: number, yearToDate: number, count: number) {
  return {
    bucket,
    requested_window: { reporting_currency_amount: requested, transaction_count: count },
    year_to_date: { reporting_currency_amount: yearToDate, transaction_count: count },
  };
}

function buildWorkspaceResponse(scenario: PortfolioFixtureScenario = 'cashflow') {
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
    operations:
      scenario === 'positions-status'
        ? {
            business_date: AS_OF_DATE,
            latest_booked_position_snapshot_date: AS_OF_DATE,
            stale_reprocessing_keys: 1,
          }
        : null,
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

function buildBookResponse(asOfDate: string, scenario: PortfolioFixtureScenario = 'cashflow') {
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
    portfolio: buildWorkspaceResponse(scenario).portfolio,
    summary:
      asOfDate === MISSING_HISTORICAL_SUMMARY_DATE
        ? undefined
        : asOfDate === HISTORICAL_AS_OF_DATE
          ? historicalSummary
          : scenario === 'positions-status'
            ? {
                ...buildWorkspaceResponse(scenario).summary,
                position_count: 4,
                cash_balance_count: 1,
              }
            : buildWorkspaceResponse(scenario).summary,
    cash_balances: [],
    allocation_views: [{ dimension: 'asset_class', buckets: [] }],
    top_positions: [],
    positions: scenario === 'positions-status' ? buildPositionStatusMatrix() : [],
  };
}

function buildPositionStatusMatrix() {
  return [
    {
      security_id: 'EQ_CURRENT',
      instrument_name: 'Current Equity Holding',
      asset_class: 'EQUITY',
      quantity: 100,
      market_price: 125,
      market_value_base: 12_500,
      cost_basis_base: 10_000,
      unrealized_gain_loss_base: 2_500,
      weight_pct: 0.1,
      currency: 'USD',
      reprocessing_status: 'CURRENT',
    },
    {
      security_id: 'FI_REVIEW',
      instrument_name: 'Reviewed Bond Holding',
      asset_class: 'FIXED_INCOME',
      quantity: 200,
      market_price: 99.5,
      market_value_base: 19_900,
      cost_basis_base: 20_000,
      unrealized_gain_loss_base: -100,
      weight_pct: 0.16,
      currency: 'USD',
      reprocessing_status: 'STALE_PRICE',
    },
    {
      security_id: 'EQ_UNKNOWN',
      instrument_name: 'Unrecognized Status Holding',
      asset_class: 'EQUITY',
      quantity: 50,
      market_price: 80,
      market_value_base: 4_000,
      cost_basis_base: 3_800,
      unrealized_gain_loss_base: 200,
      weight_pct: 0.03,
      currency: 'USD',
      reprocessing_status: 'FUTURE_SOURCE_STATE',
    },
    {
      security_id: 'ALT_MISSING',
      instrument_name: 'Status Not Reported Holding',
      asset_class: 'ALTERNATIVES',
      quantity: 10,
      market_price: 500,
      market_value_base: 5_000,
      cost_basis_base: 5_000,
      unrealized_gain_loss_base: 0,
      weight_pct: 0.04,
      currency: 'USD',
      reprocessing_status: null,
    },
  ];
}

function buildTransactionSettlementMatrix() {
  const common = {
    transaction_date: '2026-04-09T00:00:00Z',
    settlement_date: '2026-04-11',
    transaction_type: 'FX',
    security_id: 'USD',
    quantity: 1,
    currency: 'USD',
    source_system: 'CORE_LEDGER',
  };

  return [
    {
      ...common,
      transaction_id: 'TX_SETTLED',
      component_type: 'FX_CASH_SETTLEMENT_BUY',
      instrument_id: 'Settled cash leg',
      gross_amount: 100_000,
      net_cost_base: 100_000,
      settlement_status: 'SETTLED',
    },
    {
      ...common,
      transaction_id: 'TX_REVIEW',
      component_type: 'FX_CASH_SETTLEMENT_SELL',
      instrument_id: 'Cash leg requiring review',
      gross_amount: -100_000,
      net_cost_base: -100_000,
      settlement_status: 'FUTURE_SOURCE_STATE',
    },
    {
      ...common,
      transaction_id: 'TX_NOT_REPORTED',
      component_type: 'FX_CASH_SETTLEMENT_BUY',
      instrument_id: 'Cash leg without source status',
      gross_amount: 25_000,
      net_cost_base: 25_000,
      settlement_status: null,
    },
    {
      ...common,
      transaction_id: 'TX_NOT_APPLICABLE',
      component_type: 'FX_CONTRACT_OPEN',
      instrument_id: 'FX contract opening event',
      gross_amount: 0,
      net_cost_base: 0,
      settlement_status: null,
    },
  ];
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
