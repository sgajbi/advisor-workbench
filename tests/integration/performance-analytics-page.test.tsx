import React from "react";
import { render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import PerformanceAnalyticsPage from "../../src/apps/performance/performance-analytics-page";

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    replace: vi.fn(),
  }),
}));

vi.mock("next/dynamic", () => ({
  default: (loader: () => Promise<unknown>) => {
    const React = require("react");
    return function MockDynamicComponent(props: Record<string, unknown>) {
      const [Component, setComponent] = React.useState(
        null as React.ComponentType<Record<string, unknown>> | null
      );
      React.useEffect(() => {
        loader().then((mod: unknown) => {
          const resolved = (mod as { default?: React.ComponentType<Record<string, unknown>> })
            .default;
          setComponent(() => resolved ?? null);
        });
      }, []);
      return Component ? React.createElement(Component, props) : null;
    };
  },
}));

vi.mock("echarts-for-react", () => ({
  default: ({ style }: { style?: React.CSSProperties }) => (
    <div data-testid="performance-echart" style={style} />
  ),
}));

describe("PerformanceAnalyticsPage", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("renders the advisor-grade performance workspace from split summary and details contracts", async () => {
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
        if (url.includes("/api/v1/workbench/DEMO_ADV_USD_001/performance/summary")) {
          return {
            ok: true,
            json: async () => ({
              correlation_id: "corr-performance",
              contract_version: "v1",
              portfolio_id: "DEMO_ADV_USD_001",
              as_of_date: "2026-02-24",
              period: "YTD",
              report_start_date: "2026-01-01",
              report_end_date: "2026-02-24",
              chart_frequency: "monthly",
              detail_basis: "NET",
              benchmark_code: "BMK_GLOBAL_BALANCED_60_40",
              benchmark_options: [
                {
                  benchmark_code: "BMK_GLOBAL_BALANCED_60_40",
                  benchmark_name: "Global Balanced 60/40",
                  is_assigned: true,
                },
              ],
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
                active_return_pct: 0.76,
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
              warnings: [],
              partial_failures: [],
            }),
          } as Response;
        }
        if (url.includes("/api/bff/api/v1/workbench/DEMO_ADV_USD_001/performance/summary")) {
          const requestUrl = new URL(url, "http://localhost:3000");
          const period = requestUrl.searchParams.get("period") ?? "YTD";
          const portfolioReturnPct =
            period === "MTD" ? 1.2 : period === "QTD" ? 2.8 : period === "YTD" ? 5.42 : 12.1;
          const benchmarkReturnPct =
            period === "MTD" ? 1.0 : period === "QTD" ? 2.4 : period === "YTD" ? 4.91 : 10.7;
          return {
            ok: true,
            json: async () => ({
              correlation_id: "corr-performance",
              contract_version: "v1",
              portfolio_id: "DEMO_ADV_USD_001",
              as_of_date: "2026-02-24",
              period,
              report_start_date: "2026-01-01",
              report_end_date: "2026-02-24",
              chart_frequency: "monthly",
              detail_basis: "NET",
              benchmark_code: "BMK_GLOBAL_BALANCED_60_40",
              benchmark_options: [
                {
                  benchmark_code: "BMK_GLOBAL_BALANCED_60_40",
                  benchmark_name: "Global Balanced 60/40",
                  is_assigned: true,
                },
              ],
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
                portfolio_return_pct: portfolioReturnPct,
                benchmark_return_pct: benchmarkReturnPct,
                active_return_pct: portfolioReturnPct - benchmarkReturnPct,
                annualized_return_pct: portfolioReturnPct,
                benchmark_id: "BMK_GLOBAL_BALANCED_60_40",
                benchmark_return_source: "calculated",
              },
              gross_performance: {
                metric_basis: "GROSS",
                portfolio_return_pct: portfolioReturnPct + 0.4,
                benchmark_return_pct: benchmarkReturnPct,
                active_return_pct: portfolioReturnPct + 0.4 - benchmarkReturnPct,
                annualized_return_pct: portfolioReturnPct + 0.4,
                benchmark_id: "BMK_GLOBAL_BALANCED_60_40",
                benchmark_return_source: "calculated",
              },
              money_weighted_return: null,
              warnings: [],
              partial_failures: [],
            }),
          } as Response;
        }
        if (url.includes("/api/v1/workbench/DEMO_ADV_USD_001/performance/details")) {
          return {
            ok: true,
            json: async () => ({
              correlation_id: "corr-performance",
              contract_version: "v1",
              portfolio_id: "DEMO_ADV_USD_001",
              as_of_date: "2026-02-24",
              period: "YTD",
              report_start_date: "2026-01-01",
              report_end_date: "2026-02-24",
              chart_frequency: "monthly",
              contribution_dimension: "asset_class",
              attribution_dimension: "asset_class",
              detail_basis: "NET",
              segment: "asset_class",
              benchmark_code: "BMK_GLOBAL_BALANCED_60_40",
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
                  active_return_pct: 0.4,
                  cumulative_portfolio_return_pct: 2.4,
                  cumulative_benchmark_return_pct: 2.0,
                  cumulative_active_return_pct: 0.4,
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
                    total_weight_avg_pct: 100,
                    total_portfolio_return_pct: 5.42,
                    rows: [
                      {
                        key_label: "Equity",
                        contribution_pct: 3.8,
                        weight_avg_pct: 61,
                        total_return_pct: 7.4,
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
                benchmark_return_source: "calculated",
                active_return_pct: 0.52,
                sum_of_effects_pct: 0.5,
                residual_pct: 0.02,
                levels: [
                  {
                    dimension: "asset_class",
                    allocation_total_pct: 0.18,
                    selection_total_pct: 0.24,
                    interaction_total_pct: 0.03,
                    total_effect_pct: 0.45,
                    rows: [
                      {
                        key_label: "Equity",
                        portfolio_weight_avg_pct: 61,
                        benchmark_weight_avg_pct: 58,
                        portfolio_return_pct: 7.4,
                        benchmark_return_pct: 6.8,
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

    expect(await screen.findByRole("heading", { name: "DEMO_ADV_USD_001" })).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.getByRole("img", { name: "Net Return Path chart" })).toBeInTheDocument();
    });
    expect(screen.getAllByText("5.42%").length).toBeGreaterThan(1);
    expect(screen.getByText("Benchmark Comparison")).toBeInTheDocument();
    expect(screen.getByText("Economic Context")).toBeInTheDocument();
    expect(screen.getByLabelText("From")).toHaveValue("2026-01-01");
    expect(screen.getByLabelText("To")).toHaveValue("2026-02-24");
    expect(screen.getAllByText("Equity").length).toBeGreaterThan(1);
    expect(screen.getAllByText("AAPL").length).toBeGreaterThan(1);
    expect(screen.getAllByText("Total").length).toBeGreaterThan(1);
    expect(screen.getAllByText("$1,250,000").length).toBeGreaterThan(0);
    expect(screen.getByText("Money-Weighted")).toBeInTheDocument();
    expect(screen.getByText("MWR annualized 5.12%")).toBeInTheDocument();
    expect(screen.getAllByText("Global Balanced 60/40").length).toBeGreaterThan(0);
    expect(screen.getByText("Primary Contributor")).toBeInTheDocument();
    expect(screen.getByText("Active Weights")).toBeInTheDocument();
    expect(screen.getByText("Total Effect Ranking")).toBeInTheDocument();
    expect(await screen.findByText("Multi-Horizon Returns")).toBeInTheDocument();
    expect(screen.getByLabelText("Multi-horizon returns")).toBeInTheDocument();
    expect(screen.getAllByText("Port 61.00% / Bmk 58.00%").length).toBeGreaterThan(0);
    const attributionLegend = screen.getByLabelText("Attribution effect legend");
    expect(within(attributionLegend).getByText("Allocation")).toBeInTheDocument();
    expect(within(attributionLegend).getByText("Selection")).toBeInTheDocument();
    expect(within(attributionLegend).getByText("Interaction")).toBeInTheDocument();
    expect(await screen.findByLabelText("Compared To")).toHaveValue("BMK_GLOBAL_BALANCED_60_40");

    const fetchMock = global.fetch as unknown as ReturnType<typeof vi.fn>;
    const summaryCall = fetchMock.mock.calls.find(([input]) =>
      input.toString().includes("/api/v1/workbench/DEMO_ADV_USD_001/performance/summary")
    );
    const detailsCall = fetchMock.mock.calls.find(([input]) =>
      input.toString().includes("/api/v1/workbench/DEMO_ADV_USD_001/performance/details")
    );
    expect(summaryCall?.[0].toString()).toContain(
      "/api/v1/workbench/DEMO_ADV_USD_001/performance/summary?period=YTD&chart_frequency=monthly&contribution_dimension=asset_class&attribution_dimension=asset_class&detail_basis=NET&benchmark_code=BMK_GLOBAL_BALANCED_60_40"
    );
    expect(detailsCall?.[0].toString()).toContain(
      "/api/v1/workbench/DEMO_ADV_USD_001/performance/details?period=YTD&chart_frequency=monthly&contribution_dimension=asset_class&attribution_dimension=asset_class&detail_basis=NET&benchmark_code=BMK_GLOBAL_BALANCED_60_40"
    );
  });

  it("passes a selected benchmark through to summary and details requests", async () => {
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
        if (url.includes("/api/v1/workbench/PF_1001/performance/summary")) {
          return {
            ok: true,
            json: async () => ({
              correlation_id: "corr-performance",
              contract_version: "v1",
              portfolio_id: "PF_1001",
              as_of_date: "2026-02-24",
              period: "YTD",
              report_start_date: "2026-01-01",
              report_end_date: "2026-02-24",
              chart_frequency: "monthly",
              detail_basis: "NET",
              benchmark_code: "BMK_GLOBAL_BALANCED_60_40",
              benchmark_options: [
                {
                  benchmark_code: "BMK_GLOBAL_BALANCED_60_40",
                  benchmark_name: "Global Balanced 60/40",
                  is_assigned: true,
                },
              ],
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
              warnings: [],
              partial_failures: [],
            }),
          } as Response;
        }
        if (url.includes("/api/v1/workbench/PF_1001/performance/details")) {
          return {
            ok: true,
            json: async () => ({
              correlation_id: "corr-performance",
              contract_version: "v1",
              portfolio_id: "PF_1001",
              as_of_date: "2026-02-24",
              period: "YTD",
              report_start_date: "2026-01-01",
              report_end_date: "2026-02-24",
              chart_frequency: "monthly",
              contribution_dimension: "asset_class",
              attribution_dimension: "asset_class",
              detail_basis: "NET",
              segment: "asset_class",
              benchmark_code: "BMK_GLOBAL_BALANCED_60_40",
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
    const summaryCall = fetchMock.mock.calls.find(([input]) =>
      input.toString().includes("/api/v1/workbench/PF_1001/performance/summary")
    );
    await waitFor(() => {
      expect(
        fetchMock.mock.calls.some(([input]) =>
          input.toString().includes("/api/v1/workbench/PF_1001/performance/details")
        )
      ).toBe(true);
    });
    const detailsCall = fetchMock.mock.calls.find(([input]) =>
      input.toString().includes("/api/v1/workbench/PF_1001/performance/details")
    );
    expect(summaryCall?.[0].toString()).toContain("benchmark_code=BMK_GLOBAL_BALANCED_60_40");
    expect(detailsCall?.[0].toString()).toContain("benchmark_code=BMK_GLOBAL_BALANCED_60_40");
    expect(await screen.findByLabelText("Compared To")).toHaveValue("BMK_GLOBAL_BALANCED_60_40");
  });
});
