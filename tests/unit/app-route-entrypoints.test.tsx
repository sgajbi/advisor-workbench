import { beforeEach, describe, expect, it, vi } from "vitest";
import React from "react";
import { render, screen } from "@testing-library/react";

import HomeAppPage from "@/apps/home/page";
import PerformanceAppPage from "@/apps/performance/page";
import RecommendationsAppPage from "@/apps/recommendations/page";

const redirectMock = vi.fn((target: string) => {
  throw new Error(`REDIRECT:${target}`);
});

vi.mock("echarts-for-react", () => ({
  default: ({ style }: { style?: React.CSSProperties }) => (
    <div data-testid="performance-echart" style={style} />
  ),
}));

vi.mock("next/navigation", () => ({
  redirect: (target: string) => redirectMock(target),
  usePathname: () => "/performance",
  useRouter: () => ({
    replace: vi.fn(),
  }),
}));

vi.mock("@/features/proposals/components/proposal-list-view", () => ({
  default: ({
    title,
    initialPortfolioId,
  }: {
    title?: string;
    initialPortfolioId?: string;
  }) => (
    <section>
      <h1>{title}</h1>
      <p>{initialPortfolioId ?? "no portfolio selected"}</p>
    </section>
  ),
}));

vi.mock("next/dynamic", () => ({
  default: (loader: () => Promise<unknown>) => {
    return function MockDynamicComponent(props: Record<string, unknown>) {
      const [Component, setComponent] = React.useState<
        React.ComponentType<Record<string, unknown>> | null
      >(null);
      React.useEffect(() => {
        loader().then((mod: unknown) => {
          const resolved = (mod as { default?: React.ComponentType<Record<string, unknown>> }).default;
          setComponent(resolved ?? null);
        });
      }, []);
      return Component ? React.createElement(Component, props) : null;
    };
  },
}));

describe("app route entrypoints", () => {
  beforeEach(() => {
    redirectMock.mockClear();
  });

  it("routes home into the portfolio workspace", () => {
    expect(() => HomeAppPage()).toThrowError("REDIRECT:/portfolio");
    expect(redirectMock).toHaveBeenCalledWith("/portfolio");
  });

  it("mounts performance from the app-owned analytics page", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: string | URL) => {
        const url = input.toString();
        if (url.includes("/api/v1/lookups/portfolios")) {
          return {
            ok: true,
            json: async () => ({ items: [{ id: "PORT_1001", label: "PORT_1001" }] }),
          } as Response;
        }
        if (url.includes("/api/v1/workbench/PORT_1001/performance?")) {
          throw new Error(`Deprecated aggregate performance route used: ${url}`);
        }
        if (url.includes("/api/v1/workbench/PORT_1001/performance/summary?")) {
          return {
            ok: true,
            json: async () => ({
              correlation_id: "corr-performance",
              contract_version: "v1",
              portfolio_id: "PORT_1001",
              as_of_date: "2026-03-26",
              period: "YTD",
              chart_frequency: "monthly",
              contribution_dimension: "asset_class",
              attribution_dimension: "asset_class",
              detail_basis: "NET",
              benchmark_code: null,
              portfolio: {
                portfolio_id: "PORT_1001",
                client_id: null,
                base_currency: "USD",
                booking_center_code: null,
              },
              overview: {
                market_value_base: 1000000,
                cash_weight_pct: 4.5,
                position_count: 12,
              },
              net_performance: {
                metric_basis: "NET",
                portfolio_return_pct: 1.2,
                benchmark_return_pct: null,
                active_return_pct: 0.2,
                annualized_return_pct: 1.2,
                benchmark_id: null,
                benchmark_return_source: null,
              },
              gross_performance: {
                metric_basis: "GROSS",
                portfolio_return_pct: 1.5,
                benchmark_return_pct: null,
                active_return_pct: 0.5,
                annualized_return_pct: 1.5,
                benchmark_id: null,
                benchmark_return_source: null,
              },
              money_weighted_return: {
                money_weighted_return_pct: 1.1,
                annualized_return_pct: 1.1,
                method: "XIRR",
                start_date: "2026-01-01",
                end_date: "2026-03-26",
                notes: [],
              },
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
      await PerformanceAppPage({ searchParams: Promise.resolve({ portfolioId: "PORT_1001" }) })
    );

    expect(
      await screen.findByRole("heading", { name: "Performance" })
    ).toBeInTheDocument();
  });

  it("mounts recommendations as the advisory workspace when portfolio context exists", async () => {
    render(
      await RecommendationsAppPage({
        searchParams: Promise.resolve({ portfolioId: "PORT_1001" }),
      })
    );

    expect(screen.getByRole("heading", { name: "Advisory Workspace" })).toBeInTheDocument();
    expect(screen.getByText("PORT_1001")).toBeInTheDocument();
  });

  it("mounts recommendations without leaving the advisory route when no portfolio is selected", async () => {
    render(await RecommendationsAppPage({ searchParams: Promise.resolve({}) }));

    expect(screen.getByRole("heading", { name: "Advisory Workspace" })).toBeInTheDocument();
    expect(screen.getByText("no portfolio selected")).toBeInTheDocument();
  });
});
