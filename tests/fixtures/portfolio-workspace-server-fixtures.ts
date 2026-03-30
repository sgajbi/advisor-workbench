import { vi } from "vitest";

export type PortfolioFetchOverrides = {
  workspace?: Record<string, unknown>;
  liquidity?: Record<string, unknown>;
  allocations?: Record<string, unknown>;
  positions?: Record<string, unknown>;
  transactions?: Record<string, unknown>;
};

export function buildCombinedPartialPortfolioOverrides(): PortfolioFetchOverrides {
  return {
    workspace: {
      cashflow_outlook: null,
    },
    allocations: {
      views: [],
    },
    positions: {
      top_positions: [],
      positions: [],
    },
    transactions: {
      transactions: [],
    },
    liquidity: {
      cash_balances: [],
      cashflow_outlook: null,
    },
  };
}

export function stubPortfolioApis(overrides: PortfolioFetchOverrides = {}) {
  const fetchSpy = buildPortfolioFetchStub(overrides);
  vi.stubGlobal("fetch", fetchSpy);
  return fetchSpy;
}

export function buildPortfolioFetchStub(overrides: PortfolioFetchOverrides = {}) {
  return vi.fn(async (input: string | URL) => {
    const url = input.toString();

    if (url.includes("/api/v1/portfolio/portfolios/PORT_UI_1001/workspace")) {
      return jsonResponse({
        as_of_date: "2026-02-24",
        portfolio: {
          portfolio_id: "PORT_UI_1001",
          display_name: "Global Balanced",
          client_id: "CIF_1001",
          base_currency: "USD",
          booking_center_code: "SG",
        },
        profile: {
          status: "ACTIVE",
          portfolio_type: "ADVISORY",
          risk_exposure: "MODERATE",
          investment_time_horizon: "LONG_TERM",
          objective: "GROWTH",
          is_leverage_allowed: false,
          open_date: "2024-01-01",
        },
        summary: {
          assets_under_management_base: 1250000,
          invested_market_value_base: 1145000,
          cash_market_value_base: 105000,
          cash_weight_pct: 8.4,
          position_count: 12,
          cash_balance_count: 2,
        },
        reporting: {
          status: "READY",
          generated_at_utc: "2026-02-24T08:32:00Z",
          row_count: 14,
        },
        cashflow_outlook: {
          as_of_date: "2026-02-24",
          range_end_date: "2026-03-05",
          total_net_cashflow_base: -25000,
          projection_days: 10,
          include_projected: true,
          upcoming_points: [
            {
              projection_date: "2026-02-25",
              net_cashflow_base: -15000,
              projected_cumulative_cashflow_base: -15000,
            },
          ],
        },
        workflow_cues: [
          { key: "performance", label: "Performance", href: "/ignored" },
          { key: "risk", label: "Risk", href: "/ignored" },
          { key: "proposal", label: "Proposal", href: "/ignored" },
        ],
        warnings: ["PORTFOLIO_CASH_BALANCES_UNAVAILABLE"],
        partial_failures: [
          {
            source_service: "lotus-core",
            error_code: "PORTFOLIO_CASH_BALANCES_UNAVAILABLE",
            detail: "cash balance service unavailable",
          },
        ],
        ...overrides.workspace,
      });
    }

    if (url.includes("/api/v1/portfolio/portfolios/PORT_UI_1001/liquidity")) {
      return jsonResponse({
        cash_balances: [
          {
            security_id: "CASH_USD",
            instrument_name: "USD Operating Cash",
            currency: "USD",
            quantity: 105000,
            market_value_base: 105000,
            weight_pct: 8.4,
          },
        ],
        cashflow_outlook: {
          as_of_date: "2026-02-24",
          range_end_date: "2026-03-05",
          total_net_cashflow_base: -25000,
          projection_days: 10,
          include_projected: true,
          upcoming_points: [
            {
              projection_date: "2026-02-25",
              net_cashflow_base: -15000,
              projected_cumulative_cashflow_base: -15000,
            },
          ],
        },
        ...overrides.liquidity,
      });
    }

    if (url.includes("/api/v1/portfolio/portfolios/PORT_UI_1001/allocations")) {
      return jsonResponse({
        views: [
          {
            dimension: "asset_class",
            buckets: [
              {
                bucket: "Equities",
                position_count: 7,
                market_value_base: 725000,
                weight_pct: 58,
              },
              {
                bucket: "Fixed Income",
                position_count: 4,
                market_value_base: 320000,
                weight_pct: 25.6,
              },
            ],
          },
          {
            dimension: "currency",
            buckets: [
              {
                bucket: "USD",
                position_count: 9,
                market_value_base: 925000,
                weight_pct: 74,
              },
              {
                bucket: "EUR",
                position_count: 3,
                market_value_base: 220000,
                weight_pct: 17.6,
              },
            ],
          },
          {
            dimension: "sector",
            buckets: [
              {
                bucket: "Technology",
                position_count: 4,
                market_value_base: 525000,
                weight_pct: 42,
              },
              {
                bucket: "Government",
                position_count: 5,
                market_value_base: 320000,
                weight_pct: 25.6,
              },
            ],
          },
        ],
        ...overrides.allocations,
      });
    }

    if (url.includes("/api/v1/portfolio/portfolios/PORT_UI_1001/positions")) {
      return jsonResponse({
        top_positions: [
          {
            security_id: "EQ_1",
            instrument_name: "Apple Inc",
            asset_class: "Equities",
            quantity: 120,
            market_value_base: 250000,
            weight_pct: 20,
          },
          {
            security_id: "FI_1",
            instrument_name: "US Treasury 2030",
            asset_class: "Fixed Income",
            quantity: 80,
            market_value_base: 180000,
            weight_pct: 14.4,
          },
        ],
        positions: [
          {
            security_id: "EQ_1",
            instrument_name: "Apple Inc",
            asset_class: "Equities",
            sector: "Technology",
            held_since_date: "2024-01-15",
            currency: "USD",
            quantity: 120,
            cost_basis_base: 200000,
            market_value_local: 250000,
            market_value_base: 250000,
            unrealized_gain_loss_base: 50000,
            weight_pct: 20,
          },
          {
            security_id: "FI_1",
            instrument_name: "US Treasury 2030",
            asset_class: "Fixed Income",
            sector: "Government",
            held_since_date: "2023-08-01",
            currency: "USD",
            quantity: 80,
            cost_basis_base: 175000,
            market_value_local: 180000,
            market_value_base: 180000,
            unrealized_gain_loss_base: 5000,
            weight_pct: 14.4,
          },
        ],
        ...overrides.positions,
      });
    }

    if (url.includes("/api/v1/portfolio/portfolios/PORT_UI_1001/transactions")) {
      return jsonResponse({
        transactions: [
          {
            transaction_id: "TX_1",
            transaction_date: "2026-02-20T08:30:00Z",
            transaction_type: "BUY",
            security_id: "EQ_1",
            instrument_id: "AAPL",
            quantity: 10,
            price: 180,
            gross_amount: 18000,
            net_cost_base: 18000,
            realized_gain_loss_base: 0,
            currency: "USD",
            settlement_status: "SETTLED",
          },
        ],
        ...overrides.transactions,
      });
    }

    if (url.includes("/api/v1/portfolio/portfolios/PORT_UI_1001/income-summary")) {
      return jsonResponse({
        reporting_currency: "USD",
        window_start_date: "2026-01-26",
        window_end_date: "2026-02-24",
        totals_requested_window: {
          gross: { reporting_currency_amount: 3200, transaction_count: 2 },
          withholding_tax: { reporting_currency_amount: 200, transaction_count: 2 },
          other_deductions: { reporting_currency_amount: 0, transaction_count: 2 },
          net: { reporting_currency_amount: 3000, transaction_count: 2 },
        },
        totals_year_to_date: {
          gross: { reporting_currency_amount: 5400, transaction_count: 4 },
          withholding_tax: { reporting_currency_amount: 350, transaction_count: 4 },
          other_deductions: { reporting_currency_amount: 0, transaction_count: 4 },
          net: { reporting_currency_amount: 5050, transaction_count: 4 },
        },
        income_types: [
          {
            income_type: "DIVIDEND",
            requested_window: {
              gross: { reporting_currency_amount: 2500, transaction_count: 1 },
              withholding_tax: { reporting_currency_amount: 200, transaction_count: 1 },
              other_deductions: { reporting_currency_amount: 0, transaction_count: 1 },
              net: { reporting_currency_amount: 2300, transaction_count: 1 },
            },
            year_to_date: {
              gross: { reporting_currency_amount: 4200, transaction_count: 2 },
              withholding_tax: { reporting_currency_amount: 350, transaction_count: 2 },
              other_deductions: { reporting_currency_amount: 0, transaction_count: 2 },
              net: { reporting_currency_amount: 3850, transaction_count: 2 },
            },
          },
        ],
      });
    }

    if (url.includes("/api/v1/portfolio/portfolios/PORT_UI_1001/activity-summary")) {
      return jsonResponse({
        reporting_currency: "USD",
        window_start_date: "2026-01-26",
        window_end_date: "2026-02-24",
        buckets: [
          {
            bucket: "INFLOWS",
            requested_window: {
              reporting_currency_amount: 15000,
              transaction_count: 1,
            },
            year_to_date: {
              reporting_currency_amount: 25000,
              transaction_count: 2,
            },
          },
          {
            bucket: "FEES",
            requested_window: {
              reporting_currency_amount: -250,
              transaction_count: 1,
            },
            year_to_date: {
              reporting_currency_amount: -500,
              transaction_count: 2,
            },
          },
        ],
      });
    }

    if (url.includes("/api/v1/portfolio/portfolios/PORT_UI_1001/readiness")) {
      return jsonResponse({
        indicators: [
          { key: "holdings", label: "Holdings", status: "Ready", href: "#portfolio-insights" },
          { key: "pricing", label: "Pricing", status: "Ready", href: "#portfolio-attention" },
          { key: "transactions", label: "Transactions", status: "Ready", href: "#portfolio-insights" },
          { key: "reporting", label: "Reporting", status: "Ready", href: "#portfolio-health" },
        ],
      });
    }

    if (url.includes("/api/v1/portfolio/portfolios/PORT_UI_1001/insights")) {
      return jsonResponse({
        insights: [
          {
            key: "equity-concentration-high",
            title: "Large position dominates portfolio risk",
            detail: "One holding has become large enough to dominate current portfolio concentration.",
            severity: "warning",
            href: "#portfolio-insights",
          },
        ],
        exception_summaries: [
          {
            key: "pricing",
            title: "Pricing coverage incomplete",
            detail: "Some holdings lack complete valuation coverage.",
            tone: "warn",
            href: "#portfolio-attention",
          },
          {
            key: "partial_failure_PORTFOLIO_CASH_BALANCES_UNAVAILABLE",
            title: "PORTFOLIO CASH BALANCES UNAVAILABLE",
            detail: "cash balance service unavailable",
            tone: "warn",
            href: "#portfolio-attention",
          },
        ],
      });
    }

    if (url.includes("/api/v1/portfolio/portfolios/PORT_UI_1001/workflow")) {
      return jsonResponse({
        actions: [
          {
            sequence: 1,
            title: "Review performance",
            impact: "Review portfolio return, benchmark context, and contribution once the book is valued.",
            target: "Target: Performance workflow for this portfolio",
            href: "/ignored",
            cta_label: "Performance",
            recommended: true,
          },
        ],
      });
    }

    if (url.includes("/api/v1/portfolio/portfolios")) {
      return jsonResponse({
        items: [
          {
            portfolio_id: "PORT_UI_1001",
            display_name: "Global Balanced",
            base_currency: "USD",
            client_id: "CIF_1001",
            booking_center_code: "SG",
          },
          {
            portfolio_id: "PORT_UI_1002",
            display_name: "Income Plus",
            base_currency: "USD",
            client_id: "CIF_1002",
            booking_center_code: "HK",
          },
        ],
      });
    }

    return { ok: false, json: async () => ({}) } as Response;
  });
}

function jsonResponse(payload: unknown): Response {
  return {
    ok: true,
    json: async () => payload,
  } as Response;
}
