import { afterEach, describe, expect, it, vi } from "vitest";

import {
  applySandboxChanges,
  buildArchivedDocumentDownloadUrl,
  createPortfolioReportBatch,
  createSandboxSession,
  generateDpmConstructionAlternatives,
  getDpmOutcomeReviewAiEvidenceInput,
  getDpmOutcomeReviewReportInput,
  getDpmOutcomeReviews,
  getDpmConstructionAlternativeSet,
  requestDpmOutcomeReviewAiNarrative,
  getArchivedDocumentMetadata,
  getPortfolio360,
  getReportBatchStatus,
  getReportingSnapshot,
  getWorkbenchAnalytics,
  getWorkbenchOverview,
  getWorkbenchRiskAttributionClient,
  getWorkbenchRiskConcentrationClient,
  getWorkbenchRiskDrawdownClient,
  getWorkbenchRiskRollingClient,
  getWorkbenchRiskSummaryClient,
  getWorkbenchPerformanceAttributionTrendClient,
  getWorkbenchPerformanceAdvisorBriefClient,
  getWorkbenchPerformanceHorizonComparisonClient,
  getWorkbenchPerformanceWorkspaceDetailsClient,
  getWorkbenchPerformanceWorkspaceDetails,
  getWorkbenchPerformanceWorkspaceSummaryClient,
  getWorkbenchPerformanceWorkspaceSummary,
  postWorkbenchPerformanceAdvisorBriefReviewActionClient,
  runReportBatchOnce,
  selectDpmConstructionAlternative,
  submitDpmOutcomeReviewReportJob,
} from "../../src/features/workbench/api";
import type { WorkbenchPortfolio360 } from "../../src/features/workbench/types";
import {
  getAnalyticsUiMetricEvents,
  resetAnalyticsUiMetricEvents,
} from "../../src/features/analytics-observability/metrics";

const expectedBaseUrl = "/api/bff/api/v1";

describe("workbench api", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    resetAnalyticsUiMetricEvents();
  });

  it("calls sandbox session create endpoint", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        new Response(
          JSON.stringify({
            correlation_id: "corr",
            contract_version: "v1",
            portfolio_id: "PF_1001",
            session_id: "sess_1",
            session_version: 1,
            projected_positions: [],
            projected_summary: {
              total_baseline_positions: 0,
              total_proposed_positions: 0,
              net_delta_quantity: 0,
            },
            warnings: [],
            partial_failures: [],
          }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        )
      )
    );

    await createSandboxSession("PF_1001", { created_by: "advisor_1", ttl_hours: 24 });

    const fetchMock = global.fetch as unknown as ReturnType<typeof vi.fn>;
    expect(fetchMock).toHaveBeenCalledWith(
      `${expectedBaseUrl}/workbench/PF_1001/sandbox/sessions`,
      expect.objectContaining({ method: "POST" })
    );
    const metricEventsJson = JSON.stringify(getAnalyticsUiMetricEvents());
    expect(metricEventsJson).toContain("sandbox-session-create");
    expect(metricEventsJson).not.toContain("PF_1001");
    expect(metricEventsJson).not.toContain("sess_1");
  });

  it("calls sandbox change apply endpoint", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        new Response(
          JSON.stringify({
            correlation_id: "corr",
            contract_version: "v1",
            portfolio_id: "PF_1001",
            session_id: "sess_1",
            session_version: 2,
            projected_positions: [],
            projected_summary: {
              total_baseline_positions: 1,
              total_proposed_positions: 1,
              net_delta_quantity: 2,
            },
            policy_feedback: { status: "PASS" },
            warnings: [],
            partial_failures: [],
          }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        )
      )
    );

    await applySandboxChanges("PF_1001", "sess_1", {
      changes: [{ security_id: "EQ_1", transaction_type: "BUY", quantity: 2 }],
      evaluate_policy: true,
    });

    const fetchMock = global.fetch as unknown as ReturnType<typeof vi.fn>;
    expect(fetchMock).toHaveBeenCalledWith(
      `${expectedBaseUrl}/workbench/PF_1001/sandbox/sessions/sess_1/changes`,
      expect.objectContaining({ method: "POST" })
    );
    const metricEventsJson = JSON.stringify(getAnalyticsUiMetricEvents());
    expect(metricEventsJson).toContain("sandbox-session-apply");
    expect(metricEventsJson).not.toContain("PF_1001");
    expect(metricEventsJson).not.toContain("sess_1");
  });

  it("observes legacy advisor workbench overview and portfolio 360 reads without leaking IDs", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string) => {
        const payload = url.includes("/overview")
          ? {
              correlation_id: "corr",
              portfolio_id: "PF_1001",
              as_of_date: "2026-02-24",
              summary: {},
              alerts: [],
              tasks: [],
              warnings: [],
              partial_failures: [],
            }
          : {
              correlation_id: "corr",
              portfolio_id: "PF_1001",
              as_of_date: "2026-02-24",
              portfolio: { portfolio_id: "PF_1001" },
              positions: [],
              warnings: [],
              partial_failures: [],
            };
        return new Response(JSON.stringify(payload), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      })
    );

    await getWorkbenchOverview("PF_1001");
    await getPortfolio360("PF_1001", "sess_1");

    const metricEventsJson = JSON.stringify(getAnalyticsUiMetricEvents());
    expect(metricEventsJson).toContain("advisor-overview");
    expect(metricEventsJson).toContain("portfolio-360");
    expect(metricEventsJson).not.toContain("PF_1001");
    expect(metricEventsJson).not.toContain("sess_1");
  });

  it("calls backend analytics endpoint", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        new Response(
          JSON.stringify({
            correlation_id: "corr",
            contract_version: "v1",
            portfolio_id: "PF_1001",
            session_id: "sess_1",
            period: "YTD",
            group_by: "ASSET_CLASS",
            benchmark_code: "BMK_GLOBAL_BALANCED_60_40",
            portfolio_return_pct: 2.1,
            benchmark_return_pct: 1.6,
            active_return_pct: 0.5,
            allocation_buckets: [],
            top_changes: [],
            warnings: [],
            partial_failures: [],
          }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        )
      )
    );

    await getWorkbenchAnalytics("PF_1001", {
      period: "YTD",
      groupBy: "ASSET_CLASS",
      benchmark: "BMK_GLOBAL_BALANCED_60_40",
      sessionId: "sess_1",
    });

    const fetchMock = global.fetch as unknown as ReturnType<typeof vi.fn>;
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining(
        "/api/v1/workbench/PF_1001/analytics?period=YTD&group_by=ASSET_CLASS&benchmark_code=BMK_GLOBAL_BALANCED_60_40&session_id=sess_1"
      ),
      expect.objectContaining({ cache: "no-store" })
    );
    const metricEventsJson = JSON.stringify(getAnalyticsUiMetricEvents());
    expect(metricEventsJson).toContain("portfolio-analytics");
    expect(metricEventsJson).not.toContain("PF_1001");
    expect(metricEventsJson).not.toContain("sess_1");
  });

  it("omits benchmark code when performance summary is requested without an assigned benchmark", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        new Response(
          JSON.stringify({
            correlation_id: "corr",
            contract_version: "v1",
            portfolio_id: "PF_1001",
            as_of_date: "2026-03-26",
            period: "YTD",
            chart_frequency: "monthly",
            contribution_dimension: "asset_class",
            attribution_dimension: "asset_class",
            detail_basis: "NET",
            benchmark_code: null,
            portfolio: {
              portfolio_id: "PF_1001",
              client_id: "CIF_1",
              base_currency: "USD",
              booking_center_code: "SG",
            },
            overview: {
              market_value_base: 1000000,
              cash_weight_pct: 5,
              position_count: 10,
            },
            net_performance: {
              metric_basis: "NET",
              portfolio_return_pct: 2.1,
              benchmark_return_pct: null,
              active_return_pct: 0.5,
              annualized_return_pct: 2.1,
              benchmark_id: null,
              benchmark_return_source: null,
            },
            gross_performance: {
              metric_basis: "GROSS",
              portfolio_return_pct: 2.4,
              benchmark_return_pct: null,
              active_return_pct: 0.8,
              annualized_return_pct: 2.4,
              benchmark_id: null,
              benchmark_return_source: null,
            },
            money_weighted_return: null,
            net_chart: [],
            gross_chart: [],
            contribution: null,
            attribution: null,
            warnings: [],
            partial_failures: [],
          }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        )
      )
    );

    await getWorkbenchPerformanceWorkspaceSummary("PF_1001", {
      period: "YTD",
      chartFrequency: "monthly",
      contributionDimension: "asset_class",
      attributionDimension: "asset_class",
      detailBasis: "NET",
    });

    const fetchMock = global.fetch as unknown as ReturnType<typeof vi.fn>;
    const requestedUrl = fetchMock.mock.calls[0]?.[0]?.toString();
    expect(requestedUrl).toContain(
      "/api/v1/workbench/PF_1001/performance/summary?period=YTD&chart_frequency=monthly&contribution_dimension=asset_class&attribution_dimension=asset_class&detail_basis=NET"
    );
    expect(requestedUrl).not.toContain("benchmark_code=");
  });

  it("adds governed caller context to server-side Gateway performance reads", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        new Response(
          JSON.stringify({
            correlation_id: "corr",
            contract_version: "v1",
            portfolio_id: "PF_1001",
            as_of_date: "2026-03-26",
            period: "YTD",
            chart_frequency: "monthly",
            contribution_dimension: "asset_class",
            attribution_dimension: "asset_class",
            detail_basis: "NET",
            benchmark_code: null,
            portfolio: {
              portfolio_id: "PF_1001",
              client_id: "CIF_1",
              base_currency: "USD",
              booking_center_code: "SG",
            },
            overview: {
              market_value_base: 1000000,
              cash_weight_pct: 5,
              position_count: 10,
            },
            net_performance: {
              metric_basis: "NET",
              portfolio_return_pct: 2.1,
              benchmark_return_pct: null,
              active_return_pct: 0.5,
              annualized_return_pct: 2.1,
              benchmark_id: null,
              benchmark_return_source: null,
            },
            gross_performance: {
              metric_basis: "GROSS",
              portfolio_return_pct: 2.4,
              benchmark_return_pct: null,
              active_return_pct: 0.8,
              annualized_return_pct: 2.4,
              benchmark_id: null,
              benchmark_return_source: null,
            },
            money_weighted_return: null,
            net_chart: [],
            gross_chart: [],
            contribution: null,
            attribution: null,
            warnings: [],
            partial_failures: [],
          }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        )
      )
    );

    await getWorkbenchPerformanceWorkspaceSummary("PF_1001", {
      period: "YTD",
      chartFrequency: "monthly",
      contributionDimension: "asset_class",
      attributionDimension: "asset_class",
      detailBasis: "NET",
    });

    const fetchMock = global.fetch as unknown as ReturnType<typeof vi.fn>;
    const headers = fetchMock.mock.calls[0]?.[1]?.headers as Headers;
    expect(headers.get("X-Actor-Id")).toBe("workbench-system");
    expect(headers.get("X-Caller-Application")).toBe("lotus-workbench");
    expect(headers.get("X-Tenant-Id")).toBe("tenant-sg");
    expect(headers.get("X-Region")).toBe("APAC");
    expect(headers.get("X-Correlation-Id")).toMatch(/^corr-workbench-/);
  });

  it("includes benchmark code when performance details are requested with a selected benchmark", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        ok: true,
        json: async () => ({
          correlation_id: "corr-performance",
          contract_version: "v1",
          portfolio_id: "PF_1001",
          as_of_date: "2026-02-24",
          period: "YTD",
          chart_frequency: "monthly",
          contribution_dimension: "asset_class",
          attribution_dimension: "asset_class",
          detail_basis: "NET",
          benchmark_code: "BMK_GLOBAL_BALANCED_60_40",
          portfolio: {
            portfolio_id: "PF_1001",
            client_id: "CIF_1001",
            base_currency: "USD",
            booking_center_code: "SG",
          },
          overview: {
            market_value_base: 1250000,
            cash_weight_pct: 6.8,
            position_count: 18,
          },
          net_performance: {
            metric_basis: "NET",
            portfolio_return_pct: 5.42,
            benchmark_return_pct: 4.9,
            active_return_pct: 0.52,
            annualized_return_pct: 5.42,
            benchmark_id: "BMK_GLOBAL_BALANCED_60_40",
            benchmark_return_source: "calculated",
          },
          gross_performance: {
            metric_basis: "GROSS",
            portfolio_return_pct: 5.88,
            benchmark_return_pct: 4.9,
            active_return_pct: 0.98,
            annualized_return_pct: 5.88,
            benchmark_id: "BMK_GLOBAL_BALANCED_60_40",
            benchmark_return_source: "calculated",
          },
          money_weighted_return: null,
          net_chart: [],
          gross_chart: [],
          contribution: null,
          attribution: null,
          warnings: [],
          partial_failures: [],
        }),
      }))
    );

    await getWorkbenchPerformanceWorkspaceDetails("PF_1001", {
      period: "YTD",
      chartFrequency: "monthly",
      contributionDimension: "asset_class",
      attributionDimension: "asset_class",
      detailBasis: "NET",
      benchmark: "BMK_GLOBAL_BALANCED_60_40",
    });

    const requestedUrl = (global.fetch as unknown as ReturnType<typeof vi.fn>).mock.calls[0][0].toString();
    expect(requestedUrl).toContain("benchmark_code=BMK_GLOBAL_BALANCED_60_40");
    expect(requestedUrl).toContain("/api/v1/workbench/PF_1001/performance/details?");
  });

  it("uses the proxy path for client-side performance summary refreshes", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        new Response(
          JSON.stringify({
            correlation_id: "corr-performance",
            contract_version: "v1",
            portfolio_id: "PF_1001",
            as_of_date: "2026-04-28",
            period: "3Y",
            report_start_date: "2023-02-25",
            report_end_date: "2026-02-24",
            chart_frequency: "monthly",
            contribution_dimension: "asset_class",
            attribution_dimension: "asset_class",
            detail_basis: "NET",
            benchmark_code: "BMK_GLOBAL_BALANCED_60_40",
            portfolio: {
              portfolio_id: "PF_1001",
              client_id: "CIF_1001",
              base_currency: "USD",
              booking_center_code: "SG",
            },
            overview: {
              market_value_base: 1250000,
              cash_weight_pct: 6.8,
              position_count: 18,
            },
            net_performance: {
              metric_basis: "NET",
              portfolio_return_pct: 5.42,
              benchmark_return_pct: 4.9,
              active_return_pct: 0.52,
              annualized_return_pct: 1.78,
              benchmark_id: "BMK_GLOBAL_BALANCED_60_40",
              benchmark_return_source: "calculated",
            },
            gross_performance: {
              metric_basis: "GROSS",
              portfolio_return_pct: 5.88,
              benchmark_return_pct: 4.9,
              active_return_pct: 0.98,
              annualized_return_pct: 1.91,
              benchmark_id: "BMK_GLOBAL_BALANCED_60_40",
              benchmark_return_source: "calculated",
            },
            money_weighted_return: null,
            net_chart: [],
            gross_chart: [],
            contribution: null,
            attribution: null,
            warnings: [],
            partial_failures: [],
          }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        )
      )
    );

    await getWorkbenchPerformanceWorkspaceSummaryClient("PF_1001", {
      period: "3Y",
      chartFrequency: "monthly",
      contributionDimension: "asset_class",
      attributionDimension: "asset_class",
      detailBasis: "NET",
      benchmark: "BMK_GLOBAL_BALANCED_60_40",
    });

    const requestedUrl = (global.fetch as unknown as ReturnType<typeof vi.fn>).mock.calls[0][0].toString();
    expect(requestedUrl).toContain(
      "/api/bff/api/v1/workbench/PF_1001/performance/summary?period=3Y&chart_frequency=monthly&contribution_dimension=asset_class&attribution_dimension=asset_class&detail_basis=NET&benchmark_code=BMK_GLOBAL_BALANCED_60_40"
    );
    expect(getAnalyticsUiMetricEvents()).toEqual([
      expect.objectContaining({
        metric_name: "lotus_workbench_api_request_duration_seconds",
        labels: expect.objectContaining({
          route: "workbench.performance",
          panel: "performance-summary",
          operation: "performance.workspace.summary",
          state: "stale",
          status_class: "2xx",
        }),
      }),
      expect.objectContaining({
        metric_name: "lotus_workbench_panel_state_total",
        labels: expect.objectContaining({
          route: "workbench.performance",
          panel: "performance-summary",
          state: "stale",
          freshness_bucket: "stale",
          supportability_state: "unknown",
        }),
      }),
      expect.objectContaining({
        metric_name: "lotus_workbench_panel_hydration_duration_seconds",
        labels: expect.objectContaining({
          route: "workbench.performance",
          panel: "performance-summary",
          state: "stale",
          freshness_bucket: "stale",
          supportability_state: "unknown",
        }),
      }),
      expect.objectContaining({
        metric_name: "lotus_analytics_ui_attention_events_total",
        labels: expect.objectContaining({
          route: "workbench.performance",
          panel: "performance-summary",
          attention_type: "panel_stale",
          severity: "warning",
          reason: "source_state",
          state: "stale",
          supportability_state: "unknown",
        }),
      }),
    ]);
  });

  it("uses the proxy path for client-side performance detail refreshes", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        new Response(
          JSON.stringify({
            correlation_id: "corr-performance",
            contract_version: "v1",
            portfolio_id: "PF_1001",
            as_of_date: "2026-02-24",
            period: "3Y",
            report_start_date: "2023-02-25",
            report_end_date: "2026-02-24",
            chart_frequency: "monthly",
            contribution_dimension: "asset_class",
            attribution_dimension: "asset_class",
            detail_basis: "NET",
            segment: "asset_class",
            benchmark_code: "BMK_GLOBAL_BALANCED_60_40",
            net_chart: [],
            gross_chart: [],
            contribution: null,
            attribution: null,
            warnings: [],
            partial_failures: [],
          }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        )
      )
    );

    await getWorkbenchPerformanceWorkspaceDetailsClient("PF_1001", {
      period: "3Y",
      chartFrequency: "monthly",
      contributionDimension: "asset_class",
      attributionDimension: "asset_class",
      detailBasis: "NET",
      benchmark: "BMK_GLOBAL_BALANCED_60_40",
    });

    const requestedUrl = (global.fetch as unknown as ReturnType<typeof vi.fn>).mock.calls[0][0].toString();
    expect(requestedUrl).toContain(
      "/api/bff/api/v1/workbench/PF_1001/performance/details?period=3Y&chart_frequency=monthly&contribution_dimension=asset_class&attribution_dimension=asset_class&detail_basis=NET&benchmark_code=BMK_GLOBAL_BALANCED_60_40"
    );
  });

  it("calls the split performance summary endpoint", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        new Response(
          JSON.stringify({
            correlation_id: "corr-performance",
            contract_version: "v1",
            portfolio_id: "PF_1001",
            as_of_date: "2026-02-24",
            period: "YTD",
            report_start_date: "2026-01-01",
            report_end_date: "2026-02-24",
            chart_frequency: "monthly",
            detail_basis: "NET",
            benchmark_code: "BMK_GLOBAL_BALANCED_60_40",
            benchmark_options: [],
            portfolio: {
              portfolio_id: "PF_1001",
              client_id: "CIF_1001",
              base_currency: "USD",
              booking_center_code: "SG",
            },
            overview: {
              market_value_base: 1250000,
              cash_weight_pct: 6.8,
              position_count: 18,
            },
            net_performance: { metric_basis: "NET" },
            gross_performance: { metric_basis: "GROSS" },
            money_weighted_return: null,
            warnings: [],
            partial_failures: [],
          }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        )
      )
    );

    await getWorkbenchPerformanceWorkspaceSummary("PF_1001", {
      period: "YTD",
      chartFrequency: "monthly",
      contributionDimension: "asset_class",
      attributionDimension: "asset_class",
      detailBasis: "NET",
      benchmark: "BMK_GLOBAL_BALANCED_60_40",
    });

    const requestedUrl = (global.fetch as unknown as ReturnType<typeof vi.fn>).mock.calls[0][0].toString();
    expect(requestedUrl).toContain(
      "/api/v1/workbench/PF_1001/performance/summary?period=YTD&chart_frequency=monthly&contribution_dimension=asset_class&attribution_dimension=asset_class&detail_basis=NET&benchmark_code=BMK_GLOBAL_BALANCED_60_40"
    );
  });

  it("calls the split performance details endpoint", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        new Response(
          JSON.stringify({
            correlation_id: "corr-performance",
            contract_version: "v1",
            portfolio_id: "PF_1001",
            as_of_date: "2026-02-24",
            period: "YTD",
            report_start_date: "2026-01-01",
            report_end_date: "2026-02-24",
            chart_frequency: "monthly",
            contribution_dimension: "asset_class",
            attribution_dimension: "asset_class",
            detail_basis: "NET",
            segment: "asset_class",
            benchmark_code: "BMK_GLOBAL_BALANCED_60_40",
            net_chart: [],
            gross_chart: [],
            contribution: null,
            attribution: null,
            warnings: [],
            partial_failures: [],
          }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        )
      )
    );

    await getWorkbenchPerformanceWorkspaceDetails("PF_1001", {
      period: "YTD",
      chartFrequency: "monthly",
      contributionDimension: "asset_class",
      attributionDimension: "asset_class",
      detailBasis: "NET",
      benchmark: "BMK_GLOBAL_BALANCED_60_40",
    });

    const requestedUrl = (global.fetch as unknown as ReturnType<typeof vi.fn>).mock.calls[0][0].toString();
    expect(requestedUrl).toContain(
      "/api/v1/workbench/PF_1001/performance/details?period=YTD&chart_frequency=monthly&contribution_dimension=asset_class&attribution_dimension=asset_class&detail_basis=NET&benchmark_code=BMK_GLOBAL_BALANCED_60_40"
    );
  });

  it("calls the client-side horizon comparison endpoint", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        new Response(
          JSON.stringify({
            correlation_id: "corr-performance",
            contract_version: "v1",
            portfolio_id: "PF_1001",
            as_of_date: "2026-02-24",
            detail_basis: "NET",
            benchmark_code: "BMK_GLOBAL_BALANCED_60_40",
            benchmark_options: [],
            rows: [],
            warnings: [],
            partial_failures: [],
          }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        )
      )
    );

    await getWorkbenchPerformanceHorizonComparisonClient("PF_1001", {
      period: "EXPLICIT",
      detailBasis: "NET",
      benchmark: "BMK_GLOBAL_BALANCED_60_40",
      chartFrequency: "monthly",
      reportStartDate: "2026-01-01",
      reportEndDate: "2026-02-24",
    });

    const requestedUrl = (global.fetch as unknown as ReturnType<typeof vi.fn>).mock.calls[0][0].toString();
    expect(requestedUrl).toContain(
      "/api/bff/api/v1/workbench/PF_1001/performance/horizon-comparison?period=EXPLICIT&detail_basis=NET&chart_frequency=monthly&benchmark_code=BMK_GLOBAL_BALANCED_60_40&report_start_date=2026-01-01&report_end_date=2026-02-24"
    );
    expect(getAnalyticsUiMetricEvents()).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          metric_name: "lotus_workbench_panel_state_total",
          labels: expect.objectContaining({
            route: "workbench.performance",
            panel: "performance-horizon-comparison",
            operation: "performance.workspace.horizon-comparison",
            state: "stale",
            freshness_bucket: "stale",
          }),
        }),
      ])
    );
  });

  it("calls the client-side risk summary endpoint with benchmark-aware request context", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        new Response(
          JSON.stringify({
            state: "ready",
            payload: { periods: [] },
            supportability: [],
            warnings: [],
            partial_failures: [],
          }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        )
      )
    );

    await getWorkbenchRiskSummaryClient("PF_1001", {
      period: "YTD",
      detailBasis: "NET",
      benchmark: "BMK_GLOBAL_BALANCED_60_40",
      asOfDate: "2026-02-24",
      reportingCurrency: "USD",
    });

    const requestedUrl = (global.fetch as unknown as ReturnType<typeof vi.fn>).mock.calls[0][0].toString();
    const requestInit = (global.fetch as unknown as ReturnType<typeof vi.fn>).mock.calls[0][1];
    const requestHeaders = requestInit?.headers as Headers;
    expect(requestedUrl).toBe(
      "/api/bff/api/v1/workbench/PF_1001/risk/summary?period=YTD&detail_basis=NET&benchmark_code=BMK_GLOBAL_BALANCED_60_40&as_of_date=2026-02-24&reporting_currency=USD"
    );
    expect(requestHeaders.get("X-Correlation-Id")).toMatch(/^corr-workbench-[0-9a-f]{16}$/);
    expect(requestHeaders.get("traceparent")).toMatch(
      /^00-[0-9a-f]{32}-[0-9a-f]{16}-[0-9a-f]{2}$/
    );
    expect(requestHeaders.get("X-Trace-Id")).toBe(
      requestHeaders.get("traceparent")?.split("-")[1]
    );
  });

  it("keeps canonical trailing periods in client-side risk summary requests", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        new Response(
          JSON.stringify({
            state: "ready",
            payload: { periods: [] },
            supportability: [],
            warnings: [],
            partial_failures: [],
          }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        )
      )
    );

    await getWorkbenchRiskSummaryClient("PF_1001", {
      period: "3Y",
      detailBasis: "NET",
      benchmark: "BMK_GLOBAL_BALANCED_60_40",
      asOfDate: "2026-02-24",
      reportingCurrency: "USD",
    });

    const requestedUrl = (global.fetch as unknown as ReturnType<typeof vi.fn>).mock.calls[0][0].toString();
    expect(requestedUrl).toContain("/api/bff/api/v1/workbench/PF_1001/risk/summary?");
    expect(requestedUrl).toContain("period=3Y");
    expect(requestedUrl).not.toContain("THREE_YEAR");
  });

  it("omits optional benchmark context from the client-side risk summary request when none is selected", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        new Response(
          JSON.stringify({
            state: "ready",
            payload: { periods: [] },
            supportability: [],
            warnings: [],
            partial_failures: [],
          }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        )
      )
    );

    await getWorkbenchRiskSummaryClient("PF_1001", {
      period: "YTD",
      detailBasis: "NET",
      asOfDate: "2026-02-24",
      reportingCurrency: "USD",
    });

    const requestedUrl = (global.fetch as unknown as ReturnType<typeof vi.fn>).mock.calls[0][0].toString();
    expect(requestedUrl).toBe(
      "/api/bff/api/v1/workbench/PF_1001/risk/summary?period=YTD&detail_basis=NET&as_of_date=2026-02-24&reporting_currency=USD"
    );
    expect(requestedUrl).not.toContain("benchmark_code=");
  });

  it("calls the client-side risk concentration endpoint without forcing a detail basis", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        new Response(
          JSON.stringify({
            state: "ready",
            payload: {},
            supportability: [],
            warnings: [],
            partial_failures: [],
          }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        )
      )
    );

    await getWorkbenchRiskConcentrationClient("PF_1001", {
      period: "YTD",
      benchmark: "BMK_GLOBAL_BALANCED_60_40",
      asOfDate: "2026-02-24",
      reportingCurrency: "USD",
    });

    const requestedUrl = (global.fetch as unknown as ReturnType<typeof vi.fn>).mock.calls[0][0].toString();
    expect(requestedUrl).toBe(
      "/api/bff/api/v1/workbench/PF_1001/risk/concentration?period=YTD&benchmark_code=BMK_GLOBAL_BALANCED_60_40&as_of_date=2026-02-24&reporting_currency=USD"
    );
    expect(requestedUrl).not.toContain("detail_basis=");
    expect(getAnalyticsUiMetricEvents()).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          metric_name: "lotus_workbench_panel_state_total",
          labels: expect.objectContaining({
            route: "workbench.risk",
            panel: "risk-concentration",
            operation: "risk.concentration",
            state: "ready",
          }),
        }),
      ])
    );
  });

  it("keeps underwater detail out of first-paint drawdown requests by default", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        new Response(
          JSON.stringify({
            state: "partial",
            payload: { periods: [] },
            supportability: [],
            warnings: [],
            partial_failures: [],
          }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        )
      )
    );

    await getWorkbenchRiskDrawdownClient("PF_1001", {
      period: "YTD",
      detailBasis: "NET",
      benchmark: "BMK_GLOBAL_BALANCED_60_40",
      asOfDate: "2026-02-24",
      reportingCurrency: "USD",
    });

    const requestedUrl = (global.fetch as unknown as ReturnType<typeof vi.fn>).mock.calls[0][0].toString();
    expect(requestedUrl).toBe(
      "/api/bff/api/v1/workbench/PF_1001/risk/drawdown?period=YTD&detail_basis=NET&benchmark_code=BMK_GLOBAL_BALANCED_60_40&as_of_date=2026-02-24&reporting_currency=USD"
    );
    expect(requestedUrl).not.toContain("include_underwater_series=");
  });

  it("requests underwater detail explicitly only for drawdown drill-down flows", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        new Response(
          JSON.stringify({
            state: "ready",
            payload: { periods: [] },
            supportability: [],
            warnings: [],
            partial_failures: [],
          }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        )
      )
    );

    await getWorkbenchRiskDrawdownClient("PF_1001", {
      period: "YTD",
      detailBasis: "NET",
      benchmark: "BMK_GLOBAL_BALANCED_60_40",
      asOfDate: "2026-02-24",
      reportingCurrency: "USD",
      includeUnderwaterSeries: true,
    });

    const requestedUrl = (global.fetch as unknown as ReturnType<typeof vi.fn>).mock.calls[0][0].toString();
    expect(requestedUrl).toBe(
      "/api/bff/api/v1/workbench/PF_1001/risk/drawdown?period=YTD&detail_basis=NET&benchmark_code=BMK_GLOBAL_BALANCED_60_40&as_of_date=2026-02-24&reporting_currency=USD&include_underwater_series=true"
    );
  });

  it("keeps rolling series detail out of first-paint rolling requests by default", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        new Response(
          JSON.stringify({
            state: "partial",
            payload: { periods: [] },
            supportability: [],
            warnings: [],
            partial_failures: [],
          }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        )
      )
    );

    await getWorkbenchRiskRollingClient("PF_1001", {
      period: "YTD",
      detailBasis: "NET",
      benchmark: "BMK_GLOBAL_BALANCED_60_40",
      asOfDate: "2026-02-24",
      reportingCurrency: "USD",
    });

    const requestedUrl = (global.fetch as unknown as ReturnType<typeof vi.fn>).mock.calls[0][0].toString();
    expect(requestedUrl).toBe(
      "/api/bff/api/v1/workbench/PF_1001/risk/rolling?period=YTD&detail_basis=NET&benchmark_code=BMK_GLOBAL_BALANCED_60_40&as_of_date=2026-02-24&reporting_currency=USD"
    );
    expect(requestedUrl).not.toContain("include_time_series=");
  });

  it("requests rolling series detail explicitly only for rolling drill-down flows", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        new Response(
          JSON.stringify({
            state: "ready",
            payload: { periods: [] },
            supportability: [],
            warnings: [],
            partial_failures: [],
          }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        )
      )
    );

    await getWorkbenchRiskRollingClient("PF_1001", {
      period: "YTD",
      detailBasis: "NET",
      benchmark: "BMK_GLOBAL_BALANCED_60_40",
      asOfDate: "2026-02-24",
      reportingCurrency: "USD",
      includeTimeSeries: true,
    });

    const requestedUrl = (global.fetch as unknown as ReturnType<typeof vi.fn>).mock.calls[0][0].toString();
    expect(requestedUrl).toBe(
      "/api/bff/api/v1/workbench/PF_1001/risk/rolling?period=YTD&detail_basis=NET&benchmark_code=BMK_GLOBAL_BALANCED_60_40&as_of_date=2026-02-24&reporting_currency=USD&include_time_series=true"
    );
  });

  it("passes attribution type and grouping controls through the client-side attribution request", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        new Response(
          JSON.stringify({
            state: "ready",
            payload: { periods: [] },
            supportability: [],
            warnings: [],
            partial_failures: [],
          }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        )
      )
    );

    await getWorkbenchRiskAttributionClient("PF_1001", {
      period: "YTD",
      detailBasis: "NET",
      benchmark: "BMK_GLOBAL_BALANCED_60_40",
      asOfDate: "2026-02-24",
      reportingCurrency: "USD",
      attributionType: "ACTIVE_RISK",
      groupingDimension: "SECTOR",
    });

    const requestedUrl = (global.fetch as unknown as ReturnType<typeof vi.fn>).mock.calls[0][0].toString();
    expect(requestedUrl).toBe(
      "/api/bff/api/v1/workbench/PF_1001/risk/attribution?period=YTD&detail_basis=NET&benchmark_code=BMK_GLOBAL_BALANCED_60_40&as_of_date=2026-02-24&reporting_currency=USD&attribution_type=ACTIVE_RISK&grouping_dimension=SECTOR"
    );
  });

  it("defaults the client-side horizon comparison frequency to monthly", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        new Response(
          JSON.stringify({
            correlation_id: "corr-performance",
            contract_version: "v1",
            portfolio_id: "PF_1001",
            as_of_date: "2026-02-24",
            detail_basis: "NET",
            benchmark_code: null,
            benchmark_options: [],
            rows: [],
            warnings: [],
            partial_failures: [],
          }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        )
      )
    );

    await getWorkbenchPerformanceHorizonComparisonClient("PF_1001", {
      detailBasis: "NET",
    });

    const requestedUrl = (global.fetch as unknown as ReturnType<typeof vi.fn>).mock.calls[0][0].toString();
    expect(requestedUrl).toContain("chart_frequency=monthly");
    expect(requestedUrl).not.toContain("benchmark_code=");
  });

  it("calls the client-side attribution trend endpoint", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        new Response(
          JSON.stringify({
            correlation_id: "corr-performance",
            contract_version: "v1",
            portfolio_id: "PF_1001",
            as_of_date: "2026-02-24",
            period: "YTD",
            report_start_date: "2026-01-01",
            report_end_date: "2026-02-24",
            chart_frequency: "monthly",
            detail_basis: "NET",
            attribution_dimension: "asset_class",
            benchmark_code: "BMK_GLOBAL_BALANCED_60_40",
            rows: [],
            warnings: [],
            partial_failures: [],
          }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        )
      )
    );

    await getWorkbenchPerformanceAttributionTrendClient("PF_1001", {
      period: "YTD",
      chartFrequency: "monthly",
      attributionDimension: "asset_class",
      detailBasis: "NET",
      benchmark: "BMK_GLOBAL_BALANCED_60_40",
      reportStartDate: "2026-01-01",
      reportEndDate: "2026-02-24",
    });

    const requestedUrl = (global.fetch as unknown as ReturnType<typeof vi.fn>).mock.calls[0][0].toString();
    expect(requestedUrl).toContain(
      "/api/bff/api/v1/workbench/PF_1001/performance/attribution-trend?period=YTD&chart_frequency=monthly&attribution_dimension=asset_class&detail_basis=NET&benchmark_code=BMK_GLOBAL_BALANCED_60_40&report_start_date=2026-01-01&report_end_date=2026-02-24"
    );
  });

  it("calls the client-side advisor brief endpoint", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        new Response(
          JSON.stringify({
            correlation_id: "corr-advisor-brief",
            contract_version: "v1",
            portfolio_id: "PF_1001",
            portfolio: {
              portfolio_id: "PF_1001",
              client_id: "CIF_1",
              base_currency: "USD",
              booking_center_code: "SG",
            },
            as_of_date: "2026-02-24",
            period: "YTD",
            report_start_date: "2026-01-01",
            report_end_date: "2026-02-24",
            detail_basis: "NET",
            chart_frequency: "monthly",
            contribution_dimension: "asset_class",
            attribution_dimension: "asset_class",
            benchmark_code: "BMK_GLOBAL_BALANCED_60_40",
            status: "ready",
            summary: "Advisor brief ready.",
            talking_points: [],
            recommended_actions: [],
            risks_and_exceptions: [],
            source_metrics: [],
            supportability: [],
            ai_surface_supportability: {
              feature_key: "ai.observability.ai_surface_supportability",
              state: "action_required",
              freshness_bucket: "fresh",
              posture: "degraded",
              freshness: "current",
              metric_name: "lotus_ai_surface_supportability_state",
              supported_surface_count: 3,
              executable_workflow_pack_count: 3,
              action_required_surface_count: 3,
              unavailable_surface_count: 0,
              no_sensitive_content_telemetry: false,
              surfaces: [
                {
                  surface_id: "advisor_brief",
                  owning_service: "lotus-advise",
                  workflow_authority_owner: "lotus-advise",
                  workflow_pack_ref: "advisor_brief.pack@v1",
                  supportability_status: "ACTION_REQUIRED",
                  model_posture: "degraded",
                  latest_ready_run_id: null,
                  latest_action_required_run_id: "packrun_advisor_brief_req-1",
                  no_sensitive_content_telemetry: false,
                  status_summary: ["advisor_brief is grounded in workflow-pack runtime source."],
                },
              ],
              status_summary: ["AI surface supportability is source-backed."],
            },
            advisory_supportability: {
              feature_key: "advise.observability.advisory_supportability",
              state: "ready",
              reason: "advisory_ready",
              freshness_bucket: "current",
              dependency_count: 5,
              ready_dependency_count: 5,
              degraded_dependency_count: 0,
              enabled_feature_count: 9,
              ready_feature_count: 9,
              metric_name: "lotus_advise_advisory_supportability_total",
            },
            workflow_pack_task_flow: {
              task_flow_id: "taskflow_advisor_brief_req-1",
              workflow_pack_id: "advisor_brief.pack",
              version: "v1",
              flow_status: "WAITING_FOR_REVIEW",
              current_step_id: "generate_advisor_brief",
              run_refs: ["packrun_advisor_brief_req-1"],
              review_states: {
                "packrun_advisor_brief_req-1": "AWAITING_REVIEW",
              },
              supportability_status: "ACTION_REQUIRED",
              replacement_lineage: [],
              handoff_refs: [],
              updated_at: "2026-04-21T03:00:00Z",
            },
            ai_audit: {},
            ai_evidence: {},
            warnings: [],
            partial_failures: [],
          }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        )
      )
    );

    const advisorBrief = await getWorkbenchPerformanceAdvisorBriefClient("PF_1001", {
      period: "YTD",
      chartFrequency: "monthly",
      contributionDimension: "asset_class",
      attributionDimension: "asset_class",
      detailBasis: "NET",
      benchmark: "BMK_GLOBAL_BALANCED_60_40",
      reportStartDate: "2026-01-01",
      reportEndDate: "2026-02-24",
    });

    const requestedUrl = (global.fetch as unknown as ReturnType<typeof vi.fn>).mock.calls[0][0].toString();
    expect(requestedUrl).toContain(
      "/api/bff/api/v1/workbench/PF_1001/performance/advisor-brief?period=YTD&chart_frequency=monthly&contribution_dimension=asset_class&attribution_dimension=asset_class&detail_basis=NET&benchmark_code=BMK_GLOBAL_BALANCED_60_40&report_start_date=2026-01-01&report_end_date=2026-02-24"
    );
    expect(advisorBrief.workflow_pack_task_flow?.task_flow_id).toBe(
      "taskflow_advisor_brief_req-1"
    );
    expect(advisorBrief.ai_surface_supportability?.feature_key).toBe(
      "ai.observability.ai_surface_supportability"
    );
    expect(advisorBrief.ai_surface_supportability?.state).toBe("action_required");
    expect(advisorBrief.advisory_supportability?.feature_key).toBe(
      "advise.observability.advisory_supportability"
    );
    expect(advisorBrief.advisory_supportability?.ready_feature_count).toBe(9);
    const metricEventsJson = JSON.stringify(getAnalyticsUiMetricEvents());
    expect(metricEventsJson).toContain('"supportability_state":"action_required"');
    expect(metricEventsJson).toContain('"freshness_bucket":"fresh"');
    expect(metricEventsJson).not.toContain("packrun_advisor_brief_req-1");
    expect(metricEventsJson).not.toContain("PF_1001");
  });

  it("posts advisor brief review actions through the client-side gateway seam", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        new Response(
          JSON.stringify({
            correlation_id: "corr-advisor-brief-review",
            contract_version: "v1",
            portfolio_id: "PF_1001",
            portfolio: {
              portfolio_id: "PF_1001",
              client_id: "CIF_1",
              base_currency: "USD",
              booking_center_code: "SG",
            },
            as_of_date: "2026-02-24",
            period: "YTD",
            report_start_date: "2026-01-01",
            report_end_date: "2026-02-24",
            detail_basis: "NET",
            chart_frequency: "monthly",
            contribution_dimension: "asset_class",
            attribution_dimension: "asset_class",
            benchmark_code: "BMK_GLOBAL_BALANCED_60_40",
            status: "ready",
            summary: "Advisor brief accepted.",
            talking_points: [],
            recommended_actions: [],
            risks_and_exceptions: [],
            source_metrics: [],
            supportability: [],
            workflow_pack_run: {
              run_id: "packrun_advisor_brief_req-1",
              runtime_state: "COMPLETED",
              review_state: "ACCEPTED",
              allowed_review_actions: [],
              supportability_status: "READY",
              review_pending: false,
              superseded: false,
              workflow_authority_owner: "lotus-gateway",
              current_summary_note:
                "Run accepted for bounded downstream workflow use.",
              replacement_run_id: null,
              findings: [],
            },
            workflow_pack_task_flow: {
              task_flow_id: "taskflow_advisor_brief_req-1",
              workflow_pack_id: "advisor_brief.pack",
              version: "v1",
              flow_status: "COMPLETED",
              current_step_id: null,
              run_refs: ["packrun_advisor_brief_req-1"],
              review_states: {
                "packrun_advisor_brief_req-1": "ACCEPTED",
              },
              supportability_status: "READY",
              replacement_lineage: [],
              handoff_refs: [
                {
                  handoff_id: "taskflow_advisor_brief_req-1_handoff_packrun_advisor_brief_req-1",
                  owner_service: "lotus-gateway",
                  status: "READY_FOR_HANDOFF",
                  domain_ref: null,
                },
              ],
              updated_at: "2026-04-21T03:00:00Z",
            },
            ai_audit: {},
            ai_evidence: {},
            warnings: [],
            partial_failures: [],
          }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        )
      )
    );

    await postWorkbenchPerformanceAdvisorBriefReviewActionClient(
      "PF_1001",
      {
        period: "YTD",
        chartFrequency: "monthly",
        contributionDimension: "asset_class",
        attributionDimension: "asset_class",
        detailBasis: "NET",
        benchmark: "BMK_GLOBAL_BALANCED_60_40",
        reportStartDate: "2026-01-01",
        reportEndDate: "2026-02-24",
      },
      {
        action_type: "ACCEPT",
        reviewed_by: "advisor_1",
        reason: "Advisor brief accepted for bounded downstream workflow use.",
      }
    );

    const fetchMock = global.fetch as unknown as ReturnType<typeof vi.fn>;
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/bff/api/v1/workbench/PF_1001/performance/advisor-brief/review-actions?period=YTD&chart_frequency=monthly&contribution_dimension=asset_class&attribution_dimension=asset_class&detail_basis=NET&benchmark_code=BMK_GLOBAL_BALANCED_60_40&report_start_date=2026-01-01&report_end_date=2026-02-24",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({
          action_type: "ACCEPT",
          reviewed_by: "advisor_1",
          reason: "Advisor brief accepted for bounded downstream workflow use.",
        }),
        cache: "no-store",
      })
    );
    const requestHeaders = fetchMock.mock.calls[0][1]?.headers as Headers;
    expect(requestHeaders.get("Content-Type")).toBe("application/json");
    expect(requestHeaders.get("X-Correlation-Id")).toMatch(/^corr-workbench-[0-9a-f]{16}$/);

    const metricEvents = getAnalyticsUiMetricEvents();
    const metricEventsJson = JSON.stringify(metricEvents);
    expect(metricEvents.map((event) => event.metric_name)).toContain(
      "lotus_workbench_api_request_duration_seconds"
    );
    expect(metricEvents.map((event) => event.metric_name)).toContain(
      "lotus_workbench_panel_state_total"
    );
    expect(metricEvents.map((event) => event.metric_name)).not.toContain(
      "lotus_workbench_panel_hydration_duration_seconds"
    );
    expect(metricEventsJson).toContain("performance-advisor-brief-review-action");
    expect(metricEventsJson).toContain(
      "performance.workspace.advisor-brief.review-action"
    );
    expect(metricEventsJson).not.toContain("PF_1001");
    expect(metricEventsJson).not.toContain("packrun_advisor_brief_req-1");
    expect(metricEventsJson).not.toContain("advisor_1");
    expect(metricEventsJson).not.toContain("Advisor brief accepted");
  });

  it("keeps advisor brief review action denial errors bounded", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        new Response(
          JSON.stringify({
            detail: "raw_entitlement_denied for portfolio PF_1001 and client CIF_1",
          }),
          { status: 403, headers: { "Content-Type": "application/json" } }
        )
      )
    );

    await expect(
      postWorkbenchPerformanceAdvisorBriefReviewActionClient(
        "PF_1001",
        {
          period: "YTD",
          chartFrequency: "monthly",
          contributionDimension: "asset_class",
          attributionDimension: "asset_class",
          detailBasis: "NET",
          benchmark: "BMK_GLOBAL_BALANCED_60_40",
          reportStartDate: "2026-01-01",
          reportEndDate: "2026-02-24",
        },
        {
          action_type: "ACCEPT",
          reviewed_by: "advisor_1",
          reason: "Advisor brief accepted for bounded downstream workflow use.",
        }
      )
    ).rejects.toThrow("Failed to fetch performance advisor brief review action (403)");

    const metricEventsJson = JSON.stringify(getAnalyticsUiMetricEvents());
    expect(metricEventsJson).toContain("performance-advisor-brief-review-action");
    expect(metricEventsJson).toContain('"state":"permission_blocked"');
    expect(metricEventsJson).not.toContain("raw_entitlement_denied");
    expect(metricEventsJson).not.toContain("PF_1001");
    expect(metricEventsJson).not.toContain("CIF_1");
    expect(metricEventsJson).not.toContain("advisor_1");
  });

  it("calls backend reporting snapshot endpoint", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        new Response(
          JSON.stringify({
            correlationId: "corr",
            contractVersion: "v1",
            sourceService: "lotus-report",
            portfolioId: "PF_1001",
            asOfDate: "2026-02-24",
            generatedAt: "2026-02-24T07:00:00Z",
            rows: [{ bucket: "TOTAL", metric: "market_value_base", value: 1250000.12 }],
          }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        )
      )
    );

    await getReportingSnapshot("PF_1001", "2026-02-24");

    const fetchMock = global.fetch as unknown as ReturnType<typeof vi.fn>;
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining("/api/v1/reports/PF_1001/snapshot?asOfDate=2026-02-24"),
      expect.objectContaining({ cache: "no-store" })
    );
    const metricEventsJson = JSON.stringify(getAnalyticsUiMetricEvents());
    expect(metricEventsJson).toContain("reporting-snapshot");
    expect(metricEventsJson).not.toContain("PF_1001");
  });

  it("creates an explicit portfolio report batch through the gateway BFF", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        new Response(
          JSON.stringify({
            batch_id: "rbch_1",
            status: "materialized",
            status_url: "/api/v1/report-batches/rbch_1",
            idempotency_key: "workbench-report-batch-PF_1001-2026-02-24-USD",
            item_count: 1,
            supportability: {
              feature_key: "report.observability.evidence_surface_supportability",
              state: "ready",
              reason: "evidence_surface_ready",
              freshness_bucket: "current",
              evidence_feature_count: 14,
              ready_evidence_feature_count: 14,
              degraded_evidence_feature_count: 0,
              workflow_count: 4,
              ready_workflow_count: 4,
            },
            render_supportability: {
              feature_key: "render.observability.render_supportability",
              state: "ready",
              reason: "render_supportability_ready",
              freshness_bucket: "current",
              deterministic_output_supported: true,
              render_store_ready: true,
              template_registry_ready: true,
              default_output_format: "pdf",
              supported_output_formats: ["pdf"],
            },
          }),
          { status: 201, headers: { "Content-Type": "application/json" } }
        )
      )
    );

    const response = await createPortfolioReportBatch({
      portfolioId: "PF_1001",
      asOfDate: "2026-02-24",
      reportingCurrency: "USD",
      bookingCenterCode: "SG",
      benchmarkCode: "BMK_GLOBAL_BALANCED_60_40",
    });

    const fetchMock = global.fetch as unknown as ReturnType<typeof vi.fn>;
    const [url, init] = fetchMock.mock.calls[0];
    const body = JSON.parse(String(init?.body));
    const headers = init?.headers as Record<string, string>;

    expect(url).toBe(`${expectedBaseUrl}/report-batches`);
    expect(init).toEqual(expect.objectContaining({ method: "POST", cache: "no-store" }));
    expect(headers["Idempotency-Key"]).toBe("workbench-report-batch-PF_1001-2026-02-24-USD");
    expect(headers["X-Caller-Application"]).toBe("lotus-workbench");
    expect(headers["X-Tenant-Id"]).toBe("tenant-sg");
    expect(headers["X-Region"]).toBe("APAC");
    expect(body).toEqual(
      expect.objectContaining({
        selector_mode: "explicit_portfolio_list",
        portfolio_ids: ["PF_1001"],
        as_of_date: "2026-02-24",
        requested_output_formats: ["pdf"],
        reporting_currency: "USD",
        max_batch_size: 1,
      })
    );
    expect(body.source_candidates[0]).toEqual(
      expect.objectContaining({
        portfolio_id: "PF_1001",
        tenant_id: "tenant-sg",
        region: "APAC",
        active: true,
        selected: true,
        source_system: "lotus-core",
      })
    );
    expect(body.options).toEqual(
      expect.objectContaining({
        benchmark_code: "BMK_GLOBAL_BALANCED_60_40",
        source_surface: "lotus-workbench",
      })
    );
    expect(response.supportability?.feature_key).toBe(
      "report.observability.evidence_surface_supportability"
    );
    expect(response.supportability?.state).toBe("ready");
    expect(response.render_supportability?.feature_key).toBe(
      "render.observability.render_supportability"
    );
    const metricEventsJson = JSON.stringify(getAnalyticsUiMetricEvents());
    expect(metricEventsJson).toContain("report-batch-create");
    expect(metricEventsJson).toContain('"supportability_state":"ready"');
    expect(metricEventsJson).toContain('"freshness_bucket":"fresh"');
    expect(metricEventsJson).not.toContain("rbch_1");
    expect(metricEventsJson).not.toContain("PF_1001");
  });

  it("loads report batch status through the gateway BFF", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        new Response(
          JSON.stringify({
            batch_id: "rbch_1",
            selector_mode: "explicit_portfolio_list",
            tenant_id: "tenant-sg",
            region: "APAC",
            materialized_portfolio_ids: ["PF_1001"],
            as_of_date: "2026-02-24",
            requested_output_formats: ["pdf"],
            reporting_currency: "USD",
            status: "completed",
            item_count: 1,
            status_counts: { succeeded: 1 },
            items: [],
            created_at: "2026-02-24T00:00:00Z",
            updated_at: null,
            started_at: null,
            completed_at: null,
            cancelled_at: null,
            failed_at: null,
            correlation_id: "corr",
            trace_id: "trace",
          }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        )
      )
    );

    await getReportBatchStatus("rbch_1");

    const fetchMock = global.fetch as unknown as ReturnType<typeof vi.fn>;
    expect(fetchMock).toHaveBeenCalledWith(
      `${expectedBaseUrl}/report-batches/rbch_1`,
      expect.objectContaining({
        method: "GET",
        headers: expect.objectContaining({
          "X-Actor-Id": "workbench-report-operator",
          "X-Caller-Application": "lotus-workbench",
          "X-Tenant-Id": "tenant-sg",
          "X-Region": "APAC",
          "X-Correlation-Id": "corr-workbench-report-batch-status-rbch_1",
        }),
      })
    );
  });

  it("runs one bounded report batch worker pass through the gateway BFF", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        new Response(
          JSON.stringify({
            batch_id: "rbch_1",
            status: "completed",
            batch_status_before: "materialized",
            batch_status_after: "completed",
            recovered_count: 0,
            leased_count: 1,
            dispatched_count: 1,
            executed_count: 1,
            report_job_ids: ["rjob_1"],
            back_pressure_reasons: [],
            skipped_reason: null,
            execution_results: [],
            status_url: "/api/v1/report-batches/rbch_1",
          }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        )
      )
    );

    await runReportBatchOnce({ batchId: "rbch_1", bookingCenterCode: "SG" });

    const fetchMock = global.fetch as unknown as ReturnType<typeof vi.fn>;
    const [url, init] = fetchMock.mock.calls[0];
    const body = JSON.parse(String(init?.body));
    const headers = init?.headers as Record<string, string>;

    expect(url).toBe(`${expectedBaseUrl}/report-batches/rbch_1:run-once`);
    expect(init).toEqual(expect.objectContaining({ method: "POST", cache: "no-store" }));
    expect(headers["X-Caller-Application"]).toBe("lotus-workbench");
    expect(body.worker_id).toBe("lotus-workbench-report-batch-operator");
    expect(body.dispatch_policy.max_active_items).toBe(100);
    expect(body.dispatch_policy.max_active_batches).toBe(100);
    expect(body.runtime_load.active_batches).toBe(0);
  });

  it("loads archived document metadata through the gateway BFF without leaking document ids into metrics", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        new Response(
          JSON.stringify({
            correlationId: "corr-archive-document-1",
            contractVersion: "v1",
            sourceService: "lotus-archive",
            documentId: "doc_1",
            reportJobId: "rjob_1",
            reportRequestId: "rrq_1",
            reportType: "PORTFOLIO_REVIEW",
            portfolioScope: "single_portfolio",
            portfolioId: "PF_1001",
            clientReference: "relationship-1",
            asOfDate: "2026-02-24",
            reportingPeriodStart: "2026-01-01",
            reportingPeriodEnd: "2026-02-24",
            frequency: "ad_hoc",
            templateId: "portfolio-review",
            templateVersion: "v1",
            renderServiceVersion: "render.1",
            reportDataContractVersion: "v1",
            checksumAlgorithm: "sha256",
            checksum: "abc123",
            sizeBytes: 2048,
            mimeType: "application/pdf",
            outputFormat: "pdf",
            classification: "confidential",
            region: "APAC",
            tenantId: "tenant-sg",
            retentionPolicyId: "retention-7y",
            retentionStartDate: "2026-02-24",
            retainUntilDate: "2033-02-24",
            purgeStatus: "not_due",
            legalHoldStatus: "none",
            legalHoldCount: 0,
            supersedesDocumentId: null,
            supersededByDocumentId: null,
            correctionOfDocumentId: null,
            reissueOfDocumentId: null,
            createdByService: "lotus-report",
            createdByActor: "report-worker",
            createdAt: "2026-02-24T00:00:00Z",
            updatedAt: "2026-02-24T00:00:00Z",
            downloadUrl: "/api/v1/documents/doc_1/download",
          }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        )
      )
    );

    const metadata = await getArchivedDocumentMetadata("doc_1", {
      current: true,
      bookingCenterCode: "SG",
    });

    const fetchMock = global.fetch as unknown as ReturnType<typeof vi.fn>;
    const [url, init] = fetchMock.mock.calls[0];
    const headers = init?.headers as Record<string, string>;
    const metricEventsJson = JSON.stringify(getAnalyticsUiMetricEvents());

    expect(url).toBe(`${expectedBaseUrl}/documents/doc_1?current=true`);
    expect(init).toEqual(expect.objectContaining({ method: "GET", cache: "no-store" }));
    expect(headers["X-Caller-Application"]).toBe("lotus-workbench");
    expect(headers["X-Booking-Center-Code"]).toBe("SG");
    expect(metadata.downloadUrl).toBe("/api/v1/documents/doc_1/download");
    expect(metricEventsJson).toContain("archive-document-metadata");
    expect(metricEventsJson).not.toContain("doc_1");
    expect(metricEventsJson).not.toContain("PF_1001");
    expect(buildArchivedDocumentDownloadUrl("doc_1")).toBe(
      `${expectedBaseUrl}/documents/doc_1/download`
    );
  });

  it("loads DPM outcome reviews through the gateway BFF with portfolio filters", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        new Response(
          JSON.stringify({
            correlation_id: "corr-rfc42",
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
            data: { items: [{ outcome_review_id: "or_1", state: "READY" }] },
          }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        )
      )
    );

    await getDpmOutcomeReviews({
      portfolioId: "PB_SG_GLOBAL_BAL_001",
      state: "READY",
      limit: 5,
      cursor: "cursor_1",
    });

    const requestedUrl = (global.fetch as unknown as ReturnType<typeof vi.fn>).mock.calls[0][0].toString();
    expect(requestedUrl).toContain(
      "/api/v1/dpm/command-center/outcome-reviews?portfolio_id=PB_SG_GLOBAL_BAL_001&limit=5&state=READY&cursor=cursor_1"
    );
    const metricEventsJson = JSON.stringify(getAnalyticsUiMetricEvents());
    expect(metricEventsJson).toContain("outcome-review-list");
    expect(metricEventsJson).not.toContain("PB_SG_GLOBAL_BAL_001");
    expect(metricEventsJson).not.toContain("or_1");
  });

  it("loads DPM report and AI handoff inputs through gateway-only client endpoints", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        new Response(
          JSON.stringify({
            correlation_id: "corr-rfc42-handoff",
            contract_version: "v1",
            source_service: "lotus-manage",
            upstream_status: 200,
            supportability: {
              source_service: "lotus-manage",
              authority: "lotus-manage:RFC-0042",
              state: "SUPPORTED",
              reason_codes: [],
              blocked_actions: [],
            },
            data: { outcome_review_id: "or_1" },
          }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        )
      )
    );

    await getDpmOutcomeReviewReportInput("or_1");
    await getDpmOutcomeReviewAiEvidenceInput("or_1");

    const fetchMock = global.fetch as unknown as ReturnType<typeof vi.fn>;
    expect(fetchMock.mock.calls[0][0]).toBe(
      `${expectedBaseUrl}/dpm/command-center/outcome-reviews/or_1/report-input`
    );
    expect(fetchMock.mock.calls[1][0]).toBe(
      `${expectedBaseUrl}/dpm/command-center/outcome-reviews/or_1/ai-evidence-input`
    );
    const metricEventsJson = JSON.stringify(getAnalyticsUiMetricEvents());
    expect(metricEventsJson).toContain("outcome-review-report-input");
    expect(metricEventsJson).toContain("outcome-review-ai-evidence");
    expect(metricEventsJson).not.toContain("or_1");
  });

  it("generates DPM construction alternatives through the Gateway BFF", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        new Response(
          JSON.stringify({
            correlation_id: "corr-rfc39",
            contract_version: "v1",
            source_service: "lotus-manage",
            upstream_status: 200,
            supportability: {
              source_service: "lotus-manage",
              authority: "lotus-manage:RFC-0039",
              state: "READY",
              reason_codes: ["REGIME_SCENARIO_PACK_READY"],
            },
            data: { alternative_set_id: "cas_1", alternatives: [] },
          }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        )
      )
    );

    await generateDpmConstructionAlternatives({
      portfolio: constructionPortfolio(),
      methods: ["DO_NOTHING_BASELINE", "MIN_TURNOVER"],
    });

    const fetchMock = global.fetch as unknown as ReturnType<typeof vi.fn>;
    expect(fetchMock.mock.calls[0][0]).toBe(
      `${expectedBaseUrl}/dpm/command-center/construction/alternative-sets/generate`
    );
    const options = fetchMock.mock.calls[0][1];
    expect(options.headers["X-Caller-Application"]).toBe("lotus-workbench");
    expect(options.headers["X-Actor-Id"]).toBe("workbench-construction-operator");
    const body = JSON.parse(options.body);
    expect(body.idempotency_key).toBe(
      "workbench-construction-PB_SG_GLOBAL_BAL_001-2026-04-10"
    );
    expect(body.body.input_mode).toBe("stateful");
    expect(body.body.methods).toEqual([
      "DO_NOTHING_BASELINE",
      "MIN_TURNOVER",
    ]);
    expect(body.body.stateful_input.portfolio_id).toBe(
      "PB_SG_GLOBAL_BAL_001"
    );
    expect(body.body.stateful_input.as_of).toBe("2026-04-10");
    expect(body.body.stateful_input.mandate_id).toBe(
      "MANDATE_PB_SG_GLOBAL_BAL_001"
    );
    expect(body.body.stateful_input.model_portfolio_id).toBe(
      "MODEL_PB_SG_GLOBAL_BAL_DPM"
    );
    expect(body.body.stateful_input.tenant_id).toBe("tenant-sg");
    expect(body.body.stateful_input.booking_center_code).toBe("Singapore");
    expect(body.body.stateful_input.include_model_portfolio).toBe(true);
    expect(body.body.options_override.valuation_mode).toBe("TRUST_SNAPSHOT");
    const metricEventsJson = JSON.stringify(getAnalyticsUiMetricEvents());
    expect(metricEventsJson).toContain("construction-alternatives");
    expect(metricEventsJson).not.toContain("PB_SG_GLOBAL_BAL_001");
    expect(metricEventsJson).not.toContain("cas_1");
  });

  it("loads and selects DPM construction alternatives through Gateway endpoints", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        new Response(
          JSON.stringify({
            correlation_id: "corr-rfc39",
            contract_version: "v1",
            source_service: "lotus-manage",
            upstream_status: 200,
            supportability: {
              source_service: "lotus-manage",
              authority: "lotus-manage:RFC-0039",
              state: "READY",
              reason_codes: [],
              selected_alternative_id: "alt_1",
            },
            data: { alternative_set_id: "cas_1", selected_alternative_id: "alt_1" },
          }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        )
      )
    );

    await getDpmConstructionAlternativeSet("cas_1");
    await selectDpmConstructionAlternative({
      alternativeSetId: "cas_1",
      alternativeId: "alt_1",
      actorId: "pm_1",
      reasonCode: "PM_APPROVED",
      comment: "Approved by PM.",
    });

    const fetchMock = global.fetch as unknown as ReturnType<typeof vi.fn>;
    expect(fetchMock.mock.calls[0][0]).toBe(
      `${expectedBaseUrl}/dpm/command-center/construction/alternative-sets/cas_1`
    );
    expect(fetchMock.mock.calls[1][0]).toBe(
      `${expectedBaseUrl}/dpm/command-center/construction/alternative-sets/cas_1/selections`
    );
    expect(JSON.parse(fetchMock.mock.calls[1][1].body)).toEqual({
      body: {
        alternative_id: "alt_1",
        actor_id: "pm_1",
        reason_code: "PM_APPROVED",
        comment: "Approved by PM.",
      },
    });
    const metricEventsJson = JSON.stringify(getAnalyticsUiMetricEvents());
    expect(metricEventsJson).toContain("construction-alternative-set");
    expect(metricEventsJson).toContain("construction-selection");
    expect(metricEventsJson).not.toContain("cas_1");
    expect(metricEventsJson).not.toContain("alt_1");
  });

  it("requests DPM outcome-review AI narrative through the Gateway BFF", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        new Response(
          JSON.stringify({
            correlation_id: "corr-rfc42-ai-narrative",
            contract_version: "v1",
            source_service: "lotus-ai",
            evidence_source_service: "lotus-manage",
            manage_upstream_status: 200,
            ai_upstream_status: 200,
            supportability: {
              source_service: "lotus-manage",
              authority: "lotus-manage:RFC-0042",
              state: "SUPPORTED",
              reason_codes: [],
              blocked_actions: [],
            },
            ai_evidence_input: { outcome_review_id: "or_1" },
            narrative_request: { requested_outputs: ["pm_summary"], audience: ["pm"] },
            data: { workflow_pack_run: { run_id: "packrun_or_1" } },
          }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        )
      )
    );

    await requestDpmOutcomeReviewAiNarrative({
      outcomeReviewId: "or_1",
      requestedOutputs: ["pm_summary"],
      audience: ["pm"],
    });

    const fetchMock = global.fetch as unknown as ReturnType<typeof vi.fn>;
    expect(fetchMock.mock.calls[0][0]).toBe(
      `${expectedBaseUrl}/dpm/command-center/outcome-reviews/or_1/ai-narrative`
    );
    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toEqual({
      requested_outputs: ["pm_summary"],
      audience: ["pm"],
    });
    const metricEventsJson = JSON.stringify(getAnalyticsUiMetricEvents());
    expect(metricEventsJson).toContain("outcome-review-ai-narrative");
    expect(metricEventsJson).not.toContain("or_1");
    expect(metricEventsJson).not.toContain("packrun_or_1");
  });

  it("submits DPM outcome-review report jobs through the gateway BFF", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        new Response(
          JSON.stringify({
            report_request_id: "rrq_outcome_1",
            report_job_id: "rjob_outcome_1",
            status: "accepted",
            status_url: "/api/v1/report-jobs/rjob_outcome_1",
            idempotency_key: "outcome-review-or_1-pdf",
          }),
          { status: 202, headers: { "Content-Type": "application/json" } }
        )
      )
    );

    const handle = await submitDpmOutcomeReviewReportJob({
      outcomeReviewId: "or_1",
      outcomeReportInput: { outcome_review_id: "or_1", content_hash: "sha256:report-input" },
    });

    expect(handle.report_job_id).toBe("rjob_outcome_1");
    const fetchMock = global.fetch as unknown as ReturnType<typeof vi.fn>;
    expect(fetchMock.mock.calls[0][0]).toBe(`${expectedBaseUrl}/reports/outcome-reviews`);
    expect(fetchMock.mock.calls[0][1].headers["Idempotency-Key"]).toBe(
      "outcome-review-or_1-pdf"
    );
    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toEqual({
      outcome_report_input: {
        outcome_review_id: "or_1",
        content_hash: "sha256:report-input",
      },
      requested_output_formats: ["pdf"],
      options: { retention_policy_id: "generated-report-standard" },
    });
    const metricEventsJson = JSON.stringify(getAnalyticsUiMetricEvents());
    expect(metricEventsJson).toContain("outcome-review-report-job");
    expect(metricEventsJson).not.toContain("or_1");
  });

  it("raises a labeled error when the split summary endpoint fails", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response("downstream failed", { status: 503 }))
    );

    await expect(
      getWorkbenchPerformanceWorkspaceSummary("PF_1001", {
        period: "YTD",
        chartFrequency: "monthly",
        contributionDimension: "asset_class",
        attributionDimension: "asset_class",
        detailBasis: "NET",
      })
    ).rejects.toThrow("Failed to fetch performance workspace summary (503)");
  });
});

function constructionPortfolio(): WorkbenchPortfolio360 {
  return {
    correlation_id: "corr-p360",
    contract_version: "v1",
    as_of_date: "2026-02-24",
    portfolio: {
      portfolio_id: "PB_SG_GLOBAL_BAL_001",
      client_id: "C1",
      base_currency: "SGD",
      booking_center_code: "SG",
    },
    overview: {
      market_value_base: 100000,
      cash_weight_pct: 8,
      position_count: 2,
    },
    performance_snapshot: null,
    rebalance_snapshot: null,
    current_positions: [
      {
        security_id: "UOB_EQ",
        instrument_name: "UOB",
        asset_class: "EQUITY",
        quantity: 100,
        market_value_base: 50000,
        weight_pct: 50,
      },
      {
        security_id: "SG_BOND",
        instrument_name: "SG Bond",
        asset_class: "FIXED_INCOME",
        quantity: 50,
        market_value_base: 42000,
        weight_pct: 42,
      },
    ],
    projected_positions: [],
    projected_summary: null,
    active_session_id: null,
    warnings: [],
    partial_failures: [],
  };
}
