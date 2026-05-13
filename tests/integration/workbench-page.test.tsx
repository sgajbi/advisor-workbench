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
    expect(screen.getByRole("heading", { name: "Manage Operating Posture" })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "DPM Command Center" })).not.toBeInTheDocument();
    expect(screen.getByText("Manage module readiness")).toBeInTheDocument();
    expect(screen.getAllByText("Active Exceptions").length).toBeGreaterThan(0);
    expect(screen.getByText("Missing benchmark constituent mapping")).toBeInTheDocument();
    expect(screen.getAllByRole("link", { name: /Open Rebalance Waves/i })[0]).toHaveAttribute(
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
    expect(within(manageNav).getByRole("link", { name: "Waves" })).toHaveAttribute(
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

    expect(screen.getByRole("heading", { name: "Rebalance Waves" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Rebalance Wave Command Center" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Proof-Pack Evidence" })).toBeInTheDocument();
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
          health_state: "READY",
          health_score: 98,
          dimensions: [],
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
          recommended_actions: [],
          source_readiness: [],
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
              portfolio_id: portfolioId,
              rebalance_run_id: "run_001",
              proof_pack_id: "ppack_1",
              expected_snapshot_hash: "sha256:expected",
              realized_snapshot_hash: "sha256:realized",
              dimension_results: [],
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
