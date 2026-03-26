import React from "react";
import { render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import PerformanceAnalyticsPage from "../../src/apps/performance/performance-analytics-page";

vi.mock("echarts-for-react", () => ({
  default: ({ style }: { style?: React.CSSProperties }) => (
    <div data-testid="performance-echart" style={style} />
  ),
}));

describe("PerformanceAnalyticsPage", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("renders the advisor-grade performance workspace from the gateway contract", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: string | URL) => {
        const url = input.toString();
        if (url.includes("/api/v1/lookups/portfolios")) {
          return {
            ok: true,
            json: async () => ({
              items: [
                { id: "DEMO_ADV_USD_001", label: "Global Balanced Mandate" },
                { id: "PF_2002", label: "Asia Growth Mandate" },
              ],
            }),
          } as Response;
        }
        if (url.includes("/api/v1/workbench/DEMO_ADV_USD_001/performance")) {
          return {
            ok: true,
            json: async () => ({
              correlation_id: "corr-performance",
              contract_version: "v1",
              portfolio_id: "DEMO_ADV_USD_001",
              as_of_date: "2026-02-24",
              period: "YTD",
              chart_frequency: "monthly",
              detail_dimension: "asset_class",
              detail_basis: "NET",
              benchmark_code: "BMK_GLOBAL_BALANCED_60_40",
              portfolio: {
                portfolio_id: "DEMO_ADV_USD_001",
                client_id: "CIF_1001",
                base_currency: "USD",
                booking_center_code: "SG",
              },
              overview: {
                market_value_base: 1250000,
                cash_weight_pct: 6.8,
                position_count: 18,
              },
              net_performance: {
                metric_basis: "NET",
                portfolio_return_pct: 5.42,
                benchmark_return_pct: 4.91,
                active_return_pct: 0.52,
                annualized_return_pct: 5.42,
                benchmark_id: "BMK_GLOBAL_BALANCED_60_40",
                benchmark_return_source: "calculated",
              },
              gross_performance: {
                metric_basis: "GROSS",
                portfolio_return_pct: 5.88,
                benchmark_return_pct: 5.12,
                active_return_pct: 0.98,
                annualized_return_pct: 5.88,
                benchmark_id: "BMK_GLOBAL_BALANCED_60_40",
                benchmark_return_source: "calculated",
              },
              money_weighted_return: {
                money_weighted_return_pct: 5.12,
                annualized_return_pct: 5.12,
                method: "XIRR",
                start_date: "2026-01-01",
                end_date: "2026-02-24",
                notes: ["cash-flow aware"],
              },
              net_chart: [
                {
                  label: "2026-01",
                  frequency: "monthly",
                  period_start: "2026-01-01",
                  period_end: "2026-01-31",
                  portfolio_return_pct: 2.2,
                  benchmark_return_pct: 1.9,
                  active_return_pct: 0.3,
                  cumulative_portfolio_return_pct: 2.2,
                  cumulative_benchmark_return_pct: 1.9,
                  cumulative_active_return_pct: 0.3,
                },
              ],
              gross_chart: [
                {
                  label: "2026-01",
                  frequency: "monthly",
                  period_start: "2026-01-01",
                  period_end: "2026-01-31",
                  portfolio_return_pct: 2.4,
                  benchmark_return_pct: 2.0,
                  active_return_pct: 0.5,
                  cumulative_portfolio_return_pct: 2.4,
                  cumulative_benchmark_return_pct: 2.0,
                  cumulative_active_return_pct: 0.5,
                },
              ],
              contribution: {
                metric_basis: "NET",
                weighting_scheme: "average_weight",
                portfolio_contribution_pct: 5.42,
                total_portfolio_return_pct: 5.42,
                coverage_mv_pct: 98.7,
                portfolio_local_contribution_pct: 4.8,
                portfolio_fx_contribution_pct: 0.62,
                position_rows: [
                  {
                    position_id: "AAPL",
                    contribution_pct: 1.55,
                    weight_avg_pct: 24.1,
                    total_return_pct: 8.2,
                    local_contribution_pct: 1.18,
                    fx_contribution_pct: 0.37,
                  },
                ],
                levels: [
                  {
                    level: 1,
                    name: "asset_class",
                    total_contribution_pct: 5,
                    rows: [
                      {
                        key_label: "Equity",
                        contribution_pct: 3.8,
                        weight_avg_pct: 61,
                        local_contribution_pct: 3.4,
                        fx_contribution_pct: 0.4,
                        is_other: false,
                      },
                    ],
                  },
                ],
              },
              attribution: {
                metric_basis: "NET",
                model: "BF",
                linking: "carino",
                benchmark_id: "BMK_GLOBAL_BALANCED_60_40",
                active_return_pct: 0.52,
                sum_of_effects_pct: 0.5,
                residual_pct: 0.02,
                levels: [
                  {
                    dimension: "asset_class",
                    total_effect_pct: 0.5,
                    rows: [
                      {
                        key_label: "Equity",
                        allocation_pct: 0.18,
                        selection_pct: 0.24,
                        interaction_pct: 0.03,
                        total_effect_pct: 0.45,
                      },
                    ],
                  },
                ],
              },
              warnings: [],
              partial_failures: [],
            }),
          } as Response;
        }
        return { ok: false, json: async () => ({}) } as Response;
      })
    );

    render(await PerformanceAnalyticsPage({ searchParams: Promise.resolve({}) }));

    expect(screen.getByRole("heading", { name: "DEMO_ADV_USD_001" })).toBeInTheDocument();
    expect(screen.getAllByText("5.42%").length).toBeGreaterThan(1);
    expect(screen.getAllByText("5.88%").length).toBeGreaterThan(1);
    expect(screen.getByText("XIRR")).toBeInTheDocument();
    expect(screen.getByRole("img", { name: "Net Return Path chart" })).toBeInTheDocument();
    expect(screen.getAllByText("Equity").length).toBeGreaterThan(1);
    expect(screen.getAllByText("AAPL").length).toBeGreaterThan(1);
    expect(screen.getAllByText("Total").length).toBeGreaterThan(1);
    expect(screen.getAllByText("$1,250,000").length).toBeGreaterThan(1);
    const fetchMock = global.fetch as unknown as ReturnType<typeof vi.fn>;
    const performanceCall = fetchMock.mock.calls.find(([input]) =>
      input.toString().includes("/api/v1/workbench/DEMO_ADV_USD_001/performance")
    );
    expect(performanceCall).toBeTruthy();
    expect(performanceCall?.[0].toString()).toContain(
      "/api/v1/workbench/DEMO_ADV_USD_001/performance?period=YTD&chart_frequency=monthly&detail_dimension=asset_class&detail_basis=NET&benchmark_code=BMK_GLOBAL_BALANCED_60_40"
    );
    expect(performanceCall?.[1]).toEqual(expect.objectContaining({ cache: "no-store" }));
    expect(screen.getByLabelText("Compared To")).toHaveValue("BMK_GLOBAL_BALANCED_60_40");
  });

  it("passes a selected benchmark through to the performance workspace request", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: string | URL) => {
        const url = input.toString();
        if (url.includes("/api/v1/lookups/portfolios")) {
          return {
            ok: true,
            json: async () => ({
              items: [{ id: "PF_1001", label: "Global Balanced Mandate" }],
            }),
          } as Response;
        }
        if (url.includes("/api/v1/workbench/PF_1001/performance")) {
          return {
            ok: true,
            json: async () => ({
              correlation_id: "corr-performance",
              contract_version: "v1",
              portfolio_id: "PF_1001",
              as_of_date: "2026-02-24",
              period: "YTD",
              chart_frequency: "monthly",
              detail_dimension: "asset_class",
              detail_basis: "NET",
              benchmark_code: "BMK_GLOBAL_BALANCED_60_40",
              portfolio: {
                portfolio_id: "PF_1001",
                client_id: "CIF_1001",
                base_currency: "USD",
                booking_center_code: "SG",
              },
              overview: {
                market_value_base: 1250000,
                cash_weight_pct: 6.8,
                position_count: 18,
              },
              net_performance: {
                metric_basis: "NET",
                portfolio_return_pct: 5.42,
                benchmark_return_pct: 4.9,
                active_return_pct: 0.52,
                annualized_return_pct: 5.42,
                benchmark_id: "BMK_GLOBAL_BALANCED_60_40",
                benchmark_return_source: "calculated",
              },
              gross_performance: {
                metric_basis: "GROSS",
                portfolio_return_pct: 5.88,
                benchmark_return_pct: 4.9,
                active_return_pct: 0.98,
                annualized_return_pct: 5.88,
                benchmark_id: "BMK_GLOBAL_BALANCED_60_40",
                benchmark_return_source: "calculated",
              },
              money_weighted_return: null,
              net_chart: [],
              gross_chart: [],
              contribution: null,
              attribution: null,
              warnings: [],
              partial_failures: [],
            }),
          } as Response;
        }
        return { ok: false, json: async () => ({}) } as Response;
      })
    );

    render(
      await PerformanceAnalyticsPage({
        searchParams: Promise.resolve({ benchmark: "BMK_GLOBAL_BALANCED_60_40" }),
      })
    );

    const fetchMock = global.fetch as unknown as ReturnType<typeof vi.fn>;
    const performanceCall = fetchMock.mock.calls.find(([input]) =>
      input.toString().includes("/api/v1/workbench/PF_1001/performance")
    );
    expect(performanceCall?.[0].toString()).toContain("benchmark_code=BMK_GLOBAL_BALANCED_60_40");
    expect(screen.getByLabelText("Compared To")).toHaveValue("BMK_GLOBAL_BALANCED_60_40");
  });
});
