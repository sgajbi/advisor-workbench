import React from "react";
import { render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import WorkbenchPage from "../../src/app/workbench/[portfolioId]/page";

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
  }),
  useSearchParams: () => new URLSearchParams(),
}));

describe("WorkbenchPage", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("renders backend-driven workbench context and decision readiness signals", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: string | URL) => {
        const url = input.toString();
        if (url.includes("/api/v1/workbench/PF_1001/portfolio-360")) {
          return {
            ok: true,
            json: async () => ({
              correlation_id: "corr_1",
              contract_version: "v1",
              as_of_date: "2026-02-24",
              portfolio: {
                portfolio_id: "PF_1001",
                client_id: "CL_1001",
                base_currency: "USD",
                booking_center_code: "SG",
              },
              overview: {
                market_value_base: 1250000,
                cash_weight_pct: 0.0842,
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
                last_run_at_utc: "2026-02-24T00:00:00Z",
              },
              current_positions: [
                {
                  security_id: "AAPL.US",
                  instrument_name: "Apple Inc",
                  asset_class: "EQUITY",
                  quantity: 120,
                  market_value_base: 250000,
                  weight_pct: 20,
                },
              ],
              projected_positions: [],
              projected_summary: {
                total_baseline_positions: 12,
                total_proposed_positions: 12,
                net_delta_quantity: 0,
              },
              active_session_id: "sess_001",
              warnings: ["market data lagging"],
              partial_failures: [
                {
                  source_service: "performance-analytics",
                  error_code: "UPSTREAM_TIMEOUT",
                  detail: "timeout",
                },
              ],
            }),
          } as Response;
        }

        if (url.includes("/api/v1/workbench/PF_1001/analytics?")) {
          return {
            ok: true,
            json: async () => ({
              correlation_id: "corr_2",
              contract_version: "v1",
              portfolio_id: "PF_1001",
              session_id: "sess_001",
              period: "YTD",
              group_by: "ASSET_CLASS",
              benchmark_code: "MODEL_60_40",
              portfolio_return_pct: 4.12,
              benchmark_return_pct: 3.87,
              active_return_pct: 0.25,
              allocation_buckets: [],
              top_changes: [],
              risk_proxy: {
                hhi_current: 0.11,
                hhi_proposed: 0.18,
                hhi_delta: 0.07,
              },
              warnings: [],
              partial_failures: [],
            }),
          } as Response;
        }

        if (url.includes("/api/v1/reports/PF_1001/snapshot?asOfDate=2026-02-24")) {
          return {
            ok: true,
            json: async () => ({
              correlationId: "corr_3",
              contractVersion: "v1",
              sourceService: "reporting-aggregation-service",
              portfolioId: "PF_1001",
              asOfDate: "2026-02-24",
              generatedAt: "2026-02-24T00:00:00Z",
              rows: [{ bucket: "TOTAL", metric: "return_ytd_pct", value: 4.3 }],
            }),
          } as Response;
        }

        return { ok: false, json: async () => ({}) } as Response;
      })
    );

    render(
      await WorkbenchPage({
        params: Promise.resolve({ portfolioId: "PF_1001" }),
        searchParams: Promise.resolve({}),
      })
    );

    expect(screen.getByRole("heading", { name: /Advisor Workbench: PF_1001/i })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /Decision Readiness/i })).toBeInTheDocument();
    expect(screen.getByText("Concentration Signal (HHI)")).toBeInTheDocument();
    expect(screen.getByText("MEDIUM")).toBeInTheDocument();
    expect(screen.getByText("Data Integrity")).toBeInTheDocument();
    expect(screen.getByText("ATTENTION")).toBeInTheDocument();
    expect(screen.getByText("Partial Data Warning")).toBeInTheDocument();
    expect(screen.getAllByText(/UPSTREAM_TIMEOUT/).length).toBeGreaterThanOrEqual(1);
  });
});
