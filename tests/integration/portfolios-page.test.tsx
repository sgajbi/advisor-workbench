import React from "react";
import { render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import PortfolioFoundationPage from "../../src/app/portfolios/page";

describe("PortfolioFoundationPage", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("renders portfolio list and health context from BFF responses", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: string | URL) => {
        const url = input.toString();
        if (url.includes("/api/v1/lookups/portfolios")) {
          return {
            ok: true,
            json: async () => ({
              items: [
                { id: "PORT_UI_1001", label: "PORT_UI_1001" },
                { id: "PORT_UI_1002", label: "PORT_UI_1002" },
              ],
            }),
          } as Response;
        }
        if (url.includes("/api/v1/workbench/PORT_UI_1001/overview")) {
          return {
            ok: true,
            json: async () => ({
              as_of_date: "2026-02-24",
              portfolio: {
                portfolio_id: "PORT_UI_1001",
                base_currency: "USD",
                booking_center_code: "SG",
              },
              overview: {
                market_value_base: 1250000,
                cash_weight_pct: 8.42,
                position_count: 12,
              },
              performance_snapshot: {
                period: "YTD",
                return_pct: 4.12,
                benchmark_return_pct: 3.87,
              },
              rebalance_snapshot: {
                status: "READY",
                last_rebalance_run_id: "run_001",
              },
            }),
          } as Response;
        }
        if (url.includes("/api/v1/workbench/PORT_UI_1002/overview")) {
          return {
            ok: true,
            json: async () => ({
              as_of_date: "2026-02-24",
              portfolio: {
                portfolio_id: "PORT_UI_1002",
                base_currency: "USD",
                booking_center_code: "SG",
              },
              overview: {
                market_value_base: 980000,
                cash_weight_pct: 5.25,
                position_count: 9,
              },
              performance_snapshot: {
                period: "YTD",
                return_pct: 3.02,
                benchmark_return_pct: 2.87,
              },
              rebalance_snapshot: {
                status: "READY",
                last_rebalance_run_id: "run_002",
              },
            }),
          } as Response;
        }
        if (url.includes("/api/v1/reports/PORT_UI_1001/snapshot?asOfDate=2026-02-24")) {
          return {
            ok: true,
            json: async () => ({
              rows: [
                { bucket: "TOTAL", metric: "market_value_base", value: 1250000 },
                { bucket: "TOTAL", metric: "return_ytd_pct", value: 4.3 },
              ],
            }),
          } as Response;
        }
        if (url.includes("/api/v1/reports/PORT_UI_1002/snapshot?asOfDate=2026-02-24")) {
          return {
            ok: true,
            json: async () => ({
              rows: [{ bucket: "TOTAL", metric: "return_ytd_pct", value: 3.1 }],
            }),
          } as Response;
        }
        if (url.includes("/api/v1/workbench/PORT_UI_1001/portfolio-360")) {
          return {
            ok: true,
            json: async () => ({
              current_positions: [
                {
                  security_id: "AAPL.US",
                  instrument_name: "Apple Inc",
                  asset_class: "EQUITY",
                  quantity: 120,
                  market_value_base: 250000,
                  weight_pct: 20,
                },
                {
                  security_id: "MSFT.US",
                  instrument_name: "Microsoft Corp",
                  asset_class: "EQUITY",
                  quantity: 90,
                  market_value_base: 180000,
                  weight_pct: 14.4,
                },
              ],
            }),
          } as Response;
        }
        return { ok: false, json: async () => ({}) } as Response;
      })
    );

    render(await PortfolioFoundationPage({ searchParams: Promise.resolve({}) }));

    expect(screen.getByRole("heading", { name: /Portfolio Foundation/i })).toBeInTheDocument();
    expect(screen.getAllByRole("link", { name: "PORT_UI_1001" }).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByRole("link", { name: "PORT_UI_1002" }).length).toBeGreaterThanOrEqual(1);
    expect(screen.getByRole("heading", { name: /Portfolio Catalog Snapshot/i })).toBeInTheDocument();
    expect(screen.getAllByText("$1,250,000").length).toBeGreaterThanOrEqual(2);
    expect(screen.getAllByText("12").length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText("8.42%")).toBeInTheDocument();
    expect(screen.getAllByText("4.30%").length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText("3.10%")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /Top Holdings Snapshot/i })).toBeInTheDocument();
    expect(screen.getByText("AAPL.US")).toBeInTheDocument();
    expect(screen.getByText("Apple Inc")).toBeInTheDocument();
    expect(screen.getByText("20.00%")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Open Decision Console/i })).toHaveAttribute(
      "href",
      "/workbench/PORT_UI_1001"
    );
    expect(screen.getByRole("link", { name: /Start Advisory Iteration/i })).toHaveAttribute(
      "href",
      "/proposals/simulate?portfolioId=PORT_UI_1001"
    );
  });
});
