import type { ServerResponse } from 'node:http';

export const GOVERNED_REVIEW_PORTFOLIO_ID = 'PB_SG_INCOME_001';
export const GOVERNED_REVIEW_AS_OF_DATE = '2026-02-24';
export const GOVERNED_REVIEW_PERIOD = '1Y';
export const GOVERNED_REVIEW_CURRENCY = 'USD';

const CURRENT_PORTFOLIO_DATE = '2026-03-01';

/**
 * Adds the smallest source-consistent Portfolio contract family needed to
 * prove a review context across more than one Workbench workspace. Keeping
 * this contract separate from a screen-specific fixture prevents the proof
 * from silently degrading into two unrelated page tests.
 */
export function handleGovernedReviewPortfolioRequest(
  requestUrl: URL,
  response: ServerResponse,
): boolean {
  const portfolioPath = `/api/v1/portfolio/portfolios/${GOVERNED_REVIEW_PORTFOLIO_ID}`;

  if (requestUrl.pathname === '/api/v1/portfolio/portfolios') {
    sendJson(response, {
      items: [
        {
          portfolio_id: GOVERNED_REVIEW_PORTFOLIO_ID,
          display_name: 'Income Preservation Mandate',
          client_id: 'CLIENT_SG_REVIEW_001',
          base_currency: GOVERNED_REVIEW_CURRENCY,
          booking_center_code: 'SG',
          portfolio_type: 'ADVISORY',
          status: 'ACTIVE',
        },
      ],
    });
    return true;
  }

  if (requestUrl.pathname === `${portfolioPath}/workspace`) {
    sendJson(response, buildPortfolioWorkspace());
    return true;
  }

  if (requestUrl.pathname === `${portfolioPath}/book`) {
    sendJson(
      response,
      buildPortfolioBook(
        requestUrl.searchParams.get('as_of_date') ?? CURRENT_PORTFOLIO_DATE,
      ),
    );
    return true;
  }

  if (requestUrl.pathname === `${portfolioPath}/income-summary`) {
    sendJson(response, {
      correlation_id: 'corr-review-context-income',
      contract_version: 'v1',
      portfolio_id: GOVERNED_REVIEW_PORTFOLIO_ID,
      reporting_currency: GOVERNED_REVIEW_CURRENCY,
      window_start_date: '2025-02-25',
      window_end_date: GOVERNED_REVIEW_AS_OF_DATE,
      income_types: [],
    });
    return true;
  }

  if (requestUrl.pathname === `${portfolioPath}/activity-summary`) {
    sendJson(response, {
      correlation_id: 'corr-review-context-activity',
      contract_version: 'v1',
      portfolio_id: GOVERNED_REVIEW_PORTFOLIO_ID,
      reporting_currency: GOVERNED_REVIEW_CURRENCY,
      window_start_date: '2025-02-25',
      window_end_date: GOVERNED_REVIEW_AS_OF_DATE,
      buckets: [],
    });
    return true;
  }

  if (requestUrl.pathname === `${portfolioPath}/performance-snapshot`) {
    sendJson(response, {
      period: requestUrl.searchParams.get('period') ?? GOVERNED_REVIEW_PERIOD,
      as_of_date: GOVERNED_REVIEW_AS_OF_DATE,
      benchmark_code: 'BMK_GLOBAL_BALANCED_60_40',
      portfolio_return_pct: 4.2,
      benchmark_return_pct: 3.8,
      excess_return_pct: 0.4,
      sparkline: [],
      unavailable: null,
      warnings: [],
      partial_failures: [],
    });
    return true;
  }

  if (requestUrl.pathname === `${portfolioPath}/workflow`) {
    sendJson(response, { actions: [] });
    return true;
  }

  return false;
}

function buildPortfolioWorkspace() {
  return {
    as_of_date: CURRENT_PORTFOLIO_DATE,
    portfolio: buildPortfolioIdentity(),
    profile: {
      status: 'ACTIVE',
      portfolio_type: 'ADVISORY',
      risk_exposure: 'CONSERVATIVE',
      investment_time_horizon: 'LONG_TERM',
      objective: 'INCOME_PRESERVATION',
      is_leverage_allowed: false,
      open_date: '2022-01-03',
    },
    summary: buildSummary(),
    reporting: {
      status: 'READY',
      generated_at_utc: '2026-03-01T08:30:00Z',
      row_count: 14,
    },
    cashflow_outlook: null,
    performance: null,
    rebalance: null,
    control_capabilities: {
      historical_snapshots: {
        state: 'supported',
        reason: 'Governed historical portfolio evidence is available.',
        requested_as_of_date: CURRENT_PORTFOLIO_DATE,
        effective_as_of_date: CURRENT_PORTFOLIO_DATE,
        earliest_available_as_of_date: '2025-01-01',
        latest_available_as_of_date: CURRENT_PORTFOLIO_DATE,
        module_capabilities: [],
      },
      reporting_currency_restatement: {
        state: 'supported',
        reason: 'The mandate is source-reported in USD.',
        requested_reporting_currency: GOVERNED_REVIEW_CURRENCY,
        effective_reporting_currency: GOVERNED_REVIEW_CURRENCY,
        supported_currencies: [GOVERNED_REVIEW_CURRENCY],
        module_capabilities: [],
      },
    },
    workflow_cues: [],
    warnings: [],
    partial_failures: [],
    operations: null,
  };
}

function buildPortfolioBook(asOfDate: string) {
  return {
    as_of_date: asOfDate,
    portfolio: buildPortfolioIdentity(),
    summary: buildSummary(),
    cash_balances: [],
    allocation_views: [],
    top_positions: [],
    positions: [],
  };
}

function buildPortfolioIdentity() {
  return {
    portfolio_id: GOVERNED_REVIEW_PORTFOLIO_ID,
    display_name: 'Income Preservation Mandate',
    client_id: 'CLIENT_SG_REVIEW_001',
    base_currency: GOVERNED_REVIEW_CURRENCY,
    booking_center_code: 'SG',
  };
}

function buildSummary() {
  return {
    assets_under_management_base: 8_400_000,
    invested_market_value_base: 7_900_000,
    cash_market_value_base: 500_000,
    cash_weight_pct: 5.95,
    position_count: 14,
    cash_balance_count: 1,
  };
}

function sendJson(response: ServerResponse, body: unknown): void {
  response.statusCode = 200;
  response.setHeader('content-type', 'application/json');
  response.setHeader('cache-control', 'no-store');
  response.end(JSON.stringify(body));
}
