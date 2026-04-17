import { afterEach, describe, expect, it, vi } from "vitest";

import {
  getPortfolioCatalog,
  getPortfolioProjectedCashflow,
  getPortfolioTransactionLedger,
  getPortfolioWorkspaceDetailedDetails,
  getPortfolioWorkspaceShell,
  getPortfolioWorkspaceSummaryDetails,
  mergePortfolioWorkspace,
  resetPortfolioApiRequestCache,
} from "../../src/apps/portfolio/api";

describe("portfolio api", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    resetPortfolioApiRequestCache();
  });

  it("builds a shell workspace without waiting for detail modules", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: string | URL) => {
        const url = input.toString();

        if (url.includes("/workspace")) {
          return jsonResponse({
            as_of_date: "2026-03-28",
            portfolio: {
              portfolio_id: "MANUAL_PB_USD_001",
              display_name: "MANUAL_PB_USD_001",
              client_id: "MANUAL_CIF_001",
              base_currency: "USD",
              booking_center_code: "Singapore",
            },
            profile: {
              status: "ACTIVE",
              portfolio_type: "Advisory",
              risk_exposure: "Moderate Growth",
              investment_time_horizon: "Long Term",
              objective: "Long-term capital appreciation.",
              is_leverage_allowed: false,
            },
            summary: {
              assets_under_management_base: 1001550.05,
              invested_market_value_base: 917032.95,
              cash_market_value_base: 84517.1,
              cash_weight_pct: 8.43863,
              position_count: 9,
              cash_balance_count: 2,
            },
            cashflow_outlook: null,
            performance: {
              period: "YTD",
              return_pct: 2.5,
            },
            rebalance: {
              status: "PENDING_REVIEW",
              last_run_at_utc: "2026-03-27T12:00:00Z",
              last_rebalance_run_id: "rr_100",
            },
            reporting: {
              status: "READY",
              generated_at_utc: "2026-03-28T08:00:00Z",
              row_count: 4,
            },
            workflow_cues: [{ key: "performance", label: "Performance", href: "/performance" }],
            warnings: [],
            partial_failures: [],
          });
        }

        throw new Error(`Unexpected fetch: ${url}`);
      })
    );

    const shell = await getPortfolioWorkspaceShell("MANUAL_PB_USD_001");

    expect(shell?.portfolio.portfolio_id).toBe("MANUAL_PB_USD_001");
    expect(shell?.allocations).toEqual([]);
    expect(shell?.positions).toEqual([]);
    expect(shell?.recent_transactions).toEqual([]);
    expect(shell?.performance).toEqual({
      period: "YTD",
      return_pct: 2.5,
    });
    expect(shell?.rebalance).toEqual({
      status: "PENDING_REVIEW",
      last_run_at_utc: "2026-03-27T12:00:00Z",
      last_rebalance_run_id: "rr_100",
    });
    expect(shell?.readiness_indicators).toBeUndefined();
    expect(shell?.workflow_actions).toBeUndefined();
  });

  it("keeps shell workspace compatible when gateway omits optional performance fields", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: string | URL) => {
        const url = input.toString();

        if (url.includes("/workspace")) {
          return jsonResponse({
            as_of_date: "2026-03-28",
            portfolio: {
              portfolio_id: "MANUAL_PB_USD_001",
              display_name: "MANUAL_PB_USD_001",
              client_id: "MANUAL_CIF_001",
              base_currency: "USD",
              booking_center_code: "Singapore",
            },
            profile: {
              status: "ACTIVE",
              portfolio_type: "Advisory",
            },
            summary: {
              assets_under_management_base: 1001550.05,
              invested_market_value_base: 917032.95,
              cash_market_value_base: 84517.1,
              cash_weight_pct: 8.43863,
              position_count: 9,
              cash_balance_count: 2,
            },
            cashflow_outlook: null,
            performance: null,
            rebalance: null,
            reporting: {
              status: "READY",
              generated_at_utc: "2026-03-28T08:00:00Z",
              row_count: 4,
            },
            workflow_cues: [],
            warnings: [],
            partial_failures: [],
          });
        }

        throw new Error(`Unexpected fetch: ${url}`);
      })
    );

    const shell = await getPortfolioWorkspaceShell("MANUAL_PB_USD_001");

    expect(shell?.performance).toBeNull();
    expect(shell?.rebalance).toBeNull();
  });

  it("loads summary detail modules without fetching detailed ledger and liquidity slices", async () => {
    const fetchSpy = vi.fn(async (input: string | URL) => {
      const url = input.toString();

      if (url.includes("/book")) {
        return jsonResponse({
          allocation_views: [
            {
              dimension: "asset_class",
              buckets: [
                {
                  bucket: "Equities",
                  position_count: 3,
                  market_value_base: 349705,
                  weight_pct: 34.92,
                },
              ],
            },
          ],
          top_positions: [
            {
              security_id: "EQ_US_AAPL_MANUAL_001",
              instrument_name: "Apple Inc.",
              asset_class: "Equities",
              quantity: 700,
              market_value_base: 147000,
              weight_pct: 14.67,
            },
          ],
          positions: [
            {
              security_id: "EQ_US_AAPL_MANUAL_001",
              instrument_name: "Apple Inc.",
              asset_class: "Equities",
              quantity: 700,
              market_value_base: 147000,
              market_value_local: 147000,
              weight_pct: 14.67,
            },
          ],
        });
      }

      if (url.includes("/income-summary")) {
        return jsonResponse({
          reporting_currency: "USD",
          window_start_date: "2026-03-01",
          window_end_date: "2026-03-28",
          totals_requested_window: {
            gross: { reporting_currency_amount: 350, transaction_count: 1 },
            withholding_tax: { reporting_currency_amount: 0, transaction_count: 1 },
            other_deductions: { reporting_currency_amount: 0, transaction_count: 1 },
            net: { reporting_currency_amount: 350, transaction_count: 1 },
          },
          totals_year_to_date: {
            gross: { reporting_currency_amount: 350, transaction_count: 1 },
            withholding_tax: { reporting_currency_amount: 0, transaction_count: 1 },
            other_deductions: { reporting_currency_amount: 0, transaction_count: 1 },
            net: { reporting_currency_amount: 350, transaction_count: 1 },
          },
          income_types: [],
        });
      }

      if (url.includes("/activity-summary")) {
        return jsonResponse({
          reporting_currency: "USD",
          window_start_date: "2026-03-01",
          window_end_date: "2026-03-28",
          buckets: [],
        });
      }

      if (url.includes("/portfolio/portfolios/MANUAL_PB_USD_001/performance-snapshot?")) {
        return jsonResponse({
          period: "EXPLICIT",
          as_of_date: "2026-03-28",
          benchmark_code: "BMK_GLOBAL_BALANCED_60_40",
          portfolio_return_pct: 5.12,
          benchmark_return_pct: 4.91,
          excess_return_pct: 0.21,
          warnings: ["Benchmark history contains one delayed market close."],
          partial_failures: [
            {
              source_service: "lotus-performance",
              error_code: "MARKET_DATA_DELAY",
              detail: "One benchmark data point was delayed and backfilled.",
            },
          ],
          sparkline: [
            {
              as_of_date: "2026-03-01",
              portfolio_return_pct: 1.1,
              benchmark_return_pct: 0.9,
              excess_return_pct: 0.2,
            },
            {
              as_of_date: "2026-03-14",
              portfolio_return_pct: 2.9,
              benchmark_return_pct: 2.5,
              excess_return_pct: 0.4,
            },
            {
              as_of_date: "2026-03-28",
              portfolio_return_pct: 5.12,
              benchmark_return_pct: 4.91,
              excess_return_pct: 0.21,
            },
          ],
        });
      }

      throw new Error(`Unexpected fetch: ${url}`);
    });
    vi.stubGlobal("fetch", fetchSpy);

    const details = await getPortfolioWorkspaceSummaryDetails("MANUAL_PB_USD_001", {
      asOfDate: "2026-03-28",
      reportingCurrency: "USD",
      includeProjected: false,
      timeWindow: "30D",
      reportStartDate: "2026-03-01",
      reportEndDate: "2026-03-28",
    });

    expect(details?.allocation_views?.[0].dimension).toBe("asset_class");
    expect(details?.top_positions[0].market_value_base).toBe(147000);
    expect(details?.positions[0].market_value_local).toBe(147000);
    expect(details?.income_summary?.totals_requested_window.net.reporting_currency_amount).toBe(350);
    expect(details?.performance).toMatchObject({
      period: "EXPLICIT",
      report_start_date: "2026-03-01",
      report_end_date: "2026-03-28",
      return_pct: 5.12,
      benchmark_return_pct: 4.91,
      excess_return_pct: 0.21,
      money_weighted_return_pct: null,
      money_weighted_method: null,
      benchmark_code: "BMK_GLOBAL_BALANCED_60_40",
      benchmark_label: null,
      benchmark_return_source: null,
      benchmark_input_mode: null,
      warnings: ["Benchmark history contains one delayed market close."],
      partial_failures: [
        {
          source_service: "lotus-performance",
          error_code: "MARKET_DATA_DELAY",
          detail: "One benchmark data point was delayed and backfilled.",
        },
      ],
      sparkline_points: [
        {
          label: "2026-03-01",
          portfolio_return_pct: 1.1,
          benchmark_return_pct: 0.9,
          active_return_pct: 0.2,
        },
        {
          label: "2026-03-14",
          portfolio_return_pct: 2.9,
          benchmark_return_pct: 2.5,
          active_return_pct: 0.4,
        },
        {
          label: "2026-03-28",
          portfolio_return_pct: 5.12,
          benchmark_return_pct: 4.91,
          active_return_pct: 0.21,
        },
      ],
    });
    expect(details?.readiness_indicators).toBeUndefined();
    expect(details?.insights).toBeUndefined();
    expect(details?.exception_summaries).toBeUndefined();
    expect(details?.workflow_actions).toBeUndefined();

    const requestedUrls = fetchSpy.mock.calls.map((call) => String(call[0]));
    expect(requestedUrls.some((url) => url.includes("/liquidity"))).toBe(false);
    expect(requestedUrls.some((url) => url.includes("/transactions"))).toBe(false);
    expect(requestedUrls.some((url) => url.includes("/readiness"))).toBe(false);
    expect(requestedUrls.some((url) => url.includes("/insights"))).toBe(false);
    expect(requestedUrls.some((url) => url.includes("/workflow"))).toBe(false);
    expect(
      requestedUrls.some(
        (url) =>
          url.includes("/portfolio/portfolios/MANUAL_PB_USD_001/book?") &&
          url.includes("as_of_date=2026-03-28") &&
          url.includes("reporting_currency=USD") &&
          url.includes("include_projected=false")
      )
    ).toBe(true);
    expect(
      requestedUrls.some(
        (url) =>
          url.includes("/portfolio/portfolios/MANUAL_PB_USD_001/performance-snapshot?") &&
          url.includes("period=EXPLICIT") &&
          url.includes("report_start_date=2026-03-01") &&
          url.includes("report_end_date=2026-03-28")
      )
    ).toBe(true);
    expect(requestedUrls.some((url) => url.includes("/allocations"))).toBe(false);
    expect(requestedUrls.some((url) => url.includes("/positions"))).toBe(false);
    expect(requestedUrls.some((url) => url.includes("/performance/details"))).toBe(false);
    expect(requestedUrls.some((url) => url.includes("/performance/summary"))).toBe(false);
  });

  it("preserves gateway unavailable metadata for the performance snapshot module", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: string | URL) => {
        const url = input.toString();

        if (url.includes("/book")) {
          return jsonResponse({
            allocation_views: [{ dimension: "asset_class", buckets: [] }],
            top_positions: [],
            positions: [],
          });
        }

        if (url.includes("/income-summary")) {
          return jsonResponse(null);
        }

        if (url.includes("/activity-summary")) {
          return jsonResponse(null);
        }

        if (url.includes("/portfolio/portfolios/MANUAL_PB_USD_001/performance-snapshot?")) {
          return jsonResponse({
            period: "EXPLICIT",
            as_of_date: "2026-03-28",
            benchmark_code: "BMK_GLOBAL_BALANCED_60_40",
            portfolio_return_pct: null,
            benchmark_return_pct: null,
            excess_return_pct: null,
            unavailable: {
              title: "Performance history incomplete",
              detail: "Gateway could not compute a snapshot because valuation history is incomplete.",
              requirements: [
                "daily valuations through the selected end date",
                "cashflow history for the selected period",
              ],
            },
            warnings: ["Performance data is delayed pending backfill."],
            partial_failures: [],
            sparkline: [],
          });
        }

        throw new Error(`Unexpected fetch: ${url}`);
      })
    );

    const details = await getPortfolioWorkspaceSummaryDetails("MANUAL_PB_USD_001", {
      asOfDate: "2026-03-28",
      reportingCurrency: "USD",
      includeProjected: false,
      timeWindow: "30D",
      reportStartDate: "2026-03-01",
      reportEndDate: "2026-03-28",
    });

    expect(details?.performance).toMatchObject({
      period: "EXPLICIT",
      report_start_date: null,
      report_end_date: "2026-03-28",
      return_pct: null,
      benchmark_return_pct: null,
      excess_return_pct: null,
      unavailable: {
        title: "Performance history incomplete",
        detail: "Gateway could not compute a snapshot because valuation history is incomplete.",
        requirements: [
          "daily valuations through the selected end date",
          "cashflow history for the selected period",
        ],
      },
      warnings: ["Performance data is delayed pending backfill."],
      partial_failures: [],
      sparkline_points: [],
    });
  });

  it("loads detailed ledger and liquidity slices only when detailed modules need them", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: string | URL) => {
        const url = input.toString();

        if (url.includes("/liquidity")) {
          return jsonResponse({
            cash_balances: [
              {
                security_id: "CASH_USD",
                instrument_name: "USD Operating Cash",
                currency: "USD",
                quantity: 66122,
                market_value_base: 66122,
                weight_pct: 6.6,
              },
            ],
            cashflow_outlook: {
              as_of_date: "2026-03-28",
              range_end_date: "2026-04-07",
              total_net_cashflow_base: 0,
              projection_days: 10,
              include_projected: true,
              upcoming_points: [],
            },
          });
        }

        if (url.includes("/transactions")) {
          return jsonResponse({
            transactions: [
              {
                transaction_id: "TX_1",
                transaction_date: "2026-03-28T00:00:00Z",
                transaction_type: "BUY",
                security_id: "EQ_US_AAPL_MANUAL_001",
                instrument_id: "EQ_US_AAPL_MANUAL_001",
                quantity: 700,
              },
            ],
          });
        }

        if (url.includes("/readiness")) {
          return jsonResponse({
            indicators: [
              { key: "holdings", label: "Holdings", status: "Ready", href: "#portfolio-insights" },
            ],
          });
        }

        if (url.includes("/insights")) {
          return jsonResponse({
            insights: [
              {
                key: "cash-above-target",
                title: "Cash exceeds target allocation",
                detail: "Available cash is elevated relative to invested assets.",
                severity: "info",
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
            ],
          });
        }

        if (url.includes("/workflow")) {
          return jsonResponse({
            actions: [
              {
                sequence: 1,
                title: "Review performance",
                impact: "Review portfolio return.",
                target: "Target: Performance workflow",
                href: "/performance",
                cta_label: "Performance",
                recommended: true,
              },
            ],
          });
        }

        throw new Error(`Unexpected fetch: ${url}`);
      })
    );

    const shell = {
      as_of_date: "2026-03-28",
      portfolio: {
        portfolio_id: "MANUAL_PB_USD_001",
        display_name: "MANUAL_PB_USD_001",
        client_id: "MANUAL_CIF_001",
        base_currency: "USD",
        booking_center_code: "Singapore",
      },
      profile: {
        status: "ACTIVE",
        portfolio_type: "Advisory",
        risk_exposure: "Moderate Growth",
        investment_time_horizon: "Long Term",
        objective: "Long-term capital appreciation.",
        is_leverage_allowed: false,
      },
      summary: {
        market_value_base: 1001550.05,
        invested_market_value_base: 917032.95,
        total_cash_base: 84517.1,
        cash_weight_pct: 8.43863,
        position_count: 9,
        cash_balance_count: 2,
      },
      allocations: [],
      allocation_views: [],
      cash_balances: [],
      top_positions: [],
      positions: [],
      recent_transactions: [],
      income_summary: null,
      activity_summary: null,
      cashflow_outlook: null,
      performance: null,
      rebalance: null,
      readiness: {
        has_positions: true,
        reporting: { status: "READY", generated_at_utc: null, row_count: 4 },
      },
      workflow_cues: [],
      warnings: [],
      partial_failures: [],
    };

    const details = await getPortfolioWorkspaceDetailedDetails("MANUAL_PB_USD_001", {
      asOfDate: "2026-03-28",
      startDate: "2026-03-01",
      endDate: "2026-03-28",
    });
    const merged = mergePortfolioWorkspace(shell, details!);

    expect(merged.cash_balances?.[0].market_value_base).toBe(66122);
    expect(merged.recent_transactions[0].transaction_id).toBe("TX_1");
    expect(merged.readiness_indicators?.[0].status).toBe("Ready");
    expect(merged.insights?.[0].key).toBe("cash-above-target");
    expect(merged.exception_summaries?.[0].key).toBe("pricing");
    expect(merged.workflow_actions?.[0].title).toBe("Review performance");
    const requestedUrls = (global.fetch as ReturnType<typeof vi.fn>).mock.calls.map((call) =>
      String(call[0])
    );
    const liquidityRequestUrl = requestedUrls.find((url) => url.includes("/liquidity?")) ?? "";
    const transactionRequestUrl = requestedUrls.find((url) => url.includes("/transactions?")) ?? "";
    const readinessRequestUrl = requestedUrls.find((url) => url.includes("/readiness?")) ?? "";
    const insightsRequestUrl = requestedUrls.find((url) => url.includes("/insights?")) ?? "";
    const workflowRequestUrl = requestedUrls.find((url) => url.includes("/workflow?")) ?? "";
    expect(liquidityRequestUrl).toContain("as_of_date=2026-03-28");
    expect(transactionRequestUrl).toContain("limit=200");
    expect(transactionRequestUrl).toContain("as_of_date=2026-03-28");
    expect(transactionRequestUrl).toContain("start_date=2026-03-01");
    expect(transactionRequestUrl).toContain("end_date=2026-03-28");
    expect(readinessRequestUrl).toContain("as_of_date=2026-03-28");
    expect(insightsRequestUrl).toContain("as_of_date=2026-03-28");
    expect(workflowRequestUrl).toContain("as_of_date=2026-03-28");
  });

  it("requests the transaction ledger with scoped filter parameters", async () => {
    const fetchSpy = vi.fn(async () =>
      jsonResponse({
        total: 1,
        skip: 0,
        limit: 200,
        transactions: [],
      })
    );
    vi.stubGlobal("fetch", fetchSpy);

    await getPortfolioTransactionLedger("MANUAL_PB_USD_001", {
      asOfDate: "2026-03-28",
      startDate: "2026-03-01",
      endDate: "2026-03-28",
      transactionType: "BUY",
      securityId: "EQ_US_AAPL_MANUAL_001",
      limit: 200,
    });

    expect(fetchSpy.mock.calls.length).toBe(1);
    const requestUrl = String((fetchSpy.mock as { lastCall?: unknown[] }).lastCall?.[0] ?? "");
    expect(requestUrl).toContain("/transactions?");
    expect(requestUrl).toContain("as_of_date=2026-03-28");
    expect(requestUrl).toContain("start_date=2026-03-01");
    expect(requestUrl).toContain("end_date=2026-03-28");
    expect(requestUrl).toContain("transaction_type=BUY");
    expect(requestUrl).toContain("security_id=EQ_US_AAPL_MANUAL_001");
  });

  it("reuses cached BFF responses for identical requests", async () => {
    const fetchSpy = vi.fn(async (input: string | URL) => {
      const url = input.toString();

      if (url.includes("/transactions")) {
        return jsonResponse({
          total: 1,
          skip: 0,
          limit: 200,
          transactions: [{ transaction_id: "TX_1" }],
        });
      }

      if (url.includes("/book")) {
        return jsonResponse({
          allocation_views: [{ dimension: "asset_class", buckets: [] }],
          top_positions: [],
          positions: [],
        });
      }

      if (url.includes("/income-summary")) {
        return jsonResponse(null);
      }

      if (url.includes("/activity-summary")) {
        return jsonResponse(null);
      }

      if (url.includes("/portfolio/portfolios/MANUAL_PB_USD_001/performance-snapshot?")) {
        return jsonResponse({
          period: "EXPLICIT",
          as_of_date: "2026-03-28",
          report_start_date: "2026-03-01",
          report_end_date: "2026-03-28",
          benchmark_code: null,
          portfolio_return_pct: 2.1,
          benchmark_return_pct: null,
          excess_return_pct: null,
          sparkline: [
            {
              as_of_date: "2026-03-01",
              portfolio_return_pct: 0.8,
              benchmark_return_pct: 0.6,
              excess_return_pct: 0.2,
            },
            {
              as_of_date: "2026-03-14",
              portfolio_return_pct: 1.6,
              benchmark_return_pct: 1.2,
              excess_return_pct: 0.4,
            },
            {
              as_of_date: "2026-03-28",
              portfolio_return_pct: 2.1,
              benchmark_return_pct: 1.7,
              excess_return_pct: 0.4,
            },
          ],
        });
      }

      throw new Error(`Unexpected fetch: ${url}`);
    });
    vi.stubGlobal("fetch", fetchSpy);

    await getPortfolioTransactionLedger("MANUAL_PB_USD_001", {
      asOfDate: "2026-03-28",
      startDate: "2026-03-01",
      endDate: "2026-03-28",
      limit: 200,
    });
    await getPortfolioTransactionLedger("MANUAL_PB_USD_001", {
      asOfDate: "2026-03-28",
      startDate: "2026-03-01",
      endDate: "2026-03-28",
      limit: 200,
    });

    await getPortfolioWorkspaceSummaryDetails("MANUAL_PB_USD_001", {
      asOfDate: "2026-03-28",
      reportingCurrency: "USD",
      includeProjected: false,
      timeWindow: "30D",
      reportStartDate: "2026-03-01",
      reportEndDate: "2026-03-28",
    });
    await getPortfolioWorkspaceSummaryDetails("MANUAL_PB_USD_001", {
      asOfDate: "2026-03-28",
      reportingCurrency: "USD",
      includeProjected: false,
      timeWindow: "30D",
      reportStartDate: "2026-03-01",
      reportEndDate: "2026-03-28",
    });

    const requestedUrls = fetchSpy.mock.calls.map((call) => String(call[0]));
    expect(requestedUrls.filter((url) => url.includes("/transactions")).length).toBe(1);
    expect(requestedUrls.filter((url) => url.includes("/book")).length).toBe(1);
    expect(requestedUrls.filter((url) => url.includes("/allocations")).length).toBe(0);
    expect(requestedUrls.filter((url) => url.includes("/positions")).length).toBe(0);
    expect(requestedUrls.filter((url) => url.includes("/income-summary")).length).toBe(1);
    expect(requestedUrls.filter((url) => url.includes("/activity-summary")).length).toBe(1);
    expect(requestedUrls.filter((url) => url.includes("/performance-snapshot")).length).toBe(1);
    expect(requestedUrls.filter((url) => url.includes("/performance/summary")).length).toBe(0);
    expect(requestedUrls.filter((url) => url.includes("/performance/details")).length).toBe(0);
  });

  it("preserves source-authored performance snapshot report windows", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input) => {
        const url = String(input);
        if (url.includes("/book")) {
          return jsonResponse({
            allocation_views: [{ dimension: "asset_class", buckets: [] }],
            top_positions: [],
            positions: [],
          });
        }

        if (url.includes("/income-summary")) {
          return jsonResponse(null);
        }

        if (url.includes("/activity-summary")) {
          return jsonResponse(null);
        }

        if (!url.includes("/performance-snapshot")) {
          throw new Error(`Unexpected fetch: ${url}`);
        }

        return jsonResponse({
          period: "EXPLICIT",
          as_of_date: "2026-03-28",
          report_start_date: "2026-02-15",
          report_end_date: "2026-03-28",
          benchmark_code: "BMK_GLOBAL_BALANCED_60_40",
          portfolio_return_pct: 2.1,
          benchmark_return_pct: 1.7,
          excess_return_pct: 0.4,
          sparkline: [
            {
              as_of_date: "2026-03-01",
              portfolio_return_pct: 0.8,
              benchmark_return_pct: 0.6,
              excess_return_pct: 0.2,
            },
            {
              as_of_date: "2026-03-28",
              portfolio_return_pct: 2.1,
              benchmark_return_pct: 1.7,
              excess_return_pct: 0.4,
            },
          ],
          warnings: [],
          partial_failures: [],
        });
      })
    );

    const workspace = await getPortfolioWorkspaceSummaryDetails("MANUAL_PB_USD_001", {
      asOfDate: "2026-03-28",
      reportingCurrency: "USD",
      includeProjected: false,
      timeWindow: "30D",
      reportStartDate: "2026-03-01",
      reportEndDate: "2026-03-28",
    });

    expect(workspace?.performance?.report_start_date).toBe("2026-02-15");
    expect(workspace?.performance?.report_end_date).toBe("2026-03-28");
    expect(workspace?.performance?.sparkline_points?.[0]?.label).toBe("2026-03-01");
  });

  it("coalesces identical in-flight ledger requests into a single fetch", async () => {
    const pendingRequest: { resolve?: (value: Response) => void } = {};
    const fetchSpy = vi.fn(
      () =>
        new Promise<Response>((resolve) => {
          pendingRequest.resolve = resolve;
        })
    );
    vi.stubGlobal("fetch", fetchSpy);

    const firstRequest = getPortfolioTransactionLedger("MANUAL_PB_USD_001", {
      asOfDate: "2026-03-28",
      startDate: "2026-03-01",
      endDate: "2026-03-28",
      limit: 200,
    });
    const secondRequest = getPortfolioTransactionLedger("MANUAL_PB_USD_001", {
      asOfDate: "2026-03-28",
      startDate: "2026-03-01",
      endDate: "2026-03-28",
      limit: 200,
    });

    expect(fetchSpy).toHaveBeenCalledTimes(1);

    if (pendingRequest.resolve) {
      pendingRequest.resolve(
        jsonResponse({
          total: 1,
          skip: 0,
          limit: 200,
          transactions: [{ transaction_id: "TX_1" }],
        })
      );
    }

    const [firstResult, secondResult] = await Promise.all([firstRequest, secondRequest]);
    expect(firstResult).toEqual(secondResult);
    expect(fetchSpy).toHaveBeenCalledTimes(1);
  });

  it("requests projected cashflow with the selected horizon", async () => {
    const fetchSpy = vi.fn(async () =>
      jsonResponse({
        cashflow_outlook: {
          as_of_date: "2026-03-28",
          range_end_date: "2026-04-27",
          total_net_cashflow_base: 1250,
          projection_days: 30,
          include_projected: true,
          upcoming_points: [],
        },
      })
    );
    vi.stubGlobal("fetch", fetchSpy);

    const outlook = await getPortfolioProjectedCashflow("MANUAL_PB_USD_001", {
      asOfDate: "2026-03-28",
      horizonDays: 30,
      includeProjected: true,
    });

    expect(outlook?.projection_days).toBe(30);
    const requestUrl = String((fetchSpy.mock as { lastCall?: unknown[] }).lastCall?.[0] ?? "");
    expect(requestUrl).toContain("/projected-cashflow?");
    expect(requestUrl).toContain("as_of_date=2026-03-28");
    expect(requestUrl).toContain("horizon_days=30");
    expect(requestUrl).toContain("include_projected=true");
  });

  it("passes reporting currency through to detailed liquidity requests", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input) => {
        const url = String(input);
        if (url.includes("/liquidity")) {
          return jsonResponse({
            cash_balances: [],
            cashflow_outlook: null,
          });
        }
        if (url.includes("/transactions")) {
          return jsonResponse({
            transactions: [],
          });
        }
        if (url.includes("/readiness")) {
          return jsonResponse({ indicators: [] });
        }
        if (url.includes("/insights")) {
          return jsonResponse({ insights: [], exception_summaries: [] });
        }
        if (url.includes("/workflow")) {
          return jsonResponse({ actions: [] });
        }

        throw new Error(`Unexpected fetch: ${url}`);
      })
    );

    await getPortfolioWorkspaceDetailedDetails("MANUAL_PB_USD_001", {
      asOfDate: "2026-03-28",
      reportingCurrency: "SGD",
      startDate: "2026-03-01",
      endDate: "2026-03-28",
    });

    const requestedUrls = (global.fetch as ReturnType<typeof vi.fn>).mock.calls.map((call) =>
      String(call[0])
    );
    const liquidityRequestUrl = requestedUrls.find((url) => url.includes("/liquidity?")) ?? "";
    expect(liquidityRequestUrl).toContain("as_of_date=2026-03-28");
    expect(liquidityRequestUrl).toContain("reporting_currency=SGD");
  });

  it("uses the proxied portfolio API base in the browser", async () => {
    const originalWindow = global.window;
    vi.stubGlobal("window", {
      location: { href: "http://localhost:3000/portfolio" },
    });
    const fetchSpy = vi.fn(async () => jsonResponse({ items: [] }));
    vi.stubGlobal("fetch", fetchSpy);

    try {
      await import("../../src/apps/portfolio/api").then(({ getPortfolioCatalog }) =>
        getPortfolioCatalog()
      );
      expect(String((fetchSpy.mock as { lastCall?: unknown[] }).lastCall?.[0] ?? "")).toContain(
        "/api/bff/api/v1/portfolio/portfolios"
      );
    } finally {
      if (originalWindow) {
        vi.stubGlobal("window", originalWindow);
      }
    }
  });

  it("uses the gateway-backed portfolio API base during server rendering", async () => {
    vi.stubEnv("BFF_BASE_URL", "http://gateway.dev.lotus");
    const originalWindow = global.window;
    vi.stubGlobal("window", undefined);
    const fetchSpy = vi.fn(async () => jsonResponse({ items: [] }));
    vi.stubGlobal("fetch", fetchSpy);

    try {
      await getPortfolioCatalog();

      expect(String((fetchSpy.mock as { lastCall?: unknown[] }).lastCall?.[0] ?? "")).toBe(
        "http://gateway.dev.lotus/api/v1/portfolio/portfolios"
      );
    } finally {
      if (originalWindow) {
        vi.stubGlobal("window", originalWindow);
      } else {
        vi.unstubAllGlobals();
      }
    }
  });
});

function jsonResponse(payload: unknown): Response {
  return new Response(JSON.stringify(payload), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}
