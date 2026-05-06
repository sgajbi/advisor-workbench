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
              warnings: ["RISK_BFF_PENDING"],
              partial_failures: [
                {
                  source_service: "risk",
                  error_code: "RISK_BFF_NOT_IMPLEMENTED",
                  detail: "Stateful concentration risk will be restored through the Risk BFF.",
                },
              ],
            }),
          } as Response;
        }

        if (url.includes("/api/v1/reports/PF_1001/snapshot?asOfDate=2026-02-24")) {
          return {
            ok: true,
            json: async () => ({
              correlationId: "corr_3",
              contractVersion: "v1",
              sourceService: "lotus-report",
              portfolioId: "PF_1001",
              asOfDate: "2026-02-24",
              generatedAt: "2026-02-24T00:00:00Z",
              rows: [{ bucket: "TOTAL", metric: "return_ytd_pct", value: 4.3 }],
            }),
          } as Response;
        }

        if (url.includes("/api/v1/dpm/command-center/outcome-reviews?portfolio_id=PF_1001")) {
          return {
            ok: true,
            json: async () => ({
              correlation_id: "corr_rfc42",
              contract_version: "v1",
              source_service: "lotus-manage",
              upstream_status: 200,
              supportability: {
                source_service: "lotus-manage",
                authority: "lotus-manage:RFC-0042",
                state: "SUPPORTED",
                reason_codes: ["READY_FOR_REPORT_INPUT"],
                blocked_actions: [],
              },
              data: {
                items: [
                  {
                    outcome_review_id: "or_1",
                    state: "READY",
                    portfolio_id: "PF_1001",
                    rebalance_run_id: "run_001",
                    proof_pack_id: "ppack_1",
                    expected_snapshot_hash: "sha256:expected",
                    realized_snapshot_hash: "sha256:realized",
                    dimension_results: [
                      {
                        dimension: "cash_weight",
                        expected: { value: "0.0340", unit: "ratio" },
                        realized: { value: "0.0342", unit: "ratio" },
                        variance: { value: "0.0002", unit: "ratio" },
                        state: "WITHIN_TOLERANCE",
                      },
                    ],
                  },
                ],
              },
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
    expect(screen.getByText("Risk Workspace")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Open Risk" })).toHaveAttribute(
      "href",
      "/performance?portfolioId=PF_1001&mode=risk"
    );
    expect(screen.getAllByText(/RISK_BFF_NOT_IMPLEMENTED/).length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText("Data Integrity")).toBeInTheDocument();
    expect(screen.getByText("ATTENTION")).toBeInTheDocument();
    expect(screen.getByText("Partial Data Warning")).toBeInTheDocument();
    expect(screen.getAllByText(/UPSTREAM_TIMEOUT/).length).toBeGreaterThanOrEqual(1);
    expect(screen.getByRole("heading", { name: "Construction Alternatives" })).toBeInTheDocument();
    expect(
      screen.getByText("Construction alternatives have not been generated")
    ).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Post-Trade Outcome Review" })).toBeInTheDocument();
    expect(screen.getByText("or_1")).toBeInTheDocument();
    expect(screen.getByText("cash_weight")).toBeInTheDocument();
  });

  it("falls back to the degraded route shell when the portfolio overview cannot be loaded", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        throw new Error("upstream offline");
      })
    );

    render(
      await WorkbenchPage({
        params: Promise.resolve({ portfolioId: "PF_404" }),
        searchParams: Promise.resolve({}),
      })
    );

    expect(screen.getByRole("heading", { name: "Advisor Workbench" })).toBeInTheDocument();
    expect(screen.getByText(/Unable to load workbench overview for PF_404/i)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Open Performance Workspace" })).toHaveAttribute(
      "href",
      "/performance?portfolioId=PF_404"
    );
    expect(screen.getByRole("link", { name: "Open Portfolio Intake" })).toHaveAttribute(
      "href",
      "/intake"
    );
  });

  it("shows degraded analytics and reporting messaging when secondary services are unavailable", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: string | URL) => {
        const url = input.toString();
        if (url.includes("/api/v1/workbench/PF_2001/portfolio-360")) {
          return {
            ok: true,
            json: async () => ({
              correlation_id: "corr_1",
              contract_version: "v1",
              as_of_date: "2026-02-24",
              portfolio: {
                portfolio_id: "PF_2001",
                client_id: "CL_2001",
                base_currency: "USD",
                booking_center_code: "SG",
              },
              overview: {
                market_value_base: 0,
                cash_weight_pct: 0,
                position_count: 0,
              },
              performance_snapshot: null,
              rebalance_snapshot: null,
              current_positions: [],
              projected_positions: [],
              projected_summary: null,
              active_session_id: null,
              warnings: [],
              partial_failures: [],
            }),
          } as Response;
        }

        if (url.includes("/api/v1/workbench/PF_2001/analytics?")) {
          throw new Error("analytics unavailable");
        }

        if (url.includes("/api/v1/reports/PF_2001/snapshot?asOfDate=2026-02-24")) {
          throw new Error("reporting unavailable");
        }

        return { ok: false, json: async () => ({}) } as Response;
      })
    );

    render(
      await WorkbenchPage({
        params: Promise.resolve({ portfolioId: "PF_2001" }),
        searchParams: Promise.resolve({
          period: "QTD",
          groupBy: "SECURITY",
          benchmark: "BMK_QTD",
          preset: "ANALYTICS",
        }),
      })
    );

    expect(screen.getByText(/Valuation is not available for this portfolio yet/i)).toBeInTheDocument();
    expect(screen.getByText(/Backend analytics endpoint is unavailable/i)).toBeInTheDocument();
    expect(
      screen.getByText(/Portfolio analytics panels will populate once the API is online\./i)
    ).toBeInTheDocument();
    expect(screen.getByText(/Reporting service is unavailable/i)).toBeInTheDocument();
    expect(
      screen.getByText(/This panel will populate when reporting aggregation is online\./i)
    ).toBeInTheDocument();
    expect(screen.getByText(/No current positions available/i)).toBeInTheDocument();
    expect(
      screen.getByText(/No current positions are available in the latest portfolio snapshot\./i)
    ).toBeInTheDocument();
    expect(screen.getByText(/Create and update a sandbox session to see projected holdings\./i)).toBeInTheDocument();
  });

  it("uses an explicit route as-of date for reporting batch operations", async () => {
    const fetchMock = vi.fn(async (input: string | URL) => {
      const url = input.toString();
      if (url.includes("/api/v1/workbench/PF_3001/portfolio-360")) {
        return {
          ok: true,
          json: async () => ({
            correlation_id: "corr_1",
            contract_version: "v1",
            as_of_date: "2026-04-27",
            portfolio: {
              portfolio_id: "PF_3001",
              client_id: "CL_3001",
              base_currency: "USD",
              booking_center_code: "SG",
            },
            overview: {
              market_value_base: 100,
              cash_weight_pct: 0,
              position_count: 1,
            },
            performance_snapshot: null,
            rebalance_snapshot: null,
            current_positions: [],
            projected_positions: [],
            projected_summary: null,
            active_session_id: null,
            warnings: [],
            partial_failures: [],
          }),
        } as Response;
      }

      if (url.includes("/api/v1/workbench/PF_3001/analytics?")) {
        throw new Error("analytics unavailable");
      }

      if (url.includes("/api/v1/reports/PF_3001/snapshot?asOfDate=2026-04-10")) {
        throw new Error("reporting unavailable");
      }

      return { ok: false, json: async () => ({}) } as Response;
    });
    vi.stubGlobal("fetch", fetchMock);

    render(
      await WorkbenchPage({
        params: Promise.resolve({ portfolioId: "PF_3001" }),
        searchParams: Promise.resolve({ asOfDate: "2026-04-10" }),
      })
    );

    expect(
      screen.getByText("Portfolio data as of: 2026-04-27 | Report date: 2026-04-10")
    ).toBeInTheDocument();
    expect(screen.getByText("PDF portfolio review batch for 2026-04-10")).toBeInTheDocument();
    expect(
      fetchMock.mock.calls.some(([input]) =>
        input.toString().includes("/api/v1/reports/PF_3001/snapshot?asOfDate=2026-04-10")
      )
    ).toBe(true);
  });
});

