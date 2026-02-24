import React from "react";
import { render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import PaAnalyticsPage from "../../src/app/pa/analytics/page";

describe("PaAnalyticsPage", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("renders backend-driven analytics and reporting rows", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: string | URL) => {
        const url = input.toString();
        if (url.includes("/api/v1/lookups/portfolios")) {
          return {
            ok: true,
            json: async () => ({
              items: [
                { id: "DEMO_DPM_EUR_001", label: "DEMO_DPM_EUR_001" },
                { id: "DEMO_ADV_USD_001", label: "DEMO_ADV_USD_001" },
              ],
            }),
          } as Response;
        }
        if (url.includes("/api/v1/workbench/DEMO_DPM_EUR_001/overview")) {
          return {
            ok: true,
            json: async () => ({
              as_of_date: "2026-02-24",
            }),
          } as Response;
        }
        if (url.includes("/api/v1/workbench/DEMO_DPM_EUR_001/analytics")) {
          return {
            ok: true,
            json: async () => ({
              period: "YTD",
              portfolio_return_pct: 4.2,
              benchmark_return_pct: 3.8,
              active_return_pct: 0.4,
              allocation_buckets: [
                {
                  bucket_key: "EQUITY",
                  bucket_label: "EQUITY",
                  current_weight_pct: 55.5,
                  proposed_weight_pct: 57.0,
                  delta_quantity: 1200,
                },
              ],
            }),
          } as Response;
        }
        if (url.includes("/api/v1/reports/DEMO_DPM_EUR_001/snapshot")) {
          return {
            ok: true,
            json: async () => ({
              rows: [{ bucket: "TOTAL", metric: "market_value_base", value: 1250000 }],
            }),
          } as Response;
        }
        return { ok: false, json: async () => ({}) } as Response;
      })
    );

    render(await PaAnalyticsPage({ searchParams: Promise.resolve({}) }));

    expect(screen.getByRole("heading", { name: /Analytics Studio: DEMO_DPM_EUR_001/i })).toBeInTheDocument();
    expect(screen.getByText("4.20%")).toBeInTheDocument();
    expect(screen.getByText("EQUITY")).toBeInTheDocument();
    expect(screen.getByText("market_value_base")).toBeInTheDocument();
    expect(screen.getByText("2026-02-24")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "DEMO_ADV_USD_001" })).toHaveAttribute(
      "href",
      "/pa/analytics?portfolioId=DEMO_ADV_USD_001&period=YTD&benchmark=MODEL_60_40"
    );
    expect(screen.getByRole("link", { name: /Open Decision Console/i })).toHaveAttribute(
      "href",
      "/workbench/DEMO_DPM_EUR_001"
    );

    const fetchMock = global.fetch as unknown as ReturnType<typeof vi.fn>;
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining("/api/v1/reports/DEMO_DPM_EUR_001/snapshot?asOfDate=2026-02-24"),
      expect.objectContaining({ cache: "no-store" })
    );
  });
});
