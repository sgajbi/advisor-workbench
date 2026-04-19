import { afterEach, describe, expect, it, vi } from "vitest";

import {
  applySandboxChanges,
  createSandboxSession,
  getReportingSnapshot,
  getWorkbenchAnalytics,
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
} from "../../src/features/workbench/api";

const expectedBaseUrl = "/api/bff/api/v1";

describe("workbench api", () => {
  afterEach(() => {
    vi.restoreAllMocks();
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
            as_of_date: "2026-02-24",
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
    expect(requestedUrl).toBe(
      "/api/bff/api/v1/workbench/PF_1001/risk/summary?period=YTD&detail_basis=NET&benchmark_code=BMK_GLOBAL_BALANCED_60_40&as_of_date=2026-02-24&reporting_currency=USD"
    );
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
            ai_audit: {},
            ai_evidence: {},
            warnings: [],
            partial_failures: [],
          }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        )
      )
    );

    await getWorkbenchPerformanceAdvisorBriefClient("PF_1001", {
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
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action_type: "ACCEPT",
          reviewed_by: "advisor_1",
          reason: "Advisor brief accepted for bounded downstream workflow use.",
        }),
        cache: "no-store",
      }
    );
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
