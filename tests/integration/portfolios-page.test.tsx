import React from "react";
import { render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import PortfolioFoundationPage from "../../src/app/portfolios/page";

describe("PortfolioFoundationPage", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("renders the advisor-grade portfolio experience from Foundation contracts", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: string | URL) => {
        const url = input.toString();
        if (url.includes("/api/v1/foundation/portfolios/PORT_UI_1001/workspace")) {
          return {
            ok: true,
            json: async () => ({
              as_of_date: "2026-02-24",
              portfolio: {
                portfolio_id: "PORT_UI_1001",
                display_name: "Global Balanced",
                client_id: "CIF_1001",
                base_currency: "USD",
                booking_center_code: "SG",
              },
              summary: {
                market_value_base: 1250000,
                total_cash_base: 105000,
                cash_weight_pct: 8.4,
                position_count: 12,
              },
              performance: {
                period: "YTD",
                return_pct: 4.12,
              },
              rebalance: {
                status: "MONITORED",
                last_rebalance_run_id: "run_001",
                last_run_at_utc: "2026-02-24T08:30:00Z",
              },
              readiness: {
                has_positions: true,
                reporting: {
                  status: "READY",
                  generated_at_utc: "2026-02-24T08:32:00Z",
                  row_count: 14,
                },
              },
              allocations: [
                {
                  asset_class: "Equities",
                  position_count: 7,
                  market_value_base: 725000,
                  weight_pct: 58,
                },
                {
                  asset_class: "Fixed Income",
                  position_count: 4,
                  market_value_base: 320000,
                  weight_pct: 25.6,
                },
              ],
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
                  instrument_name: "US Treasury 10Y",
                  asset_class: "Fixed Income",
                  quantity: 80,
                  market_value_base: 180000,
                  weight_pct: 14.4,
                },
              ],
              workflow_cues: [
                { key: "performance", label: "Performance", href: "/ignored" },
                { key: "risk", label: "Risk", href: "/ignored" },
                { key: "proposal", label: "Proposal", href: "/ignored" },
              ],
              warnings: ["FOUNDATION_REPORTING_UNAVAILABLE"],
              partial_failures: [
                {
                  source_service: "lotus-report",
                  error_code: "HTTP_503",
                  detail: "snapshot service unavailable",
                },
              ],
            }),
          } as Response;
        }
        if (url.includes("/api/v1/foundation/portfolios")) {
          return {
            ok: true,
            json: async () => ({
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
            }),
          } as Response;
        }
        return { ok: false, json: async () => ({}) } as Response;
      })
    );

    render(await PortfolioFoundationPage({ searchParams: Promise.resolve({}) }));

    expect(screen.getByRole("heading", { name: /^Portfolio$/i })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /Global Balanced/i })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /Client Portfolios/i })).toBeInTheDocument();
    expect(screen.getByText("Income Plus")).toBeInTheDocument();
    expect(screen.getAllByText("$1,250,000").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("$105,000").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("8.40%").length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText("MONITORED")).toBeInTheDocument();
    expect(screen.getByText("2026-02-24T08:32:00Z")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /Allocation Shape/i })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /Top Positions/i })).toBeInTheDocument();
    expect(screen.getByText("Apple Inc")).toBeInTheDocument();
    expect(screen.getByText("US Treasury 10Y")).toBeInTheDocument();
    expect(screen.getAllByText("Equities").length).toBeGreaterThanOrEqual(2);
    expect(screen.getAllByText("Fixed Income").length).toBeGreaterThanOrEqual(2);
    expect(screen.getByText("Reporting temporarily unavailable")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /Data Coverage/i })).toBeInTheDocument();
    expect(screen.getByText("Reporting")).toBeInTheDocument();
    expect(screen.getByText("HTTP_503")).toBeInTheDocument();
    expect(screen.getByText("snapshot service unavailable")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Open Performance/i })).toHaveAttribute(
      "href",
      "/performance?portfolioId=PORT_UI_1001"
    );
    expect(screen.getByRole("link", { name: /Prepare Recommendation/i })).toHaveAttribute(
      "href",
      "/recommendations?portfolioId=PORT_UI_1001"
    );
  });
});
