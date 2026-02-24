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
              items: [{ id: "PORT_UI_1001", label: "PORT_UI_1001" }],
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
        return { ok: false, json: async () => ({}) } as Response;
      })
    );

    render(await PortfolioFoundationPage({ searchParams: Promise.resolve({}) }));

    expect(screen.getByRole("heading", { name: /Portfolio Foundation/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "PORT_UI_1001" })).toBeInTheDocument();
    expect(screen.getByText("$1,250,000")).toBeInTheDocument();
    expect(screen.getByText("12")).toBeInTheDocument();
    expect(screen.getByText("8.42%")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Open Decision Console/i })).toHaveAttribute(
      "href",
      "/workbench/PORT_UI_1001"
    );
  });
});
