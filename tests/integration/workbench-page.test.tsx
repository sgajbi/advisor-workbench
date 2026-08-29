import { fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import WorkbenchPage from "../../src/app/workbench/[portfolioId]/page";
import { expectReviewContextOwns } from "../review-context-census";

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
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("renders a focused manage overview with shared Workbench navigation", async () => {
    const fetchMock = vi.fn(createManageFetch({ portfolioId: "PF_1001" }));
    vi.stubGlobal("fetch", fetchMock);

    render(
      await WorkbenchPage({
        params: Promise.resolve({ portfolioId: "PF_1001" }),
        searchParams: Promise.resolve({
          asOfDate: "2026-06-30",
          period: "3Y",
          reportingCurrency: "SGD",
        }),
      })
    );

    expect(screen.getByRole("heading", { name: "Manage Overview" })).toBeInTheDocument();
    const reviewContext = screen.getByTestId("review-context-strip");
    expect(reviewContext).toHaveTextContent(
      "Mandate source context",
    );
    expect(reviewContext).toHaveTextContent(
      /source valuation date 13 May 2026.*advisor review date 30 Jun 2026/i,
    );
    expect(reviewContext).toHaveTextContent(
      /source base currency USD.*restatement to SGD is not supported/i,
    );
    expect(reviewContext).toHaveTextContent(
      /review period 3Y.*does not filter this mandate management workspace/i,
    );
    expectReviewContextOwns({
      exclusiveFacts: ["PF_1001", "CL_1001", "Singapore"],
      contextualFacts: [{ label: "Business date", value: "13 May 2026" }],
    });
    expect(screen.queryByTestId("workbench-context-notice")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Manage portfolio context")).not.toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Portfolio management decisions" })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "DPM Command Center" })).not.toBeInTheDocument();
    expect(screen.getByLabelText("Operating posture")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "What needs review now" })).toBeInTheDocument();
    expect(screen.getAllByText("Benchmark mapping requires review")).toHaveLength(1);
    expect(
      fetchMock.mock.calls.some(([input]) =>
        input
          .toString()
          .includes("/api/v1/dpm/command-center/exceptions?tenant_id=default&portfolio_manager_id=PM_SG_DPM_001&limit=25&portfolio_id=PF_1001&state=ACTIVE")
      )
    ).toBe(true);
    fireEvent.click(screen.getByRole("option", { name: /Review the active rebalance/i }));
    expect(screen.getByRole("link", { name: "Open rebalance waves" })).toHaveAttribute(
      "href",
      "/workbench/PF_1001?portfolioId=PF_1001&asOfDate=2026-06-30&period=3Y&reportingCurrency=SGD&mode=waves",
    );
    expect(screen.queryByRole("navigation", { name: "Manage work areas" })).not.toBeInTheDocument();

    const screenNav = screen.getByRole("navigation", { name: "Workbench screen navigation" });
    expect(within(screenNav).getByRole("link", { name: /Portfolio/i })).toHaveAttribute(
      "href",
      "/portfolio?portfolioId=PF_1001"
    );
    expect(within(screenNav).getByRole("link", { name: /Mandate management/i })).toHaveAttribute(
      "aria-current",
      "page"
    );

    const manageNav = screen.getByLabelText("Manage workspace navigation");
    expect(within(manageNav).getByRole("link", { name: "Overview" })).toHaveAttribute(
      "href",
      "/workbench/PF_1001?portfolioId=PF_1001&asOfDate=2026-06-30&period=3Y&reportingCurrency=SGD"
    );
    fireEvent.click(
      within(manageNav).getByRole("button", { name: /Change workflow step/i }),
    );
    expect(within(manageNav).getByRole("link", { name: "Mandate" })).toHaveAttribute(
      "href",
      "/workbench/PF_1001?portfolioId=PF_1001&asOfDate=2026-06-30&period=3Y&reportingCurrency=SGD&mode=mandate"
    );
    expect(within(manageNav).getByRole("link", { name: "Rebalance" })).toHaveAttribute(
      "href",
      "/workbench/PF_1001?portfolioId=PF_1001&asOfDate=2026-06-30&period=3Y&reportingCurrency=SGD&mode=waves"
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
    expect(screen.getByTestId("review-context-strip")).toHaveTextContent(
      "Portfolio not confirmed",
    );
    expect(screen.queryByText("PF_404")).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Select a portfolio from My book" })).toHaveAttribute(
      "href",
      "/book"
    );
  });

  it("rejects conflicting governed context before any Manage source call", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    render(
      await WorkbenchPage({
        params: Promise.resolve({ portfolioId: "PF_1001" }),
        searchParams: Promise.resolve({
          portfolioId: ["PF_1001", "PF_OTHER"],
          asOfDate: "2026-06-30",
        }),
      }),
    );

    expect(screen.getByText("Review context needs attention")).toBeInTheDocument();
    expect(screen.getByText(/No mandate evidence was requested/i)).toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("withholds a source response that does not confirm the route portfolio", async () => {
    const sourceFetch = createManageFetch({ portfolioId: "PF_1001" });
    const fetchMock = vi.fn(async (input: string | URL) => {
      const response = await sourceFetch(input);
      if (!input.toString().includes("/api/v1/workbench/PF_1001/portfolio-360")) {
        return response;
      }
      const payload = (await response.json()) as Record<string, unknown> & {
        portfolio: Record<string, unknown>;
      };
      return jsonResponse({
        ...payload,
        portfolio: {
          ...payload.portfolio,
          portfolio_id: "PF_OTHER",
        },
      });
    });
    vi.stubGlobal("fetch", fetchMock);

    render(
      await WorkbenchPage({
        params: Promise.resolve({ portfolioId: "PF_1001" }),
        searchParams: Promise.resolve({}),
      }),
    );

    expect(screen.getByRole("heading", { name: "Manage Workspace" })).toBeInTheDocument();
    expect(screen.getByText(/did not confirm the selected portfolio/i)).toBeInTheDocument();
    expect(
      fetchMock.mock.calls.some(([input]) =>
        input.toString().includes("/api/v1/dpm/command-center"),
      ),
    ).toBe(false);
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
    expect(screen.getAllByText(/Data availability/i).length).toBeGreaterThan(0);
    expect(screen.getByLabelText("Selected mandate review item")).toBeInTheDocument();
    expect(screen.getAllByText("Attention items").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Mandate health dimensions").length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Latest monitoring/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Market Data/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Stale price/i).length).toBeGreaterThan(0);
    expect(screen.queryByText("Advisor review recommended before rebalance approval.")).not.toBeInTheDocument();
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
    expect(
      await screen.findByText("Order acknowledgement evidence unavailable"),
    ).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "DPM Command Center" })).not.toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Portfolio Memory" })).not.toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Post-Trade Outcome Review" })).not.toBeInTheDocument();
  });

  it("renders portfolio memory as read-only Gateway-backed evidence", async () => {
    const fetchMock = vi.fn(createManageFetch({ portfolioId: "PF_2101" }));
    vi.stubGlobal("fetch", fetchMock);

    render(
      await WorkbenchPage({
        params: Promise.resolve({ portfolioId: "PF_2101" }),
        searchParams: Promise.resolve({ mode: "memory" }),
      })
    );

    expect(screen.getAllByRole("heading", { name: "Portfolio Memory" }).length).toBeGreaterThan(0);
    expect(screen.getAllByText("Campaign Assignment Task Transition").length).toBeGreaterThan(0);
    expect(screen.getByText("Review supportability posture")).toBeInTheDocument();
    expect(screen.queryByText("Add advisor note")).not.toBeInTheDocument();
    expect(screen.queryByText("Decision Notes")).not.toBeInTheDocument();
    expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
    expect(
      fetchMock.mock.calls.some(([input]) =>
        input.toString().includes("/api/v1/dpm/command-center/portfolios/PF_2101/memory")
      )
    ).toBe(true);
  });

  it("renders PM operating quality as a Gateway-backed manage surface", async () => {
    const fetchMock = vi.fn(createManageFetch({ portfolioId: "PF_2501" }));
    vi.stubGlobal("fetch", fetchMock);

    render(
      await WorkbenchPage({
        params: Promise.resolve({ portfolioId: "PF_2501" }),
        searchParams: Promise.resolve({ mode: "quality" }),
      })
    );

    expect(screen.getAllByRole("heading", { name: "PM Operating Quality" }).length).toBeGreaterThan(0);
    expect(screen.getByText("Score-Run Evidence")).toBeInTheDocument();
    expect(screen.getByText("Governance Posture")).toBeInTheDocument();
    expect(
      await screen.findByRole("listbox", {
        name: "PM operating quality fairness-analysis selection",
      })
    ).toBeInTheDocument();
    expect(screen.getByLabelText("PM operating quality fairness segments")).toBeInTheDocument();
    expect(screen.getByLabelText("PM operating quality summary generation status")).toBeInTheDocument();
    expect(screen.getByLabelText("PM operating quality summary invocations")).toBeInTheDocument();
    expect(screen.getAllByText("PMQ-SUMMARY-001").length).toBeGreaterThan(0);
    expect(screen.getByRole("button", { name: "Preview Fairness" })).toBeEnabled();
    expect(screen.queryByText("sha256:pm-quality")).not.toBeInTheDocument();
    expect(screen.queryByText("Raw generated PM summary narrative must stay hidden.")).not.toBeInTheDocument();
    expect(
      fetchMock.mock.calls.some(([input]) =>
        input.toString().includes("/api/v1/dpm/command-center/pm-operating-quality/policies?")
      )
    ).toBe(true);
    expect(
      fetchMock.mock.calls.some(([input]) =>
        input.toString().includes("/api/v1/dpm/command-center/pm-operating-quality/score-runs?")
      )
    ).toBe(true);
    expect(
      fetchMock.mock.calls.some(([input]) =>
        input.toString().includes("/api/v1/dpm/command-center/pm-operating-quality/fairness-analyses?")
      )
    ).toBe(true);
    expect(
      fetchMock.mock.calls.some(([input]) =>
        input.toString().includes(
          "/api/v1/dpm/command-center/pm-operating-quality/fairness-analyses/pmq_fair_001"
        )
      )
    ).toBe(true);
    expect(
      fetchMock.mock.calls.some(([input]) =>
        input.toString().includes("/api/v1/dpm/command-center/pm-operating-quality/summary-invocations?")
      )
    ).toBe(true);
    expect(
      fetchMock.mock.calls.some(([input]) =>
        input.toString().includes(
          "/api/v1/dpm/command-center/pm-operating-quality/summary-invocations/pmq_summary_001"
        )
      )
    ).toBe(true);
  });

  it("renders wave lifecycle and proof-pack evidence as a dedicated manage surface", async () => {
    const consoleErrorSpy = vi.spyOn(console, "error");
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
    expect(screen.getByRole("heading", { name: "Campaign administration" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Candidate Source Review" })).toBeInTheDocument();
    expect(screen.getAllByText("Apple and Tesla holdings review").length).toBeGreaterThan(0);
    expect(await screen.findByText("Source evidence current")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Governance action" }));
    expect(screen.getByRole("heading", { name: "Governance action" })).toBeInTheDocument();
    expect(screen.getByText("Operating Queue")).toBeInTheDocument();
    expect(screen.getAllByText("Assignment Task").length).toBeGreaterThan(0);
    expect(screen.getByRole("heading", { name: "Proposed Changes" })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Construction Alternatives" })).not.toBeInTheDocument();
    expect(
      fetchMock.mock.calls.some(([input]) =>
        input.toString().includes("/api/v1/dpm/command-center/waves?")
      )
    ).toBe(true);
    expect(
      fetchMock.mock.calls.some(([input]) =>
        input.toString().includes("/api/v1/dpm/command-center/waves/campaign-definitions")
      )
    ).toBe(true);
    expect(
      fetchMock.mock.calls.some(([input]) =>
        input.toString().includes("/api/v1/dpm/command-center/waves/campaign-discovery")
      )
    ).toBe(true);
    expect(
      fetchMock.mock.calls.some(([input]) =>
        input.toString().includes("/api/v1/dpm/command-center/waves/campaign-operating-queue")
      )
    ).toBe(true);
    expect(
      fetchMock.mock.calls.some(([input]) =>
        input.toString().includes("/api/v1/dpm/command-center/waves/campaign-workflow-automation")
      )
    ).toBe(true);
    expect(
      fetchMock.mock.calls.some(([input]) =>
        input.toString().includes("/assignment-tasks")
      )
    ).toBe(true);
    expect(
      fetchMock.mock.calls.some(([input]) =>
        input.toString().includes("/api/v1/dpm/command-center/outcome-reviews?portfolio_id=PF_3001")
      )
    ).toBe(true);
    expect(
      consoleErrorSpy.mock.calls.some((call) =>
        call.some((value) => String(value).includes("not wrapped in act")),
      ),
    ).toBe(false);
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

    expect(screen.getAllByRole("heading", { name: "Outcome reviews" }).length).toBeGreaterThan(0);
    expect(screen.getByText("Review timeline")).toBeInTheDocument();
    expect(screen.getByText("Selected review detail")).toBeInTheDocument();
    expect(screen.getAllByText("Within expected tolerance").length).toBeGreaterThan(0);
    expect(screen.getByText("72.4%")).toBeInTheDocument();
    expect(screen.getByText("Drift reduction")).toBeInTheDocument();
    expect(screen.queryByText("or_1")).not.toBeInTheDocument();
    expect(
      fetchMock.mock.calls.some(([input]) =>
        input.toString().includes("/api/v1/dpm/command-center/outcome-reviews?portfolio_id=PF_4001")
      )
    ).toBe(true);
  });

  it("renders the evidence pack without preloading context-only outcome review proof refs", async () => {
    const fetchMock = vi.fn(createManageFetch({ portfolioId: "PF_5001" }));
    vi.stubGlobal("fetch", fetchMock);

    render(
      await WorkbenchPage({
        params: Promise.resolve({ portfolioId: "PF_5001" }),
        searchParams: Promise.resolve({ mode: "proof" }),
      })
    );

    expect(screen.getAllByRole("heading", { name: "Evidence Pack" }).length).toBeGreaterThan(0);
    expect(screen.getByText("Evidence Areas")).toBeInTheDocument();
    expect(screen.queryByText("Mandate Alignment")).not.toBeInTheDocument();
    expect(screen.queryByText("Ready for advisor review")).not.toBeInTheDocument();
    expect(screen.queryByText("Signature Pending")).not.toBeInTheDocument();
    expect(screen.queryByText("ppack_1")).not.toBeInTheDocument();
    expect(screen.queryByText("sha256:proof-pack")).not.toBeInTheDocument();
    expect(
      fetchMock.mock.calls.some(([input]) =>
        input.toString().includes("/api/v1/dpm/command-center/proof-packs/ppack_1")
      )
    ).toBe(false);
  });

  it("keeps historical proof-pack lineage non-actionable in the Copilot workspace", async () => {
    const fetchMock = vi.fn(createManageFetch({ portfolioId: "PF_5101" }));
    vi.stubGlobal("fetch", fetchMock);

    render(
      await WorkbenchPage({
        params: Promise.resolve({ portfolioId: "PF_5101" }),
        searchParams: Promise.resolve({ mode: "copilot" }),
      })
    );

    expect(screen.getByRole("heading", { name: "PM Copilot", level: 1 })).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "Decision-support workflows", level: 2 }),
    ).toBeInTheDocument();
    expect(screen.getByText("Historical evidence pack")).toBeInTheDocument();
    expect(screen.getByText("ppack_1")).toBeInTheDocument();
    expect(
      screen.getByRole("button", {
        name: "Evidence Pack Decision Memo unavailable: Current evidence pack unavailable",
      })
    ).toBeDisabled();
    expect(
      fetchMock.mock.calls.some(([input]) =>
        input.toString().includes("/proof-packs/ppack_1/ai-pm-memo")
      )
    ).toBe(false);
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
          next_cursor: null,
          items: [
            {
              exception_id: "exc_001",
              mandate_id: "mandate_001",
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
              mandate_id: "mandate_001",
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
        data: {
          portfolio_id: portfolioId,
          events: [
            {
              event_id: "memory:campaign-assignment-task-transition:transition_001",
              event_type: "BULK_REVIEW_CAMPAIGN_ASSIGNMENT_TASK_TRANSITION",
              event_time: "2026-05-21T08:15:00Z",
              status: "IN_PROGRESS",
              supportability_state: "PENDING_REVIEW",
              reason_codes: ["BULK_REVIEW_CAMPAIGN_ASSIGNMENT_TASK_TRANSITION_RECORDED"],
              artifact_refs: [{ artifact_type: "assignment_task", artifact_id: "task_001" }],
              metadata: {
                task_ref: "task-ref-001",
                transition_type: "ACKNOWLEDGE",
                from_status: "OPEN",
                to_status: "IN_PROGRESS",
                sla_posture: "ON_TRACK",
                supportability_state: "PENDING_REVIEW",
                raw_rationale: "unsafe raw rationale",
              },
            },
          ],
        },
      });
    }

    if (url.includes("/api/v1/dpm/command-center/pm-operating-quality/policies?")) {
      return jsonResponse({
        correlation_id: "corr_pmq_policy",
        contract_version: "v1",
        source_service: "lotus-manage",
        upstream_status: 200,
        supportability: {
          source_service: "lotus-manage",
          authority: "lotus-manage:RFC-0042/PM_OPERATING_QUALITY",
          state: "READY",
          reason_codes: ["PM_QUALITY_POLICY_APPROVED"],
          blocked_actions: [],
          policy_id: "pmq_sg_dpm",
          policy_version: "2026.05",
          count: 1,
        },
        data: {
          policies: [
            {
              policy_id: "pmq_sg_dpm",
              policy_version: "2026.05",
              enabled: true,
              as_of_date: "2026-05-13",
              state: "READY",
              reason_codes: ["PM_QUALITY_POLICY_APPROVED"],
            },
          ],
          count: 1,
        },
      });
    }

    if (url.includes("/api/v1/dpm/command-center/pm-operating-quality/score-runs?")) {
      return jsonResponse({
        correlation_id: "corr_pmq_scores",
        contract_version: "v1",
        source_service: "lotus-manage",
        upstream_status: 200,
        supportability: {
          source_service: "lotus-manage",
          authority: "lotus-manage:RFC-0042/PM_OPERATING_QUALITY",
          state: "READY",
          reason_codes: ["PM_QUALITY_READY"],
          blocked_actions: [],
          policy_id: "pmq_sg_dpm",
          policy_version: "2026.05",
          count: 2,
        },
        data: {
          score_runs: [
            {
              score_run_id: "pmq_run_001",
              pm_id: "PM_SG_001",
              book_id: "PM_BOOK_SG_BALANCED",
              policy_id: "pmq_sg_dpm",
              policy_version: "2026.05",
              state: "READY",
              score: "90.00",
              content_hash: "sha256:pm-quality",
              forbidden_uses: ["protected_class_inference", "autonomous_pm_ranking"],
              reason_codes: ["PM_QUALITY_READY"],
            },
            {
              score_run_id: "pmq_run_002",
              pm_id: "PM_SG_002",
              book_id: "PM_BOOK_SG_BALANCED",
              policy_id: "pmq_sg_dpm",
              policy_version: "2026.05",
              state: "READY",
              score: "59.00",
              content_hash: "sha256:pm-quality-2",
              forbidden_uses: ["protected_class_inference", "autonomous_pm_ranking"],
              reason_codes: ["PM_QUALITY_READY"],
            },
          ],
          fairness_segments: [
            {
              segment_id: "mandate_balanced",
              segment_type: "MANDATE_TYPE",
              display_name: "Balanced DPM Mandates",
              score_run_ids: ["pmq_run_001"],
              source_refs: [{ source_system: "lotus-core", source_type: "MandateTypeSegment", source_id: "balanced" }],
            },
            {
              segment_id: "mandate_income",
              segment_type: "MANDATE_TYPE",
              display_name: "Income DPM Mandates",
              score_run_ids: ["pmq_run_002"],
              source_refs: [{ source_system: "lotus-core", source_type: "MandateTypeSegment", source_id: "income" }],
            },
          ],
          count: 2,
        },
      });
    }

    if (url.includes("/api/v1/dpm/command-center/pm-operating-quality/fairness-analyses?")) {
      return jsonResponse({
        correlation_id: "corr_pmq_fairness_list",
        contract_version: "v1",
        source_service: "lotus-manage",
        upstream_status: 200,
        supportability: {
          source_service: "lotus-manage",
          authority: "lotus-manage:RFC-0042/PM_OPERATING_QUALITY",
          state: "PENDING_REVIEW",
          reason_codes: ["PM_QUALITY_FAIRNESS_SPREAD_REVIEW_REQUIRED"],
          blocked_actions: [],
          policy_id: "pmq_sg_dpm",
          policy_version: "2026.05",
          fairness_analysis_id: "pmq_fair_001",
          count: 1,
        },
        data: {
          fairness_analyses: [
            {
              fairness_analysis_id: "pmq_fair_001",
              policy_id: "pmq_sg_dpm",
              policy_version: "2026.05",
              state: "PENDING_REVIEW",
              as_of_date: "2026-05-13",
              observed_average_score_spread: "31.00",
              segment_count: 2,
              generated_by: "lotus-manage",
              reason_codes: ["PM_QUALITY_FAIRNESS_SPREAD_REVIEW_REQUIRED"],
              source_refs: [
                {
                  source_system: "lotus-manage",
                  source_product: "PmOperatingQualityFairnessAnalysis",
                  source_id: "pmq_fair_001",
                },
              ],
            },
          ],
          count: 1,
        },
      });
    }

    if (
      url.includes("/api/v1/dpm/command-center/pm-operating-quality/fairness-analyses/pmq_fair_001")
    ) {
      return jsonResponse({
        correlation_id: "corr_pmq_fairness_detail",
        contract_version: "v1",
        source_service: "lotus-manage",
        upstream_status: 200,
        supportability: {
          source_service: "lotus-manage",
          authority: "lotus-manage:RFC-0042/PM_OPERATING_QUALITY",
          state: "PENDING_REVIEW",
          reason_codes: ["PM_QUALITY_FAIRNESS_SPREAD_REVIEW_REQUIRED"],
          blocked_actions: [],
          policy_id: "pmq_sg_dpm",
          policy_version: "2026.05",
          fairness_analysis_id: "pmq_fair_001",
        },
        data: {
          fairness_analysis: {
            fairness_analysis_id: "pmq_fair_001",
            policy_id: "pmq_sg_dpm",
            policy_version: "2026.05",
            state: "PENDING_REVIEW",
            as_of_date: "2026-05-13",
            minimum_segment_score_run_count: 2,
            maximum_average_score_spread: "15.00",
            observed_average_score_spread: "31.00",
            generated_at: "2026-05-13T08:30:00Z",
            generated_by: "lotus-manage",
            reason_codes: ["PM_QUALITY_FAIRNESS_SPREAD_REVIEW_REQUIRED"],
            forbidden_uses: ["protected_class_inference", "autonomous_pm_ranking"],
            segment_results: [
              {
                segment_id: "mandate_balanced",
                segment_type: "MANDATE_TYPE",
                display_name: "Balanced DPM Mandates",
                state: "READY",
                score_run_count: "1",
                average_score: "90.00",
                minimum_score: "90.00",
                maximum_score: "90.00",
              },
            ],
          },
        },
      });
    }

    if (url.includes("/api/v1/dpm/command-center/pm-operating-quality/summary-invocations?")) {
      return jsonResponse({
        correlation_id: "corr_pmq_summary_invocations",
        contract_version: "v1",
        source_service: "lotus-manage",
        upstream_status: 200,
        supportability: {
          source_service: "lotus-manage",
          authority: "lotus-manage:RFC-0042/PM_OPERATING_QUALITY",
          state: "PENDING_REVIEW",
          reason_codes: ["PM_QUALITY_SUMMARY_INVOCATION_READY"],
          blocked_actions: [],
          policy_id: "pmq_sg_dpm",
          policy_version: "2026.05",
          score_run_id: "pmq_run_001",
          review_action_id: "pmq_review_001",
          summary_invocation_id: "pmq_summary_001",
          count: 1,
        },
        data: {
          summary_invocations: [
            {
              summary_invocation_id: "pmq_summary_001",
              summary_ref: "PMQ-SUMMARY-001",
              score_run_id: "pmq_run_001",
              review_action_id: "pmq_review_001",
              invocation_state: "PENDING_REVIEW",
              workflow_run_id: "wf_pmq_summary_001",
              summary_artifact_ref: "artifact://pmq-summary/001",
              summary_content_hash: "sha256:summary-invocation",
              requested_by: "supervisor_sg_1",
              as_of_date: "2026-05-13",
              policy_id: "pmq_sg_dpm",
              policy_version: "2026.05",
              reason_codes: ["PM_QUALITY_SUMMARY_INVOCATION_READY"],
              text_boundary: {
                generated_summary_text_stored: false,
                prompt_body_stored: false,
                model_response_stored: false,
                client_communication_projected: false,
                order_or_oms_projected: false,
              },
              source_refs: [
                {
                  source_system: "lotus-manage",
                  source_product: "PmOperatingQualitySummaryInvocation",
                  source_id: "pmq_summary_001",
                },
              ],
            },
          ],
          count: 1,
        },
      });
    }

    if (
      url.includes("/api/v1/dpm/command-center/pm-operating-quality/summary-invocations/pmq_summary_001")
    ) {
      return jsonResponse({
        correlation_id: "corr_pmq_summary_invocation_detail",
        contract_version: "v1",
        source_service: "lotus-manage",
        upstream_status: 200,
        supportability: {
          source_service: "lotus-manage",
          authority: "lotus-manage:RFC-0042/PM_OPERATING_QUALITY",
          state: "PENDING_REVIEW",
          reason_codes: ["PM_QUALITY_SUMMARY_INVOCATION_READY"],
          blocked_actions: [],
          policy_id: "pmq_sg_dpm",
          policy_version: "2026.05",
          score_run_id: "pmq_run_001",
          review_action_id: "pmq_review_001",
          summary_invocation_id: "pmq_summary_001",
        },
        data: {
          summary_invocation: {
            summary_invocation_id: "pmq_summary_001",
            summary_ref: "PMQ-SUMMARY-001",
            score_run_id: "pmq_run_001",
            review_action_id: "pmq_review_001",
            invocation_state: "PENDING_REVIEW",
            workflow_pack_name: "pm-operating-quality-summary",
            workflow_pack_version: "2026.05",
            workflow_run_id: "wf_pmq_summary_001",
            summary_artifact_ref: "artifact://pmq-summary/001",
            summary_content_hash: "sha256:summary-invocation",
            requested_by: "supervisor_sg_1",
            policy_id: "pmq_sg_dpm",
            policy_version: "2026.05",
            reason_codes: ["PM_QUALITY_SUMMARY_INVOCATION_READY"],
            generated_summary_text: "Raw generated PM summary narrative must stay hidden.",
            prompt_body: "Prompt body must stay hidden.",
            model_response: "Model response must stay hidden.",
            forbidden_uses: ["client_contact", "oms_routing", "trade_execution"],
            text_boundary: {
              generated_summary_text_stored: false,
              prompt_body_stored: false,
              model_response_stored: false,
              client_communication_projected: false,
              order_or_oms_projected: false,
            },
            source_refs: [
              {
                source_system: "lotus-manage",
                source_product: "PmOperatingQualitySummaryInvocation",
                source_id: "pmq_summary_001",
              },
            ],
          },
        },
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
              portfolio_ids: [portfolioId],
              state: "READY",
              trigger_type: "EXPLICIT_PORTFOLIO_LIST",
              as_of_date: "2026-05-13",
              item_count: 1,
              issue_count: 0,
              supportability_state: "SUPPORTED",
              supportability_reason: "WAVE_READY",
            },
          ],
        },
      });
    }

    if (
      [
        "campaign-operating-queue",
        "campaign-approval-inbox",
        "campaign-workflow-board",
        "campaign-assignment-plan",
        "campaign-workflow-automation",
      ].some((path) => url.includes(`/api/v1/dpm/command-center/waves/${path}`))
    ) {
      return jsonResponse({
        correlation_id: "corr_campaign_workflow",
        contract_version: "v1",
        source_service: "lotus-manage",
        upstream_status: 200,
        supportability: {
          source_service: "lotus-manage",
          authority: "lotus-manage:campaign-workflow",
          state: "READY",
          reason_codes: ["MANAGE_SOURCE_BACKED"],
          blocked_actions: [],
          count: 1,
          total_count: 1,
          content_hash: "sha256:workflow-summary",
        },
        data: {
          items: [
            {
              task_ref: "task_001",
              state: "READY",
              source_refs: [{ source_type: "BulkReviewCampaignAssignmentTask" }],
            },
          ],
          count: 1,
          total_count: 1,
          limit: 10,
          offset: 0,
          operating_boundaries: ["NO_ORDER_GENERATION", "NO_OMS_EXECUTION_CLAIM"],
        },
      });
    }

    if (
      [
        "approval-decisions",
        "assignment-actions",
        "assignment-tasks",
        "maker-checker-controls",
      ].some((path) =>
        url.includes(
          `/api/v1/dpm/command-center/waves/campaign-definitions/campaign-holdings-202605/versions/2026.05/${path}`
        )
      )
    ) {
      return jsonResponse({
        correlation_id: "corr_campaign_workflow_evidence",
        contract_version: "v1",
        source_service: "lotus-manage",
        upstream_status: 200,
        data: {
          items: [
            {
              task_ref: "task_001",
              status: "WAITING_FOR_REVIEW",
              actor_id: "pm_sg_1",
              recorded_at: "2026-05-21T08:00:00Z",
              reason_codes: ["TASK_RECORDED"],
              source_refs: [{ source_type: "BulkReviewCampaignAssignmentTask" }],
              content_hash: "sha256:task",
              operating_boundaries: ["NO_CLIENT_CONTACT_WORKFLOW"],
              transitions: [
                {
                  transition_type: "ASSIGNED_FOR_REVIEW",
                  from_status: "OPEN",
                  to_status: "WAITING_FOR_REVIEW",
                },
              ],
            },
          ],
        },
      });
    }

    if (url.includes("/api/v1/dpm/command-center/waves/campaign-definitions")) {
      return jsonResponse({
        correlation_id: "corr_campaign_definitions",
        contract_version: "v1",
        source_service: "lotus-manage",
        upstream_status: 200,
        data: {
          items: [
            {
              campaign_id: "campaign-holdings-202605",
              campaign_version: "2026.05",
              display_name: "Apple and Tesla holdings review",
              status: "ACTIVE",
              as_of_date: "2026-05-10",
              eligible_portfolio_types: ["DISCRETIONARY"],
              candidates: [
                {
                  portfolio_id: portfolioId,
                  portfolio_type: "DISCRETIONARY",
                  source_refs: [{ source_type: "PortfolioManagerBookMembership", source_id: "book-1" }],
                },
              ],
              source_refs: [{ source_type: "BulkReviewCampaignDefinition", source_id: "campaign-plan" }],
              governance: {
                approval_ref: "BRC-APPROVAL-2026-05",
                approved_by: "cio_ops_committee",
              },
              content_hash: "sha256:campaign-definition",
            },
          ],
          limit: 10,
          offset: 0,
          count: 1,
        },
      });
    }

    if (url.includes("/api/v1/dpm/command-center/waves/campaign-discovery")) {
      return jsonResponse({
        correlation_id: "corr_campaign_discovery",
        contract_version: "v1",
        source_service: "lotus-manage",
        upstream_status: 200,
        data: {
          items: [
            {
              product_name: "BulkReviewCampaignDiscovery",
              campaign_id: "campaign-holdings-202605",
              campaign_version: "2026.05",
              campaign_status: "ACTIVE",
              candidate_count: 12,
              eligible_candidate_count: 10,
              governance_status: "APPROVED",
              expiry_state: "ACTIVE",
              access_purpose: "rebalance_review",
              source_ref_count: 4,
            },
          ],
          limit: 10,
          offset: 0,
          count: 1,
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
              expected_snapshot: {
                source_hashes: { expected: "sha256:expected" },
              },
              realized_snapshot: {
                source_hashes: { realized: "sha256:realized" },
              },
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

    if (url.includes("/api/v1/dpm/command-center/proof-packs/ppack_1")) {
      return jsonResponse({
        correlation_id: "corr_proof",
        contract_version: "v1",
        source_service: "lotus-manage",
        upstream_status: 200,
        supportability: {
          source_service: "lotus-manage",
          authority: "lotus-manage:proof-pack",
          state: "READY",
          proof_pack_id: "ppack_1",
          reason_codes: ["PROOF_PACK_READY"],
          section_state_counts: { READY: 2 },
          content_hash: "sha256:proof-pack",
          markdown_available: true,
          report_input_available: true,
          ai_evidence_input_available: true,
        },
        data: {
          proof_pack: {
            proof_pack_id: "ppack_1",
            portfolio_id: portfolioId,
            mandate_id: "mandate_001",
            rebalance_run_id: "run_001",
            status: "READY",
            content_hash: "sha256:proof-pack",
            decision_summary: {
              approval_state: "SIGNATURE_PENDING",
              business_rationale: "Current positioning remains within the mandate corridor.",
            },
            sections: [
              {
                section_type: "mandate_alignment",
                title: "Mandate Alignment",
                summary: "Ready for advisor review",
                state: "READY",
                content_hash: "sha256:policy",
              },
              {
                section_type: "risk_disclosure",
                title: "Risk Disclosure",
                summary: "Within approved profile",
                state: "READY",
                content_hash: "sha256:risk",
              },
            ],
            markdown_summary_ref: { ref_type: "mandate_alignment_report", ref_id: "doc_1" },
            report_input_ref: { ref_type: "client_report", ref_id: "doc_2" },
          },
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
