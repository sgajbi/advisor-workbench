import React from "react";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
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
          const resolved =
            typeof mod === "function"
              ? (mod as React.ComponentType<Record<string, unknown>>)
              : (mod as { default?: React.ComponentType<Record<string, unknown>> }).default;
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

function installPerformancePageFetchMock(options?: {
  unassignedBenchmark?: boolean;
  unavailableSummarySeries?: boolean;
}) {
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
              { id: "PF_1001", label: "Global Balanced Mandate" },
            ],
          }),
        } as Response;
      }
      if (url.includes("/api/v1/workbench/DEMO_ADV_USD_001/performance/summary")) {
        return {
          ok: true,
          json: async () => buildSummary("DEMO_ADV_USD_001", options),
        } as Response;
      }
      if (url.includes("/api/v1/workbench/DEMO_ADV_USD_001/performance/details")) {
        return {
          ok: true,
          json: async () => buildDetails("DEMO_ADV_USD_001", options),
        } as Response;
      }
      if (url.includes("/api/bff/api/v1/workbench/DEMO_ADV_USD_001/performance/horizon-comparison")) {
        return {
          ok: true,
          json: async () => buildHorizonComparison("DEMO_ADV_USD_001"),
        } as Response;
      }
      if (url.includes("/api/bff/api/v1/workbench/DEMO_ADV_USD_001/performance/attribution-trend")) {
        return {
          ok: true,
          json: async () => buildAttributionTrend("DEMO_ADV_USD_001"),
        } as Response;
      }
      if (url.includes("/api/v1/workbench/PF_1001/performance/summary")) {
        return {
          ok: true,
          json: async () => buildSummary("PF_1001"),
        } as Response;
      }
      if (url.includes("/api/v1/workbench/PF_1001/performance/details")) {
        return {
          ok: true,
          json: async () => buildDetails("PF_1001"),
        } as Response;
      }
      return { ok: false, json: async () => ({}) } as Response;
    })
  );
}

function buildSummary(
  portfolioId: string,
  options?: { unassignedBenchmark?: boolean; unavailableSummarySeries?: boolean }
) {
  return {
    correlation_id: "corr-performance",
    contract_version: "v1",
    portfolio_id: portfolioId,
    as_of_date: "2026-02-24",
    period: "YTD",
    report_start_date: "2026-01-01",
    report_end_date: "2026-02-24",
    chart_frequency: "monthly",
    detail_basis: "NET",
    benchmark_code: options?.unassignedBenchmark ? null : "BMK_GLOBAL_BALANCED_60_40",
    benchmark_options: options?.unassignedBenchmark
      ? []
      : [
          {
            benchmark_code: "BMK_GLOBAL_BALANCED_60_40",
            benchmark_name: "Global Balanced 60/40",
            is_assigned: true,
          },
        ],
    portfolio: {
      portfolio_id: portfolioId,
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
      portfolio_return_pct: options?.unavailableSummarySeries ? null : 5.42,
      benchmark_return_pct:
        options?.unassignedBenchmark || options?.unavailableSummarySeries ? null : 4.91,
      active_return_pct:
        options?.unassignedBenchmark || options?.unavailableSummarySeries ? null : 0.52,
      annualized_return_pct: options?.unavailableSummarySeries ? null : 5.42,
      benchmark_id: options?.unassignedBenchmark ? null : "BMK_GLOBAL_BALANCED_60_40",
      benchmark_return_source: options?.unassignedBenchmark ? null : "calculated",
      begin_market_value: 1200000,
      end_market_value: 1250000,
      net_cash_flow: 42000,
    },
    gross_performance: {
      metric_basis: "GROSS",
      portfolio_return_pct: options?.unavailableSummarySeries ? null : 5.88,
      benchmark_return_pct:
        options?.unassignedBenchmark || options?.unavailableSummarySeries ? null : 5.12,
      active_return_pct:
        options?.unassignedBenchmark || options?.unavailableSummarySeries ? null : 0.76,
      annualized_return_pct: options?.unavailableSummarySeries ? null : 5.88,
      benchmark_id: options?.unassignedBenchmark ? null : "BMK_GLOBAL_BALANCED_60_40",
      benchmark_return_source: options?.unassignedBenchmark ? null : "calculated",
      begin_market_value: 1200000,
      end_market_value: 1250000,
      net_cash_flow: 42000,
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
  };
}

function buildDetails(
  portfolioId: string,
  options?: { unassignedBenchmark?: boolean; unavailableSummarySeries?: boolean }
) {
  return {
    correlation_id: "corr-performance",
    contract_version: "v1",
    portfolio_id: portfolioId,
    as_of_date: "2026-02-24",
    period: "YTD",
    report_start_date: "2026-01-01",
    report_end_date: "2026-02-24",
    chart_frequency: "monthly",
    contribution_dimension: "asset_class",
    attribution_dimension: "asset_class",
    detail_basis: "NET",
    segment: "asset_class",
    benchmark_code: options?.unassignedBenchmark ? null : "BMK_GLOBAL_BALANCED_60_40",
    net_chart: options?.unavailableSummarySeries
      ? []
      : [
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
      benchmark_id: options?.unassignedBenchmark ? null : "BMK_GLOBAL_BALANCED_60_40",
      benchmark_return_source: options?.unassignedBenchmark ? null : "calculated",
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
  };
}

function buildHorizonComparison(portfolioId: string) {
  return {
    correlation_id: "corr-performance",
    contract_version: "v1",
    portfolio_id: portfolioId,
    as_of_date: "2026-02-24",
    detail_basis: "NET",
    benchmark_code: "BMK_GLOBAL_BALANCED_60_40",
    benchmark_options: [
      {
        benchmark_code: "BMK_GLOBAL_BALANCED_60_40",
        benchmark_name: "Global Balanced 60/40",
        is_assigned: true,
      },
    ],
    rows: [
      {
        period: "MTD",
        portfolio_return_pct: 1.2,
        benchmark_return_pct: 1.0,
        active_return_pct: 0.2,
        annualized_return_pct: 1.2,
      },
      {
        period: "QTD",
        portfolio_return_pct: 2.8,
        benchmark_return_pct: 2.4,
        active_return_pct: 0.4,
        annualized_return_pct: 2.8,
      },
      {
        period: "YTD",
        portfolio_return_pct: 5.42,
        benchmark_return_pct: 4.91,
        active_return_pct: 0.51,
        annualized_return_pct: 5.42,
      },
      {
        period: "1Y",
        portfolio_return_pct: 12.1,
        benchmark_return_pct: 10.7,
        active_return_pct: 1.4,
        annualized_return_pct: 12.1,
      },
    ],
    warnings: [],
    partial_failures: [],
  };
}

function buildAttributionTrend(portfolioId: string) {
  return {
    correlation_id: "corr-performance",
    contract_version: "v1",
    portfolio_id: portfolioId,
    as_of_date: "2026-02-24",
    period: "YTD",
    report_start_date: "2026-01-01",
    report_end_date: "2026-02-24",
    chart_frequency: "monthly",
    detail_basis: "NET",
    attribution_dimension: "asset_class",
    benchmark_code: "BMK_GLOBAL_BALANCED_60_40",
    rows: [
      {
        period_label: "2026-01",
        period_start: "2026-01-01",
        period_end: "2026-01-31",
        frequency: "monthly",
        allocation_pct: 0.12,
        selection_pct: 0.08,
        interaction_pct: 0.02,
        total_effect_pct: 0.22,
        cumulative_total_effect_pct: 0.22,
        active_return_pct: 0.22,
        residual_pct: 0,
      },
    ],
    warnings: [],
    partial_failures: [],
  };
}

describe("PerformanceAnalyticsPage", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("uses the shared full-width workstation shell instead of a centered page container", async () => {
    installPerformancePageFetchMock();

    render(await PerformanceAnalyticsPage({ searchParams: Promise.resolve({}) }));

    expect(await screen.findByRole("tab", { name: "Summary" })).toBeInTheDocument();
    expect(document.querySelector("main.workstation-page.performance-page")).toBeTruthy();
    expect(document.querySelector(".page-container")).toBeFalsy();
    expect(document.querySelector(".workstation-shell-main-only")).toBeTruthy();
    expect(document.querySelector(".lotus-workstation-header")).toBeFalsy();
    expect(document.querySelector(".workbench-page-header")).toBeTruthy();
    expect(document.querySelector(".workbench-summary-card.workbench-summary-card-compact.performance-summary-stage")).toBeTruthy();
    expect(document.querySelectorAll(".workbench-summary-module-card").length).toBeGreaterThanOrEqual(1);
    expect(screen.getByRole("heading", { name: "Performance Workbench" })).toBeInTheDocument();
    expect(
      screen.getByText(
        "Benchmark-aware portfolio performance, attribution, and contribution analysis"
      )
    ).toBeInTheDocument();
  });

  it("renders performance content inside the workstation shell main region", async () => {
    installPerformancePageFetchMock();

    render(await PerformanceAnalyticsPage({ searchParams: Promise.resolve({}) }));

    const mainShell = document.querySelector(".workstation-shell-main");
    expect(mainShell).toBeTruthy();
    expect(await screen.findByRole("heading", { name: "DEMO_ADV_USD_001" })).toBeInTheDocument();
    await waitFor(() => {
      expect(mainShell).toContainElement(screen.getByText("Multi-Horizon Returns"));
      expect(screen.getByRole("img", { name: "Net Return Path chart" })).toBeInTheDocument();
      expect(mainShell?.querySelector(".performance-mini-legend.workbench-summary-toolbar")).toBeTruthy();
    });
    expect(mainShell?.querySelector(".performance-summary-stage")).toBeTruthy();
    expect(mainShell?.querySelector(".performance-chart-stage.workbench-summary-card")).toBeTruthy();
    expect(mainShell?.querySelectorAll(".workbench-summary-region")).toHaveLength(2);
    expect(mainShell?.querySelector(".performance-chart-summary-band.workbench-summary-metric-strip")).toBeTruthy();
    expect(mainShell?.querySelector(".performance-detail-grid")).toBeTruthy();
  });

  it("shows summary modules by default and hides analysis modules", async () => {
    installPerformancePageFetchMock();

    render(await PerformanceAnalyticsPage({ searchParams: Promise.resolve({}) }));

    expect(document.querySelector(".workstation-shell-main")).toBeTruthy();
    expect(await screen.findByRole("heading", { name: "DEMO_ADV_USD_001" })).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.getByRole("img", { name: "Net Return Path chart" })).toBeInTheDocument();
    });
    expect(await screen.findByText("Multi-Horizon Returns")).toBeInTheDocument();
    expect(screen.getByText("Top / Bottom Contributors")).toBeInTheDocument();
    expect(document.querySelectorAll(".performance-summary-module-card").length).toBeGreaterThanOrEqual(3);
    expect(document.querySelectorAll(".workbench-summary-visual-card").length).toBeGreaterThanOrEqual(3);
    expect(document.querySelector(".workbench-summary-visual-heading")).toBeTruthy();
    expect(document.querySelector(".workbench-summary-visual-label")).toBeTruthy();
    expect(document.querySelector(".workbench-summary-visual-value")).toBeTruthy();
    expect(document.querySelector(".workbench-summary-visual-meta")).toBeTruthy();
    expect(document.querySelector(".performance-summary-kpi-card .workbench-summary-metric-label")).toBeTruthy();
    expect(document.querySelector(".performance-summary-kpi-card .workbench-summary-metric-value")).toBeTruthy();
    expect(screen.queryByText("Attribution Over Time")).not.toBeInTheDocument();
    expect(screen.queryByText("Attribution Detail")).not.toBeInTheDocument();
    expect(screen.queryByText("Contribution Detail")).not.toBeInTheDocument();
    expect(screen.queryByText("Evidence and Calculation Context")).not.toBeInTheDocument();
  });

  it("shows analysis modules and hides summary-only modules when analysis mode is selected", async () => {
    installPerformancePageFetchMock();

    render(await PerformanceAnalyticsPage({ searchParams: Promise.resolve({}) }));

    fireEvent.click(await screen.findByRole("tab", { name: "Analysis" }));

    expect(await screen.findByText("Attribution Over Time")).toBeInTheDocument();
    expect(screen.getByText("Attribution Detail")).toBeInTheDocument();
    expect(screen.getByText("Contribution Detail")).toBeInTheDocument();
    expect(screen.getByText("Relative Segment Matrix")).toBeInTheDocument();
    expect(screen.queryByText("Top / Bottom Contributors")).not.toBeInTheDocument();
    expect(screen.queryByRole("img", { name: "Net Return Path chart" })).not.toBeInTheDocument();
    expect(screen.queryByText("Multi-Horizon Returns")).not.toBeInTheDocument();

    const attributionTable = screen.getByLabelText("Asset Class attribution table");
    expect(within(attributionTable).getAllByText("—")).toHaveLength(2);
    const attributionLegend = screen.getByLabelText("Attribution effect legend");
    expect(within(attributionLegend).getByText("Allocation")).toBeInTheDocument();
    expect(within(attributionLegend).getByText("Selection")).toBeInTheDocument();
    expect(within(attributionLegend).getByText("Interaction")).toBeInTheDocument();
  });

  it("renders an evidence placeholder when evidence mode is selected", async () => {
    installPerformancePageFetchMock();

    render(await PerformanceAnalyticsPage({ searchParams: Promise.resolve({}) }));

    fireEvent.click(await screen.findByRole("tab", { name: "Evidence" }));

    expect(await screen.findByText("Evidence and Calculation Context")).toBeInTheDocument();
    expect(
      screen.getByText(
        /execution status, lineage artifacts, and calculation evidence/i
      )
    ).toBeInTheDocument();
    expect(screen.queryByText("Top / Bottom Contributors")).not.toBeInTheDocument();
    expect(screen.queryByText("Attribution Detail")).not.toBeInTheDocument();
  });

  it("renders compact unavailable summary states when benchmark and return series are missing", async () => {
    installPerformancePageFetchMock({
      unassignedBenchmark: true,
      unavailableSummarySeries: true,
    });

    render(await PerformanceAnalyticsPage({ searchParams: Promise.resolve({}) }));

    expect(await screen.findByRole("tab", { name: "Summary" })).toBeInTheDocument();
    expect(
      document.querySelector(".performance-summary-status-card .performance-summary-kpi-value")
        ?.textContent
    ).toBe("Unassigned");
    expect(
      screen.getByText("Assign a benchmark to enable relative analytics.")
    ).toBeInTheDocument();
    expect(screen.getAllByText("Unavailable").length).toBeGreaterThanOrEqual(3);
    await waitFor(() => {
      expect(screen.getByLabelText("Net Return Path unavailable")).toBeInTheDocument();
      expect(screen.getByText("Return series unavailable")).toBeInTheDocument();
    });
    expect(screen.queryByRole("img", { name: "Net Return Path chart" })).not.toBeInTheDocument();
    expect(screen.queryByText("N/A")).not.toBeInTheDocument();
  });

  it("passes a selected benchmark through to summary and details requests", async () => {
    installPerformancePageFetchMock();

    render(
      await PerformanceAnalyticsPage({
        searchParams: Promise.resolve({
          portfolioId: "PF_1001",
          benchmark: "BMK_GLOBAL_BALANCED_60_40",
        }),
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
