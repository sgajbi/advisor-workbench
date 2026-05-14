import React from "react";
import { render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import WorkbenchPage from "../../src/app/workbench/[portfolioId]/page";

vi.mock("next/navigation", () => ({
  usePathname: () => "/workbench/PF_1001",
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

  it("renders a focused manage overview with shared Workbench navigation", async () => {
    vi.stubGlobal("fetch", vi.fn(createManageFetch({ portfolioId: "PF_1001" })));

    render(
      await WorkbenchPage({
        params: Promise.resolve({ portfolioId: "PF_1001" }),
        searchParams: Promise.resolve({}),
      })
    );

    expect(screen.getByRole("heading", { name: "Manage Overview" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Mandate Operating Posture" })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "DPM Command Center" })).not.toBeInTheDocument();
    expect(screen.getByLabelText("Decision readiness")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Attention Required" })).toBeInTheDocument();
    expect(screen.getByText("Benchmark mapping requires review")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Rebalance Ready/i })).toHaveAttribute(
      "href",
      "/workbench/PF_1001?mode=waves"
    );

    const screenNav = screen.getByRole("navigation", { name: "Workbench screen navigation" });
    expect(within(screenNav).getByRole("link", { name: /Portfolio/i })).toHaveAttribute(
      "href",
      "/portfolio?portfolioId=PF_1001"
    );
    expect(within(screenNav).getByRole("link", { name: /Manage/i })).toHaveAttribute(
      "aria-current",
      "page"
    );

    const manageNav = screen.getByLabelText("Manage workspace navigation");
    expect(within(manageNav).getByRole("link", { name: "Overview" })).toHaveAttribute(
      "href",
      "/workbench/PF_1001"
    );
    expect(within(manageNav).getByRole("link", { name: "Mandate" })).toHaveAttribute(
      "href",
      "/workbench/PF_1001?mode=mandate"
    );
    expect(within(manageNav).getByRole("link", { name: "Rebalance" })).toHaveAttribute(
      "href",
      "/workbench/PF_1001?mode=waves"
    );
    expect(screen.queryByRole("heading", { name: "Construction Alternatives" })).not.toBeInTheDocument();
  });

  it("falls back to the degraded manage shell when portfolio context cannot be loaded", async () => {
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

    expect(screen.getByRole("heading", { name: "Manage Workspace" })).toBeInTheDocument();
    expect(screen.getByText(/Unable to load portfolio context for PF_404/i)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Open Performance Workspace" })).toHaveAttribute(
      "href",
      "/performance?portfolioId=PF_404"
    );
    expect(screen.getByRole("link", { name: "Return To Portfolio" })).toHaveAttribute(
      "href",
      "/portfolio"
    );
  });

  it("renders mandate health as a focused manage surface", async () => {
    vi.stubGlobal("fetch", vi.fn(createManageFetch({ portfolioId: "PF_1101" })));

    render(
      await WorkbenchPage({
        params: Promise.resolve({ portfolioId: "PF_1101" }),
        searchParams: Promise.resolve({ mode: "mandate" }),
      })
    );

    expect(screen.getAllByRole("heading", { name: "Mandate Health" }).length).toBeGreaterThan(0);
    expect(screen.getAllByText("Data Readiness").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Recommended Actions").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Attention Required").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Health Dimensions Breakdown").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Latest Review").length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Market Data/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Stale price/i).length).toBeGreaterThan(0);
    expect(screen.queryByText("Execute Trade")).not.toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "DPM Command Center" })).not.toBeInTheDocument();
  });

  it("renders construction as its own manage surface instead of the full operations stack", async () => {
    vi.stubGlobal("fetch", vi.fn(createManageFetch({ portfolioId: "PF_2001" })));

    render(
      await WorkbenchPage({
        params: Promise.resolve({ portfolioId: "PF_2001" }),
        searchParams: Promise.resolve({ mode: "construction" }),
      })
    );

    expect(screen.getAllByRole("heading", { name: "Construction Alternatives" })).toHaveLength(2);
    expect(screen.queryByRole("heading", { name: "DPM Command Center" })).not.toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Portfolio Memory" })).not.toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Post-Trade Outcome Review" })).not.toBeInTheDocument();
  });

  it("renders wave lifecycle and proof-pack evidence as a dedicated manage surface", async () => {
    const fetchMock = vi.fn(createManageFetch({ portfolioId: "PF_3001" }));
    vi.stubGlobal("fetch", fetchMock);

    render(
      await WorkbenchPage({
        params: Promise.resolve({ portfolioId: "PF_3001" }),
        searchParams: Promise.resolve({ mode: "waves" }),
      })
    );

    expect(screen.getAllByRole("heading", { name: "Rebalance" }).length).toBeGreaterThan(0);
    expect(screen.getByRole("heading", { name: "Active Rebalance" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Proposed Changes" })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Construction Alternatives" })).not.toBeInTheDocument();
    expect(
      fetchMock.mock.calls.some(([input]) =>
        input.toString().includes("/api/v1/dpm/command-center/waves?")
      )
    ).toBe(true);
    expect(
      fetchMock.mock.calls.some(([input]) =>
        input.toString().includes("/api/v1/dpm/command-center/outcome-reviews?portfolio_id=PF_3001")
      )
    ).toBe(true);
  });

  it("renders outcome reviews from Gateway-backed manage data", async () => {
    const fetchMock = vi.fn(createManageFetch({ portfolioId: "PF_4001" }));
    vi.stubGlobal("fetch", fetchMock);

    render(
      await WorkbenchPage({
        params: Promise.resolve({ portfolioId: "PF_4001" }),
        searchParams: Promise.resolve({ mode: "reviews" }),
      })
    );

    expect(screen.getAllByRole("heading", { name: "Outcome Reviews" }).length).toBeGreaterThan(0);
    expect(screen.getByText("Review Timeline")).toBeInTheDocument();
    expect(screen.getByText("Selected Review Detail")).toBeInTheDocument();
    expect(screen.getAllByText("Within Mandate").length).toBeGreaterThan(0);
    expect(screen.getByText("72.4%")).toBeInTheDocument();
    expect(screen.getByText("Drift Reduction")).toBeInTheDocument();
    expect(screen.queryByText("or_1")).not.toBeInTheDocument();
    expect(
      fetchMock.mock.calls.some(([input]) =>
        input.toString().includes("/api/v1/dpm/command-center/outcome-reviews?portfolio_id=PF_4001")
      )
    ).toBe(true);
  });
});

function createManageFetch({ portfolioId }: { portfolioId: string }) {
  return async (input: string | URL) => {
    const url = input.toString();
    if (url.includes(`/api/v1/workbench/${portfolioId}/portfolio-360`)) {
      return jsonResponse({
        correlation_id: "corr_1",
        contract_version: "v1",
        as_of_date: "2026-05-13",
        portfolio: {
          portfolio_id: portfolioId,
          client_id: "CL_1001",
          base_currency: "USD",
          booking_center_code: "SG",
        },
        overview: {
          market_value_base: 1250000,
          cash_weight_pct: 8.42,
          position_count: 12,
        },
        performance_snapshot: null,
        rebalance_snapshot: {
          status: "READY",
          last_rebalance_run_id: "run_001",
          last_run_at_utc: "2026-05-13T00:00:00Z",
          supportability: null,
          recent_runs: [],
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
        projected_summary: null,
        active_session_id: null,
        warnings: [],
        partial_failures: [],
      });
    }

    if (url.includes("/api/v1/dpm/command-center/mandates/by-portfolio/")) {
      return jsonResponse({
        correlation_id: "corr_mandate",
        contract_version: "v1",
        source_service: "lotus-manage",
        upstream_status: 200,
        supportability: {
          source_service: "lotus-manage",
          authority: "lotus-manage:mandate",
          state: "SUPPORTED",
          reason_codes: ["MANDATE_READY"],
          blocked_actions: [],
        },
        data: {
          mandate_id: "mandate_001",
          portfolio_id: portfolioId,
          mandate_type: "Discretionary Balanced",
          risk_profile: "Balanced",
          benchmark_id: "PB_GLOBAL_BALANCED_60_40",
          pm_book_id: "PM_BOOK_SG_BALANCED",
        },
      });
    }

    if (url.includes("/api/v1/dpm/command-center/mandates/mandate_001/health")) {
      return jsonResponse({
        correlation_id: "corr_health",
        contract_version: "v1",
        source_service: "lotus-manage",
        upstream_status: 200,
        supportability: {
          source_service: "lotus-manage",
          authority: "lotus-manage:mandate-health",
          state: "SUPPORTED",
          reason_codes: ["HEALTH_READY"],
          blocked_actions: [],
        },
        data: {
          mandate_id: "mandate_001",
          health_state: "PARTIAL",
          health_score: 82,
          recommended_action: "Request source refresh",
          dimension_scores: [
            {
              dimension: "Source Readiness",
              score: 75,
              state: "PARTIAL",
              reason_codes: ["PRICE_STALE"],
            },
            {
              dimension: "Benchmark Mapping",
              score: 98,
              state: "READY",
              reason_codes: [],
            },
            {
              dimension: "Mandate Constraints",
              score: 100,
              state: "READY",
              reason_codes: [],
            },
          ],
        },
      });
    }

    if (url.includes("/api/v1/dpm/command-center?")) {
      return jsonResponse({
        correlation_id: "corr_command",
        contract_version: "v1",
        source_service: "lotus-manage",
        upstream_status: 200,
        supportability: {
          source_service: "lotus-manage",
          authority: "lotus-manage:command-center",
          state: "SUPPORTED",
          reason_codes: ["COMMAND_CENTER_READY"],
          blocked_actions: [],
        },
        data: {
          summary: {
            evaluated_mandates: 1,
            active_exception_count: 3,
            data_completeness_state: "PARTIAL",
            source_run_id: "run_001",
          },
          latest_monitoring_run: {
            monitoring_run_id: "run_001",
            status: "READY",
          },
          health_distribution: [{ state: "READY", count: 1 }],
          attention_buckets: [],
          recommended_actions: [
            {
              recommended_action: "Request source refresh",
              severity: "HIGH",
              count: 1,
            },
            {
              recommended_action: "Review benchmark evidence",
              severity: "MEDIUM",
              count: 1,
            },
          ],
          source_readiness: [
            {
              source_service: "lotus-pricing",
              state: "READY",
              last_updated: "2026-05-13T08:30:00Z",
              reason_code: "-",
            },
            {
              source_service: "lotus-performance",
              state: "PARTIAL",
              last_updated: "2026-05-12T17:00:00Z",
              reason_code: "PRICE_STALE",
            },
            {
              source_service: "lotus-core",
              state: "READY",
              last_updated: "2026-05-13T08:30:00Z",
              reason_code: "-",
            },
          ],
        },
      });
    }

    if (url.includes("/api/v1/dpm/command-center/exceptions?")) {
      return jsonResponse({
        correlation_id: "corr_exceptions",
        contract_version: "v1",
        source_service: "lotus-manage",
        upstream_status: 200,
        supportability: {
          source_service: "lotus-manage",
          authority: "lotus-manage:exceptions",
          state: "SUPPORTED",
          reason_codes: ["ACTIVE_EXCEPTIONS"],
          blocked_actions: [],
        },
        data: {
          items: [
            {
              exception_id: "exc_001",
              severity: "HIGH",
              title: "Missing benchmark constituent mapping",
              source_system: "lotus-performance",
              owner: "PM Ops",
              age_hours: 48,
              state: "ACTIVE",
              next_action: "Review benchmark mapping",
            },
            {
              exception_id: "exc_002",
              severity: "MEDIUM",
              title: "Stale price for fixed income instrument",
              source_system: "lotus-pricing",
              owner: "Data Ops",
              age_hours: 24,
              state: "ACTIVE",
              next_action: "Request refresh",
            },
          ],
        },
      });
    }

    if (url.includes(`/api/v1/dpm/command-center/portfolios/${portfolioId}/memory`)) {
      return jsonResponse({
        correlation_id: "corr_memory",
        contract_version: "v1",
        source_service: "lotus-manage",
        upstream_status: 200,
        supportability: {
          source_service: "lotus-manage",
          authority: "lotus-manage:portfolio-memory",
          state: "SUPPORTED",
          event_count: 42,
          event_type_counts: { MONITORING_RUN: 1 },
          source_systems: ["lotus-manage"],
          reason_codes: ["MEMORY_READY"],
          content_hash: "sha256:memory",
          blocked_actions: [],
        },
        data: { events: [] },
      });
    }

    if (url.includes("/api/v1/dpm/command-center/waves?")) {
      return jsonResponse({
        correlation_id: "corr_waves",
        contract_version: "v1",
        source_service: "lotus-manage",
        upstream_status: 200,
        supportability: {
          source_service: "lotus-manage",
          authority: "lotus-manage:waves",
          state: "SUPPORTED",
          reason_codes: ["WAVE_READY"],
          blocked_actions: [],
        },
        data: {
          items: [
            {
              wave_id: "wave_001",
              state: "READY",
              trigger_type: "EXPLICIT_PORTFOLIO_LIST",
              as_of_date: "2026-05-13",
              item_count: 1,
              issue_count: 0,
            },
          ],
        },
      });
    }

    if (url.includes(`/api/v1/dpm/command-center/outcome-reviews?portfolio_id=${portfolioId}`)) {
      return jsonResponse({
        correlation_id: "corr_reviews",
        contract_version: "v1",
        source_service: "lotus-manage",
        upstream_status: 200,
        supportability: {
          source_service: "lotus-manage",
          authority: "lotus-manage:outcome-reviews",
          state: "SUPPORTED",
          reason_codes: ["READY_FOR_REPORT_INPUT"],
          blocked_actions: [],
        },
        data: {
          items: [
            {
              outcome_review_id: "or_1",
              state: "READY",
              overall_outcome: "READY_WITHIN_TOLERANCE",
              portfolio_id: portfolioId,
              rebalance_run_id: "run_001",
              proof_pack_id: "ppack_1",
              expected_snapshot_hash: "sha256:expected",
              realized_snapshot_hash: "sha256:realized",
              created_at: "2026-05-13T09:35:00Z",
              review_window: { start: "2026-05-01", end: "2026-05-13" },
              variance_summary: { drift_improvement_pct: 72.4 },
              supportability: {
                explanation: "Outcome remains within mandate tolerance for advisor handoff.",
              },
              dimension_results: [
                {
                  dimension: "DRIFT_REDUCTION",
                  expected: { value: 0.042, unit: "ratio" },
                  realized: { value: 0.012, unit: "ratio" },
                  variance: { value: -0.03, unit: "ratio" },
                  state: "READY",
                  explanation: "Drift reduction achieved within tolerance.",
                },
              ],
              source_lineage: [
                {
                  source_system: "lotus-manage",
                  source_id: "selected-alternative-1",
                  content_hash: "sha256:selected",
                },
              ],
            },
          ],
        },
      });
    }

    return jsonResponse({}, false);
  };
}

function jsonResponse(payload: unknown, ok = true) {
  return {
    ok,
    json: async () => payload,
  } as Response;
}
