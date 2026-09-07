import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  approveDpmWave,
  buildDpmPmOperatingQualityReviewActionCorrelationId,
  buildDpmPmOperatingQualitySummaryInvocationCorrelationId,
  calculateCompositePerformanceTwrClient,
  createDpmCampaignApprovalDecision,
  createDpmCampaignAssignmentAction,
  createDpmCampaignAssignmentTask,
  createDpmCampaignAssignmentTaskTransition,
  createDpmCampaignMakerCheckerControl,
  createDpmPmOperatingQualityFairnessAnalysis,
  createDpmPmOperatingQualityReviewAction,
  createDpmPmOperatingQualitySummaryInvocation,
  generateDpmConstructionAlternatives,
  generateDpmProofPackFromRun,
  getDpmCampaignDefinitionLaunchHistory,
  getDpmCampaignDefinitionLaunchPackage,
  getDpmCampaignDefinitionLifecycleEvents,
  getDpmCampaignDefinitionPreviewReadiness,
  getDpmCampaignApprovalDecisions,
  getDpmCampaignAssignmentActions,
  getDpmCampaignAssignmentTasks,
  getDpmCampaignMakerCheckerControls,
  getDpmCommandCenter,
  getDpmCommandCenterExceptions,
  getDpmMandateByPortfolio,
  getDpmMandateHealth,
  getDpmOutcomeReviewAiEvidenceInput,
  getDpmOutcomeReviewReportInput,
  getDpmOutcomeReviews,
  getDpmPmOperatingQualityFairnessAnalysis,
  getDpmPmOperatingQualityReviewAction,
  getDpmPmOperatingQualitySummaryInvocation,
  getDpmPortfolioMemory,
  searchDpmPortfolioMemory,
  listDpmPmOperatingQualityFairnessAnalyses,
  listDpmPmOperatingQualityPolicies,
  listDpmPmOperatingQualityReviewActions,
  listDpmPmOperatingQualitySummaryInvocations,
  listDpmPmOperatingQualityScoreRuns,
  getDpmConstructionAlternativeSet,
  getExternalOrderExecutionAcknowledgement,
  getDpmProofPack,
  getDpmProofPackAiEvidenceInput,
  getDpmProofPackMarkdown,
  getDpmProofPackReportInput,
  getDpmWave,
  getDpmWaveItems,
  getDpmWaveProofPackPosture,
  getDpmWaveReportInput,
  getDpmWaveSupportability,
  getDpmCampaignDefinition,
  handoffDpmWave,
  listDpmCampaignDiscovery,
  listDpmCampaignDefinitions,
  listDpmCampaignApprovalInbox,
  listDpmCampaignAssignmentPlan,
  listDpmCampaignOperatingQueue,
  listDpmCampaignWorkflowAutomation,
  listDpmCampaignWorkflowBoard,
  listDpmWaves,
  launchDpmCampaignDefinition,
  previewDpmWave,
  retireDpmCampaignDefinition,
  previewDpmPmOperatingQualityFairnessAnalysis,
  previewDpmPmOperatingQualityReviewAction,
  previewDpmPmOperatingQualityScoreRun,
  previewDpmPmOperatingQualitySummaryInvocation,
  requestDpmExceptionSummary,
  requestDpmPmOperatingQualitySummary,
  requestDpmOperationsHandoffSummary,
  requestDpmOutcomeReviewAiNarrative,
  requestDpmProofPackAiPmMemo,
  requestDpmWaveAiPmMemo,
  supersedeDpmCampaignDefinition,
  getPortfolio360,
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
  inspectCompositePerformanceClient,
  postWorkbenchPerformanceAdvisorBriefReviewActionClient,
  simulateDpmWave,
  selectDpmConstructionAlternative,
  sourceCheckDpmWave,
  stageDpmWave,
  submitDpmOutcomeReviewReportJob,
  createDpmWave,
} from "../../src/features/workbench/api";
import type { WorkbenchPortfolio360 } from "../../src/features/workbench/types";
import {
  getAnalyticsUiMetricEvents,
  resetAnalyticsUiMetricEvents,
} from "../../src/features/analytics-observability/metrics";
import { resolveGatewayBaseUrl } from "../../src/features/platform-runtime/service-addressing";

const expectedBaseUrl = "/api/bff/api/v1";

describe("workbench api", () => {
  beforeEach(() => {
    vi.stubEnv("LOTUS_ENVIRONMENT", "test");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
    resetAnalyticsUiMetricEvents();
  });

  it("calls gateway composite performance endpoints through the Workbench BFF", async () => {
    const fetchMock = vi.fn(async () =>
      new Response(
        JSON.stringify({
          correlation_id: "corr-composite",
          contract_version: "composite-performance-gateway.v1",
          source_service: "lotus-performance",
          upstream_status: 200,
          data: {
            composite_id: "PB_GLOBAL_BALANCED_USD",
            status: "READY",
            methodology: "persisted_member_return_asset_weighted_twr_v1",
            periods: [],
          },
        }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      )
    );
    vi.stubGlobal("fetch", fetchMock);

    const response = await calculateCompositePerformanceTwrClient({
      calculation_id: "calc-1",
      composite_id: "PB_GLOBAL_BALANCED_USD",
      period_start: "2026-01-01",
      period_end: "2026-03-31",
    });

    expect(response.source_service).toBe("lotus-performance");
    const [requestedUrl, requestInit] = fetchMock.mock.calls[0] as unknown as [
      string,
      RequestInit,
    ];
    const requestHeaders = requestInit.headers as Record<string, string>;
    expect(requestedUrl).toBe(`${expectedBaseUrl}/performance/composites/twr`);
    expect(JSON.parse(requestInit.body as string)).toEqual({
      calculation_id: "calc-1",
      composite_id: "PB_GLOBAL_BALANCED_USD",
      period_start: "2026-01-01",
      period_end: "2026-03-31",
    });
    expect(requestHeaders["Content-Type"]).toBe("application/json");
    expect(getAnalyticsUiMetricEvents()).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          metric_name: "lotus_workbench_api_request_duration_seconds",
          labels: expect.objectContaining({
            route: "workbench.performance",
            panel: "performance-composite-twr",
            operation: "performance.composites.twr",
            status_class: "2xx",
          }),
        }),
        expect.objectContaining({
          metric_name: "lotus_workbench_panel_state_total",
          labels: expect.objectContaining({
            route: "workbench.performance",
            panel: "performance-composite-twr",
            operation: "performance.composites.twr",
            state: "ready",
          }),
        }),
      ])
    );
    expect(getAnalyticsUiMetricEvents()).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          metric_name: "lotus_workbench_panel_hydration_duration_seconds",
          labels: expect.objectContaining({
            operation: "performance.composites.twr",
          }),
        }),
      ])
    );
  });

  it("calls gateway composite inspection endpoint through the Workbench BFF", async () => {
    const fetchMock = vi.fn(async () =>
      new Response(
        JSON.stringify({
          correlation_id: "corr-composite",
          contract_version: "composite-performance-gateway.v1",
          source_service: "lotus-performance",
          upstream_status: 200,
          data: {
            composite_id: "PB_GLOBAL_BALANCED_USD",
            verdict: "supportable_with_warnings",
            artifacts: [{ artifact_name: "member_inputs.csv" }],
          },
        }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      )
    );
    vi.stubGlobal("fetch", fetchMock);

    const response = await inspectCompositePerformanceClient({
      inspection_id: "insp-1",
      composite_id: "PB_GLOBAL_BALANCED_USD",
      period_start: "2026-01-01",
      period_end: "2026-03-31",
    });

    expect(response.data.verdict).toBe("supportable_with_warnings");
    const [requestedUrl, requestInit] = fetchMock.mock.calls[0] as unknown as [
      string,
      RequestInit,
    ];
    expect(requestedUrl).toBe(
      `${expectedBaseUrl}/performance/composites/inspect`
    );
    expect(JSON.parse(requestInit.body as string)).toEqual({
      inspection_id: "insp-1",
      composite_id: "PB_GLOBAL_BALANCED_USD",
      period_start: "2026-01-01",
      period_end: "2026-03-31",
    });
    expect(getAnalyticsUiMetricEvents()[0]).toEqual(
      expect.objectContaining({
        metric_name: "lotus_workbench_api_request_duration_seconds",
        labels: expect.objectContaining({
          route: "workbench.performance",
          panel: "performance-composite-inspection",
          operation: "performance.composites.inspect",
          status_class: "2xx",
        }),
      })
    );
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
      asOfDate: "2026-02-24",
      reportingCurrency: "USD",
    });

    const requestedUrl = (global.fetch as unknown as ReturnType<typeof vi.fn>).mock.calls[0][0].toString();
    expect(requestedUrl).toContain(
      "/api/bff/api/v1/workbench/PF_1001/performance/summary?period=3Y&chart_frequency=monthly&contribution_dimension=asset_class&attribution_dimension=asset_class&detail_basis=NET&benchmark_code=BMK_GLOBAL_BALANCED_60_40&as_of_date=2026-02-24&reporting_currency=USD"
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
      asOfDate: "2026-02-24",
      reportingCurrency: "USD",
    });

    const requestedUrl = (global.fetch as unknown as ReturnType<typeof vi.fn>).mock.calls[0][0].toString();
    expect(requestedUrl).toContain(
      "/api/bff/api/v1/workbench/PF_1001/performance/details?period=3Y&chart_frequency=monthly&contribution_dimension=asset_class&attribution_dimension=asset_class&detail_basis=NET&benchmark_code=BMK_GLOBAL_BALANCED_60_40&as_of_date=2026-02-24&reporting_currency=USD"
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
      asOfDate: "2026-02-24",
      reportingCurrency: "SGD",
    });

    const requestedUrl = (global.fetch as unknown as ReturnType<typeof vi.fn>).mock.calls[0][0].toString();
    expect(requestedUrl).toContain(
      "/api/bff/api/v1/workbench/PF_1001/performance/horizon-comparison?period=EXPLICIT&detail_basis=NET&chart_frequency=monthly&benchmark_code=BMK_GLOBAL_BALANCED_60_40&report_start_date=2026-01-01&report_end_date=2026-02-24&as_of_date=2026-02-24&reporting_currency=SGD"
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

  it("preserves Gateway-owned mandate comparison evidence on risk reads", async () => {
    const mandateComparison = {
      mandate_id: "MANDATE_PB_SG_GLOBAL_BAL_001",
      mandate_version: "3",
      mandate_as_of_date: "2026-02-24",
      risk_profile: "BALANCED",
      comparison_as_of_date: "2026-02-24",
      mandate_health_as_of_date: "2026-02-24",
      date_alignment_state: "aligned",
      constraints: [
        {
          key: "cash_band",
          label: "Cash allocation",
          limit: {
            minimum: 0.02,
            maximum: 0.1,
            unit: "ratio",
            source_service: "lotus-manage",
          },
          measure: {
            value: 0.0859,
            unit: "ratio",
            basis: "total_market_value_base",
            as_of_date: "2026-02-24",
            source_service: "lotus-core",
            source_metric: "cash_weight",
          },
          headroom: 0.0141,
          state: "within",
          reason: "Cash allocation is within the approved mandate band.",
          source_state: "READY",
          source_reason_code: "CASH_LIQUIDITY_READY",
        },
      ],
      review_policy: {
        review_frequency: null,
        last_review_date: "2025-12-31",
        next_review_due_date: "2026-03-31",
        state: "scheduled",
      },
      source_lineage: [],
      supportability: {
        state: "ready",
        reason: null,
        source_service: "lotus-manage",
      },
    } as const;
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        new Response(
          JSON.stringify({
            correlation_id: "corr-risk-mandate",
            contract_version: "risk-workspace.v1",
            portfolio_id: "PF_1001",
            period: "YTD",
            detail_basis: "NET",
            as_of_date: "2026-02-24",
            source_service: "lotus-risk",
            state: "ready",
            mandate_comparison: mandateComparison,
            payload: { periods: [] },
            supportability: [],
            warnings: [],
            partial_failures: [],
            metadata: {
              generated_at: "2026-02-24T01:00:00Z",
              input_mode: "stateful",
            },
          }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        )
      )
    );

    const response = await getWorkbenchRiskSummaryClient("PF_1001", {
      period: "YTD",
      detailBasis: "NET",
      asOfDate: "2026-02-24",
    });

    expect(response.mandate_comparison).toEqual(mandateComparison);
    expect(response.mandate_comparison?.constraints[0]).toMatchObject({
      state: "within",
      headroom: 0.0141,
      measure: { value: 0.0859 },
      limit: { minimum: 0.02, maximum: 0.1 },
    });
    expect(response.mandate_comparison?.review_policy).toMatchObject({
      review_frequency: null,
      state: "scheduled",
    });
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

  it("passes explicit risk review windows to gateway-backed risk modules", async () => {
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

    const explicitParams = {
      period: "EXPLICIT",
      detailBasis: "NET",
      benchmark: "BMK_GLOBAL_BALANCED_60_40",
      reportStartDate: "2026-01-01",
      reportEndDate: "2026-04-10",
      asOfDate: "2026-05-13",
      reportingCurrency: "USD",
    };

    await getWorkbenchRiskSummaryClient("PF_1001", explicitParams);
    await getWorkbenchRiskDrawdownClient("PF_1001", explicitParams);
    await getWorkbenchRiskRollingClient("PF_1001", explicitParams);
    await getWorkbenchRiskAttributionClient("PF_1001", {
      ...explicitParams,
      attributionType: "TOTAL_RISK",
      groupingDimension: "SECTOR",
    });

    const requestedUrls = (global.fetch as unknown as ReturnType<typeof vi.fn>).mock.calls.map(
      ([url]) => url.toString()
    );
    expect(requestedUrls).toEqual([
      "/api/bff/api/v1/workbench/PF_1001/risk/summary?period=EXPLICIT&detail_basis=NET&benchmark_code=BMK_GLOBAL_BALANCED_60_40&report_start_date=2026-01-01&report_end_date=2026-04-10&as_of_date=2026-05-13&reporting_currency=USD",
      "/api/bff/api/v1/workbench/PF_1001/risk/drawdown?period=EXPLICIT&detail_basis=NET&benchmark_code=BMK_GLOBAL_BALANCED_60_40&report_start_date=2026-01-01&report_end_date=2026-04-10&as_of_date=2026-05-13&reporting_currency=USD",
      "/api/bff/api/v1/workbench/PF_1001/risk/rolling?period=EXPLICIT&detail_basis=NET&benchmark_code=BMK_GLOBAL_BALANCED_60_40&report_start_date=2026-01-01&report_end_date=2026-04-10&as_of_date=2026-05-13&reporting_currency=USD",
      "/api/bff/api/v1/workbench/PF_1001/risk/attribution?period=EXPLICIT&detail_basis=NET&benchmark_code=BMK_GLOBAL_BALANCED_60_40&report_start_date=2026-01-01&report_end_date=2026-04-10&as_of_date=2026-05-13&reporting_currency=USD&attribution_type=TOTAL_RISK&grouping_dimension=SECTOR",
    ]);
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
      asOfDate: "2026-02-24",
      reportingCurrency: "USD",
    });

    const requestedUrl = (global.fetch as unknown as ReturnType<typeof vi.fn>).mock.calls[0][0].toString();
    expect(requestedUrl).toContain(
      "/api/bff/api/v1/workbench/PF_1001/performance/attribution-trend?period=YTD&chart_frequency=monthly&attribution_dimension=asset_class&detail_basis=NET&benchmark_code=BMK_GLOBAL_BALANCED_60_40&report_start_date=2026-01-01&report_end_date=2026-02-24&as_of_date=2026-02-24&reporting_currency=USD"
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
      asOfDate: "2026-02-24",
      reportingCurrency: "USD",
    });

    const requestedUrl = (global.fetch as unknown as ReturnType<typeof vi.fn>).mock.calls[0][0].toString();
    expect(requestedUrl).toContain(
      "/api/bff/api/v1/workbench/PF_1001/performance/advisor-brief?period=YTD&chart_frequency=monthly&contribution_dimension=asset_class&attribution_dimension=asset_class&detail_basis=NET&benchmark_code=BMK_GLOBAL_BALANCED_60_40&report_start_date=2026-01-01&report_end_date=2026-02-24&as_of_date=2026-02-24&reporting_currency=USD"
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
        asOfDate: "2026-02-24",
        reportingCurrency: "USD",
      },
      {
        action_type: "ACCEPT",
        reviewed_by: "advisor_1",
        reason: "Advisor brief accepted for bounded downstream workflow use.",
      }
    );

    const fetchMock = global.fetch as unknown as ReturnType<typeof vi.fn>;
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/bff/api/v1/workbench/PF_1001/performance/advisor-brief/review-actions?period=YTD&chart_frequency=monthly&contribution_dimension=asset_class&attribution_dimension=asset_class&detail_basis=NET&benchmark_code=BMK_GLOBAL_BALANCED_60_40&report_start_date=2026-01-01&report_end_date=2026-02-24&as_of_date=2026-02-24&reporting_currency=USD",
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

  it("loads DPM mandate command-center cockpit data through Gateway filters", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        new Response(
          JSON.stringify({
            correlation_id: "corr-rfc38",
            contract_version: "v1",
            source_service: "lotus-manage",
            upstream_status: 200,
            supportability: {
              source_service: "lotus-manage",
              authority: "lotus-manage:RFC-0038",
              state: "PARTIAL",
              data_completeness_state: "PARTIAL",
              partial_readiness_reasons: ["PM_BOOK_DISCOVERY_NOT_AVAILABLE"],
              source_run_id: "dmr_1",
            },
            data: { evaluated_mandates: 4 },
          }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        )
      )
    );

    await getDpmCommandCenter({
      tenantId: "default",
      portfolioManagerId: "PM_SG_DPM_001",
      bookId: "BOOK_SG_BALANCED_DPM",
      asOfDate: "2026-05-03",
      healthState: "PENDING_REVIEW",
      limit: 25,
    });

    const requestedUrl = (global.fetch as unknown as ReturnType<typeof vi.fn>).mock.calls[0][0].toString();
    expect(requestedUrl).toContain(
      "/api/v1/dpm/command-center?tenant_id=default&portfolio_manager_id=PM_SG_DPM_001&book_id=BOOK_SG_BALANCED_DPM&as_of_date=2026-05-03&limit=25&health_state=PENDING_REVIEW"
    );
    const metricEventsJson = JSON.stringify(getAnalyticsUiMetricEvents());
    expect(metricEventsJson).toContain("mandate-command-center");
    expect(metricEventsJson).not.toContain("PM_SG_DPM_001");
    expect(metricEventsJson).not.toContain("dmr_1");
  });

  it("loads DPM command-center exceptions and mandate drill-down through Gateway", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        new Response(
          JSON.stringify({
            correlation_id: "corr-command-drill",
            contract_version: "v1",
            source_service: "lotus-manage",
            upstream_status: 200,
            supportability: {
              source_service: "lotus-manage",
              authority: "lotus-manage:RFC-0038",
              state: "UNKNOWN",
              partial_readiness_reasons: [],
            },
            data: {},
          }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        )
      )
    );

    await getDpmCommandCenterExceptions({
      tenantId: "default",
      portfolioManagerId: "PM_SG_DPM_001",
      portfolioId: "PB_SG_GLOBAL_BAL_001",
      state: "ACTIVE",
      limit: 25,
    });
    await getDpmCommandCenterExceptions(
      {
        tenantId: "default",
        portfolioManagerId: "PM_SG_DPM_001",
        portfolioId: "PB_SG_GLOBAL_BAL_001",
        state: "ACTIVE",
        limit: 25,
        cursor: "exception-window-2",
      },
      "client"
    );
    await getDpmMandateByPortfolio("PB_SG_GLOBAL_BAL_001");
    await getDpmMandateHealth("MANDATE_PB_SG_GLOBAL_BAL_001");

    const fetchMock = global.fetch as unknown as ReturnType<typeof vi.fn>;
    expect(fetchMock.mock.calls[0][0].toString()).toContain(
      "/api/v1/dpm/command-center/exceptions?tenant_id=default&portfolio_manager_id=PM_SG_DPM_001&limit=25&portfolio_id=PB_SG_GLOBAL_BAL_001&state=ACTIVE"
    );
    expect(fetchMock.mock.calls[1][0]).toBe(
      "/api/bff/api/v1/dpm/command-center/exceptions?tenant_id=default&portfolio_manager_id=PM_SG_DPM_001&limit=25&portfolio_id=PB_SG_GLOBAL_BAL_001&state=ACTIVE&cursor=exception-window-2"
    );
    expect(fetchMock.mock.calls[2][0]).toBe(
      `${resolveGatewayBaseUrl()}/api/v1/dpm/command-center/mandates/by-portfolio/PB_SG_GLOBAL_BAL_001`
    );
    expect(fetchMock.mock.calls[3][0]).toBe(
      `${resolveGatewayBaseUrl()}/api/v1/dpm/command-center/mandates/MANDATE_PB_SG_GLOBAL_BAL_001/health`
    );
    const metricEventsJson = JSON.stringify(getAnalyticsUiMetricEvents());
    expect(metricEventsJson).toContain("mandate-command-center-exceptions");
    expect(metricEventsJson).toContain("mandate-command-center-mandate");
    expect(metricEventsJson).toContain("mandate-command-center-health");
    expect(metricEventsJson).not.toContain("PB_SG_GLOBAL_BAL_001");
    expect(metricEventsJson).not.toContain("MANDATE_PB_SG_GLOBAL_BAL_001");
  });

  it("loads DPM portfolio memory through Gateway without leaking portfolio identifiers into metrics", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        new Response(
          JSON.stringify({
            correlation_id: "corr-memory",
            contract_version: "v1",
            source_service: "lotus-manage",
            upstream_status: 200,
            supportability: {
              source_service: "lotus-manage",
              authority: "lotus-manage:RFC-0040/RFC-0041/RFC-0042",
              state: "READY",
              event_count: 1,
              event_type_counts: { OUTCOME_REVIEW_CREATED: 1 },
              source_systems: ["lotus-manage"],
              reason_codes: ["SOURCE_READY"],
              content_hash: "sha256:portfolio-memory",
            },
            data: {
              portfolio_id: "PB_SG_GLOBAL_BAL_001",
              events: [{ event_id: "memory:or_1", event_type: "OUTCOME_REVIEW_CREATED" }],
            },
          }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        )
      )
    );

    await getDpmPortfolioMemory({
      portfolioId: "PB_SG_GLOBAL_BAL_001",
      limit: 100,
    });

    const requestedUrl = (global.fetch as unknown as ReturnType<typeof vi.fn>).mock.calls[0][0].toString();
    expect(requestedUrl).toContain(
      "/api/v1/dpm/command-center/portfolios/PB_SG_GLOBAL_BAL_001/memory?limit=100"
    );
    const metricEventsJson = JSON.stringify(getAnalyticsUiMetricEvents());
    expect(metricEventsJson).toContain("portfolio-memory");
    expect(metricEventsJson).not.toContain("PB_SG_GLOBAL_BAL_001");
    expect(metricEventsJson).not.toContain("sha256:portfolio-memory");
  });

  it("loads DPM rebalance waves through Gateway without leaking wave identifiers into metrics", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        new Response(
          JSON.stringify({
            correlation_id: "corr-wave-list",
            contract_version: "v1",
            source_service: "lotus-manage",
            upstream_status: 200,
            supportability: {
              source_service: "lotus-manage",
              authority: "lotus-manage:RFC-0041",
              state: "ready",
              reason_codes: ["wave_supportability_ready"],
              blocked_actions: [],
              wave_id: "dwv_001",
              wave_state: "HANDOFF_READY",
              item_count: 1,
              issue_count: 0,
            },
            data: { items: [{ wave_id: "dwv_001", state: "HANDOFF_READY" }] },
          }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        )
      )
    );

    await listDpmWaves({
      triggerType: "EXPLICIT_PORTFOLIO_LIST",
      asOfDate: "2026-05-03",
      supportabilityState: "ready",
      limit: 10,
      offset: 0,
    });

    const requestedUrl = (global.fetch as unknown as ReturnType<typeof vi.fn>).mock.calls[0][0].toString();
    expect(requestedUrl).toContain(
      "/api/v1/dpm/command-center/waves?trigger_type=EXPLICIT_PORTFOLIO_LIST&as_of_date=2026-05-03&limit=10&offset=0&supportability_state=ready"
    );
    const metricEventsJson = JSON.stringify(getAnalyticsUiMetricEvents());
    expect(metricEventsJson).toContain("wave-list");
    expect(metricEventsJson).not.toContain("dwv_001");
  });

  it("loads DPM campaign definitions through the Gateway BFF without leaking campaign identifiers into metrics", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        new Response(
          JSON.stringify({
            correlation_id: "corr-campaign",
            contract_version: "v1",
            source_service: "lotus-manage",
            upstream_status: 200,
            data: {
              items: [
                {
                  campaign_id: "campaign-holdings-202605",
                  campaign_version: "2026.05",
                  product_name: "BulkReviewCampaignDefinition",
                  status: "ACTIVE",
                },
              ],
              limit: 10,
              offset: 0,
              count: 1,
            },
          }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        )
      )
    );

    await listDpmCampaignDefinitions(
      {
        campaignStatus: "ACTIVE",
        limit: 10,
        offset: 0,
      },
      "client",
    );

    const requestedUrl = (global.fetch as unknown as ReturnType<typeof vi.fn>).mock.calls[0][0].toString();
    expect(requestedUrl).toContain(
      "/api/v1/dpm/command-center/waves/campaign-definitions?limit=10&offset=0&campaign_status=ACTIVE"
    );
    expect(requestedUrl).toContain("/api/bff/api/v1/");
    const metricEventsJson = JSON.stringify(getAnalyticsUiMetricEvents());
    expect(metricEventsJson).toContain("wave-campaign-definitions");
    expect(metricEventsJson).not.toContain("campaign-holdings-202605");
    expect(metricEventsJson).not.toContain("corr-campaign");
  });

  it("loads one exact DPM campaign version through the Gateway BFF", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        new Response(
          JSON.stringify({
            correlation_id: "corr-campaign-version",
            contract_version: "v1",
            source_service: "lotus-manage",
            upstream_status: 200,
            data: {
              campaign_id: "campaign-holdings/202605",
              campaign_version: "2026.05 final",
              status: "SUPERSEDED",
            },
          }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        ),
      ),
    );

    await getDpmCampaignDefinition(
      {
        campaignId: "campaign-holdings/202605",
        campaignVersion: "2026.05 final",
      },
      "client",
    );

    const requestedUrl = (
      global.fetch as unknown as ReturnType<typeof vi.fn>
    ).mock.calls[0][0].toString();
    expect(requestedUrl).toContain(
      "/api/bff/api/v1/dpm/command-center/waves/campaign-definitions/campaign-holdings%2F202605/versions/2026.05%20final",
    );
    expect(JSON.stringify(getAnalyticsUiMetricEvents())).not.toContain(
      "campaign-holdings/202605",
    );
  });

  it("loads DPM campaign discovery through the Gateway BFF without leaking campaign identifiers into metrics", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        new Response(
          JSON.stringify({
            correlation_id: "corr-campaign-discovery",
            contract_version: "v1",
            source_service: "lotus-manage",
            upstream_status: 200,
            data: {
              items: [
                {
                  product_name: "BulkReviewCampaignDiscovery",
                  product_version: "v1",
                  campaign_id: "campaign-holdings-202605",
                  campaign_version: "2026.05",
                  campaign_status: "ACTIVE",
                  candidate_count: 12,
                  eligible_candidate_count: 10,
                },
              ],
              limit: 10,
              offset: 0,
              count: 1,
            },
          }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        )
      )
    );

    await listDpmCampaignDiscovery({
      campaignStatus: "ACTIVE",
      activeOn: "2026-05-16",
      includeExpired: false,
      limit: 10,
      offset: 0,
    });

    const requestedUrl = (global.fetch as unknown as ReturnType<typeof vi.fn>).mock.calls[0][0].toString();
    expect(requestedUrl).toContain(
      "/api/v1/dpm/command-center/waves/campaign-discovery?limit=10&offset=0&campaign_status=ACTIVE&active_on=2026-05-16&include_expired=false"
    );
    const metricEventsJson = JSON.stringify(getAnalyticsUiMetricEvents());
    expect(metricEventsJson).toContain("wave-campaign-discovery");
    expect(metricEventsJson).not.toContain("campaign-holdings-202605");
    expect(metricEventsJson).not.toContain("corr-campaign-discovery");
  });

  it("loads DPM campaign workflow audit surfaces through Gateway without leaking campaign identifiers into metrics", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        new Response(
          JSON.stringify({
            correlation_id: "corr-campaign-workflow-audit",
            contract_version: "v1",
            source_service: "lotus-manage",
            upstream_status: 200,
            supportability: {
              source_service: "lotus-manage",
              authority: "lotus-manage:campaign-workflow",
              state: "READY",
              reason_codes: ["MANAGE_SOURCE_BACKED"],
            },
            data: {
              items: [
                {
                  campaign_id: "campaign-holdings-202605",
                  campaign_version: "2026.05",
                  task_ref: "task-sensitive-001",
                  status: "READY",
                  reason_codes: ["ASSIGNMENT_TASK_RECORDED"],
                  source_refs: [{ source_type: "BulkReviewAssignmentTask" }],
                  content_hash: "sha256:workflow",
                  operating_boundaries: ["NO_ORDER_GENERATION", "NO_OMS_EXECUTION_CLAIM"],
                },
              ],
              limit: 10,
              offset: 0,
              count: 1,
              total_count: 1,
            },
          }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        )
      )
    );

    await listDpmCampaignOperatingQueue({ campaignId: "campaign-holdings-202605", limit: 10 });
    await listDpmCampaignApprovalInbox({ limit: 10 });
    await listDpmCampaignWorkflowBoard({ limit: 10 });
    await listDpmCampaignAssignmentPlan({ limit: 10 });
    await listDpmCampaignWorkflowAutomation({ limit: 10 });
    await getDpmCampaignApprovalDecisions({
      campaignId: "campaign-holdings-202605",
      campaignVersion: "2026.05",
    }, "client");
    await getDpmCampaignAssignmentActions({
      campaignId: "campaign-holdings-202605",
      campaignVersion: "2026.05",
    }, "client");
    await getDpmCampaignAssignmentTasks({
      campaignId: "campaign-holdings-202605",
      campaignVersion: "2026.05",
    }, "client");
    await getDpmCampaignMakerCheckerControls({
      campaignId: "campaign-holdings-202605",
      campaignVersion: "2026.05",
    }, "client");

    const calls = (global.fetch as unknown as ReturnType<typeof vi.fn>).mock.calls.map((call) =>
      call[0].toString()
    );
    expect(calls).toEqual(
      expect.arrayContaining([
        expect.stringContaining("/api/v1/dpm/command-center/waves/campaign-operating-queue"),
        expect.stringContaining("/api/v1/dpm/command-center/waves/campaign-approval-inbox"),
        expect.stringContaining("/api/v1/dpm/command-center/waves/campaign-workflow-board"),
        expect.stringContaining("/api/v1/dpm/command-center/waves/campaign-assignment-plan"),
        expect.stringContaining("/api/v1/dpm/command-center/waves/campaign-workflow-automation"),
        expect.stringContaining("/approval-decisions?limit=10&offset=0"),
        expect.stringContaining("/assignment-actions?limit=10&offset=0"),
        expect.stringContaining("/assignment-tasks?limit=10&offset=0"),
        expect.stringContaining("/maker-checker-controls?limit=10&offset=0"),
      ])
    );
    expect(calls.slice(5).every((url) => url.includes("/api/bff/api/v1/"))).toBe(true);
    const metricEventsJson = JSON.stringify(getAnalyticsUiMetricEvents());
    expect(metricEventsJson).toContain("wave-campaign-operating-queue");
    expect(metricEventsJson).toContain("wave-campaign-maker-checker-controls");
    expect(metricEventsJson).not.toContain("campaign-holdings-202605");
    expect(metricEventsJson).not.toContain("corr-campaign-workflow-audit");
    expect(metricEventsJson).not.toContain("task-sensitive-001");
  });

  it("records DPM campaign workflow evidence through Gateway mutation helpers without leaking ids into metrics", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (_input: RequestInfo | URL, init?: RequestInit) =>
        new Response(
          JSON.stringify({
            correlation_id: "corr-campaign-workflow-command",
            contract_version: "v1",
            source_service: "lotus-manage",
            upstream_status: 201,
            supportability: {
              source_service: "lotus-manage",
              authority: "lotus-manage:campaign-workflow",
              state: "READY",
              reason_codes: ["campaign_workflow_command_recorded"],
            },
            data: {
              task_ref: "task-sensitive-001",
              content_hash: "sha256:workflow-command",
              reason_codes: ["campaign_workflow_command_recorded"],
              operating_boundaries: ["NO_ORDER_GENERATION", "NO_OMS_EXECUTION_CLAIM"],
              request_body: init?.body,
            },
          }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        )
      )
    );

    await createDpmCampaignApprovalDecision({
      campaignId: "campaign-holdings-202605",
      campaignVersion: "2026.05",
      actorId: "pm_sg_1",
      body: {
        decision_type: "APPROVED",
        decision_ref: "decision-sensitive-001",
        decided_by: "pm_sg_1",
        decision_reason: "The source evidence is complete.",
        correlation_id: "corr-approval",
      },
    });
    await createDpmCampaignAssignmentAction({
      campaignId: "campaign-holdings-202605",
      campaignVersion: "2026.05",
      body: {
        action_type: "ASSIGNED",
        action_ref: "action-sensitive-001",
        recorded_by: "pm_sg_1",
        action_reason: "Assign the campaign review to the responsible PM.",
        assigned_actor_ids: ["pm_sg_2"],
        escalation_tier: "PM",
        sla_posture: "ON_TRACK",
        correlation_id: "corr-assignment",
      },
    });
    await createDpmCampaignAssignmentTask({
      campaignId: "campaign-holdings-202605",
      campaignVersion: "2026.05",
      body: {
        task_ref: "task-sensitive-001",
        task_type: "ASSIGNMENT",
        opened_by: "pm_sg_1",
        task_reason: "PM acknowledgement is required.",
        assigned_actor_ids: ["pm_sg_2"],
        escalation_tier: "PM",
        sla_posture: "ON_TRACK",
        correlation_id: "corr-task",
      },
    });
    await createDpmCampaignAssignmentTaskTransition({
      campaignId: "campaign-holdings-202605",
      campaignVersion: "2026.05",
      taskRef: "task-sensitive-001",
      body: {
        transition_type: "ACKNOWLEDGED",
        transition_ref: "task-sensitive-001:acknowledged",
        transitioned_by: "pm_sg_1",
        transition_reason: "The PM acknowledged the campaign review task.",
        correlation_id: "corr-transition",
      },
    });
    await createDpmCampaignMakerCheckerControl({
      campaignId: "campaign-holdings-202605",
      campaignVersion: "2026.05",
      body: {
        control_action: "REVIEW_COMPLETED",
        control_ref: "control-sensitive-001",
        recorded_by: "pm_sg_1",
        submitter_actor_id: "pm_sg_1",
        reviewer_actor_id: "governance_sg_1",
        control_outcome: "PASSED",
        control_reason: "Independent review completed.",
        correlation_id: "corr-control",
      },
    });

    const fetchMock = global.fetch as unknown as ReturnType<typeof vi.fn>;
    const calls = fetchMock.mock.calls.map((call) => ({
      url: call[0].toString(),
      body: JSON.parse(String(call[1]?.body)),
    }));
    expect(calls).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          url: expect.stringContaining("/approval-decisions"),
          body: { body: expect.objectContaining({ decision_type: "APPROVED", decided_by: "pm_sg_1" }) },
        }),
        expect.objectContaining({
          url: expect.stringContaining("/assignment-actions"),
          body: { body: expect.objectContaining({ action_type: "ASSIGNED", recorded_by: "pm_sg_1" }) },
        }),
        expect.objectContaining({
          url: expect.stringContaining("/assignment-tasks"),
          body: { body: expect.objectContaining({ task_ref: "task-sensitive-001", opened_by: "pm_sg_1" }) },
        }),
        expect.objectContaining({
          url: expect.stringContaining("/assignment-tasks/task-sensitive-001/transitions"),
          body: {
            body: expect.objectContaining({ transition_type: "ACKNOWLEDGED", transitioned_by: "pm_sg_1" }),
          },
        }),
        expect.objectContaining({
          url: expect.stringContaining("/maker-checker-controls"),
          body: { body: expect.objectContaining({ control_action: "REVIEW_COMPLETED", recorded_by: "pm_sg_1" }) },
        }),
      ])
    );
    const metricEventsJson = JSON.stringify(getAnalyticsUiMetricEvents());
    expect(metricEventsJson).toContain("wave-campaign-approval-decisions-create");
    expect(metricEventsJson).toContain("wave-campaign-assignment-task-transitions-create");
    expect(metricEventsJson).toContain("wave-campaign-maker-checker-controls-create");
    expect(metricEventsJson).not.toContain("campaign-holdings-202605");
    expect(metricEventsJson).not.toContain("task-sensitive-001");
    expect(metricEventsJson).not.toContain("corr-campaign-workflow-command");
  });

  it("loads DPM campaign-definition lifecycle and launch-history evidence through the Gateway BFF without leaking campaign identifiers into metrics", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL) => {
        const url = input.toString();
        const payload = url.includes("/launch-history")
          ? {
              correlation_id: "corr-campaign-launch-history",
              contract_version: "v1",
              source_service: "lotus-manage",
              upstream_status: 200,
              data: {
                campaign_id: "campaign-holdings-202605",
                campaign_version: "2026.05",
                product_name: "BulkReviewCampaignDefinitionLaunchHistory",
                items: [
                  {
                    wave_id: "dwv_campaign_launch_001",
                    launched_at: "2026-05-16T00:00:00Z",
                    launched_by: "pm_sg_1",
                    requested_as_of_date: "2026-05-16",
                    correlation_id: "corr-launch-audit",
                    idempotency_key: "idem-launch-audit",
                  },
                ],
                count: 1,
                total_count: 1,
                limit: 10,
                offset: 0,
                operating_boundaries: ["NO_ORDER_GENERATION", "NO_OMS_EXECUTION_CLAIM"],
              },
            }
          : {
              correlation_id: "corr-campaign-lifecycle",
              contract_version: "v1",
              source_service: "lotus-manage",
              upstream_status: 200,
              data: {
                campaign_id: "campaign-holdings-202605",
                campaign_version: "2026.05",
                events: [
                  {
                    event_type: "LAUNCHED",
                    actor_id: "pm_sg_1",
                    occurred_at: "2026-05-14T09:30:00Z",
                    status: "RECORDED",
                    wave_id: "dwv_campaign_launch_001",
                    requested_as_of_date: "2026-05-16",
                    correlation_id: "corr-launch-audit",
                    idempotency_key: "idem-launch-audit",
                  },
                ],
              },
            };
        return new Response(JSON.stringify(payload), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      })
    );

    await getDpmCampaignDefinitionLifecycleEvents({
      campaignId: "campaign-holdings-202605",
      campaignVersion: "2026.05",
    });
    await getDpmCampaignDefinitionLaunchHistory({
      campaignId: "campaign-holdings-202605",
      campaignVersion: "2026.05",
      limit: 10,
      offset: 0,
    });

    const requestedUrl = (global.fetch as unknown as ReturnType<typeof vi.fn>).mock.calls[0][0].toString();
    expect(requestedUrl).toContain(
      "/api/v1/dpm/command-center/waves/campaign-definitions/campaign-holdings-202605/versions/2026.05/lifecycle-events"
    );
    expect(requestedUrl).toContain("/api/bff/api/v1/");
    const launchHistoryUrl = (global.fetch as unknown as ReturnType<typeof vi.fn>).mock.calls[1][0].toString();
    expect(launchHistoryUrl).toContain(
      "/api/v1/dpm/command-center/waves/campaign-definitions/campaign-holdings-202605/versions/2026.05/launch-history"
    );
    expect(launchHistoryUrl).toContain("/api/bff/api/v1/");
    expect(launchHistoryUrl).toContain("limit=10");
    expect(launchHistoryUrl).toContain("offset=0");
    const metricEventsJson = JSON.stringify(getAnalyticsUiMetricEvents());
    expect(metricEventsJson).toContain("wave-campaign-lifecycle");
    expect(metricEventsJson).toContain("wave-campaign-launch-history");
    expect(metricEventsJson).not.toContain("campaign-holdings-202605");
    expect(metricEventsJson).not.toContain("corr-campaign-lifecycle");
    expect(metricEventsJson).not.toContain("corr-campaign-launch-history");
    expect(metricEventsJson).not.toContain("corr-launch-audit");
  });

  it("checks campaign-definition preview readiness through the Gateway BFF", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        new Response(
          JSON.stringify({
            correlation_id: "corr-campaign-preview-readiness",
            contract_version: "v1",
            source_service: "lotus-manage",
            upstream_status: 200,
            data: {
              product_name: "BulkReviewCampaignDefinitionPreviewReadiness",
              supportability_state: "BLOCKED",
              reason_codes: ["campaign_definition_actor_not_entitled"],
              blocked_actions: ["preview_wave", "create_wave"],
              operating_boundaries: ["NO_ORDER_GENERATION", "NO_OMS_EXECUTION_CLAIM"],
            },
          }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        )
      )
    );

    await getDpmCampaignDefinitionPreviewReadiness({
      campaignId: "campaign-holdings-202605",
      campaignVersion: "2026.05",
      requestedAsOfDate: "2026-05-10",
      actorId: "pm_sg_1",
    });

    const fetchMock = global.fetch as unknown as ReturnType<typeof vi.fn>;
    expect(fetchMock.mock.calls[0][0].toString()).toContain(
      "/api/v1/dpm/command-center/waves/campaign-definitions/campaign-holdings-202605/versions/2026.05/preview-readiness?requested_as_of_date=2026-05-10&actor_id=pm_sg_1"
    );
    const metricEventsJson = JSON.stringify(getAnalyticsUiMetricEvents());
    expect(metricEventsJson).toContain("wave-campaign-preview-readiness");
    expect(metricEventsJson).not.toContain("campaign-holdings-202605");
    expect(metricEventsJson).not.toContain("corr-campaign-preview-readiness");
  });

  it("checks and launches DPM campaign definitions through the Gateway BFF", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        new Response(
          JSON.stringify({
            correlation_id: "corr-campaign-launch",
            contract_version: "v1",
            source_service: "lotus-manage",
            upstream_status: 200,
            supportability: {
              source_service: "lotus-manage",
              authority: "lotus-manage:RFC-0041",
              state: "ready",
              reason_codes: [],
              blocked_actions: [],
              wave_id: "dwv_campaign_launch_001",
              wave_state: "CREATED",
              item_count: 12,
              issue_count: 0,
            },
            data: {
              product_name: "BulkReviewCampaignDefinitionLaunchPackage",
              launch_state: "READY",
              wave: { wave_id: "dwv_campaign_launch_001", state: "CREATED" },
            },
          }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        )
      )
    );

    await getDpmCampaignDefinitionLaunchPackage({
      campaignId: "campaign-holdings-202605",
      campaignVersion: "2026.05",
      requestedAsOfDate: "2026-05-10",
      actorId: "pm_sg_1",
      correlationId: "corr-launch",
    });
    await launchDpmCampaignDefinition({
      campaignId: "campaign-holdings-202605",
      campaignVersion: "2026.05",
      requestedAsOfDate: "2026-05-10",
      actorId: "pm_sg_1",
      correlationId: "corr-launch",
    });

    const fetchMock = global.fetch as unknown as ReturnType<typeof vi.fn>;
    expect(fetchMock.mock.calls[0][0].toString()).toContain(
      "/api/v1/dpm/command-center/waves/campaign-definitions/campaign-holdings-202605/versions/2026.05/launch-package?requested_as_of_date=2026-05-10&actor_id=pm_sg_1&correlation_id=corr-launch"
    );
    expect(fetchMock.mock.calls[1][0].toString()).toContain(
      "/api/v1/dpm/command-center/waves/campaign-definitions/campaign-holdings-202605/versions/2026.05/launch"
    );
    expect(fetchMock.mock.calls[1][1]?.body).toContain('"requested_as_of_date":"2026-05-10"');
    expect(fetchMock.mock.calls[1][1]?.body).toContain('"actor_id":"pm_sg_1"');
    const metricEventsJson = JSON.stringify(getAnalyticsUiMetricEvents());
    expect(metricEventsJson).toContain("wave-campaign-launch-package");
    expect(metricEventsJson).toContain("wave-campaign-launch");
    expect(metricEventsJson).not.toContain("campaign-holdings-202605");
    expect(metricEventsJson).not.toContain("corr-campaign-launch");
  });

  it("records campaign-definition retire and supersede commands through the Gateway BFF", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        new Response(
          JSON.stringify({
            correlation_id: "corr-campaign-lifecycle-command",
            contract_version: "v1",
            source_service: "lotus-manage",
            upstream_status: 200,
            data: {
              product_name: "BulkReviewCampaignDefinitionLifecycleCommand",
              status: "SUPERSEDED",
              actor_id: "pm_sg_1",
              reason_code: "CAMPAIGN_DEFINITION_REPLACED_BY_SOURCE_REFRESH",
              replacement_campaign_version: "2026.06",
              replacement_content_hash: "sha256:campaign-replacement",
              content_hash: "sha256:campaign-superseded",
              reason_codes: ["campaign_definition_superseded"],
              operating_boundaries: [
                "NO_ORDER_GENERATION",
                "NO_OMS_EXECUTION_CLAIM",
                "NO_EXTERNAL_WORKFLOW_ORCHESTRATION",
              ],
            },
          }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        )
      )
    );

    await retireDpmCampaignDefinition({
      campaignId: "campaign-holdings-202605",
      campaignVersion: "2026.05",
      actorId: "pm_sg_1",
      body: {
        retired_by: "pm_sg_1",
        retirement_reason: "The campaign review cycle is complete.",
        correlation_id: "corr-retire",
      },
    });
    await supersedeDpmCampaignDefinition({
      campaignId: "campaign-holdings-202605",
      campaignVersion: "2026.05",
      actorId: "pm_sg_1",
      body: {
        superseded_by_campaign_version: "2026.06",
        superseded_by: "pm_sg_1",
        supersession_reason: "Candidate evidence was refreshed.",
        correlation_id: "corr-supersede",
      },
    });

    const fetchMock = global.fetch as unknown as ReturnType<typeof vi.fn>;
    expect(fetchMock.mock.calls[0][0].toString()).toContain(
      "/api/v1/dpm/command-center/waves/campaign-definitions/campaign-holdings-202605/versions/2026.05/retire"
    );
    expect(fetchMock.mock.calls[1][0].toString()).toContain(
      "/api/v1/dpm/command-center/waves/campaign-definitions/campaign-holdings-202605/versions/2026.05/supersede"
    );
    expect(fetchMock.mock.calls[1][1]?.body).toContain(
      '"superseded_by_campaign_version":"2026.06"'
    );
    const metricEventsJson = JSON.stringify(getAnalyticsUiMetricEvents());
    expect(metricEventsJson).toContain("wave-campaign-retire");
    expect(metricEventsJson).toContain("wave-campaign-supersede");
    expect(metricEventsJson).not.toContain("campaign-holdings-202605");
    expect(metricEventsJson).not.toContain("corr-campaign-lifecycle-command");
  });

  it("previews, creates, reviews, actions, and inspects DPM waves through Gateway BFF", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        new Response(
          JSON.stringify({
            correlation_id: "corr-wave",
            contract_version: "v1",
            source_service: "lotus-manage",
            upstream_status: 200,
            supportability: {
              source_service: "lotus-manage",
              authority: "lotus-manage:RFC-0041",
              state: "ready",
              reason_codes: ["wave_supportability_ready"],
              blocked_actions: [],
              wave_id: "dwv_001",
              wave_state: "SOURCE_CHECKED",
              item_count: 1,
              issue_count: 0,
            },
            data: { wave: { wave_id: "dwv_001", state: "SOURCE_CHECKED" } },
          }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        )
      )
    );

    await previewDpmWave({ portfolioId: "PB_SG_GLOBAL_BAL_001", actorId: "pm_1" });
    await createDpmWave({ portfolioId: "PB_SG_GLOBAL_BAL_001", actorId: "pm_1" });
    await getDpmWave("dwv_001");
    await getDpmWaveItems("dwv_001");
    await sourceCheckDpmWave("dwv_001");
    await simulateDpmWave("dwv_001");
    await approveDpmWave("dwv_001");
    await stageDpmWave("dwv_001");
    await handoffDpmWave("dwv_001");
    await getDpmWaveProofPackPosture("dwv_001");
    await getDpmWaveSupportability("dwv_001");
    await getDpmWaveReportInput("dwv_001");
    await requestDpmWaveAiPmMemo("dwv_001");
    await requestDpmOperationsHandoffSummary("dwv_001");
    await requestDpmExceptionSummary({
      exceptionId: "me_1",
      mandateId: "MANDATE_PB_SG_GLOBAL_BAL_001",
      state: "ACTIVE",
    });

    const fetchMock = global.fetch as unknown as ReturnType<typeof vi.fn>;
    expect(fetchMock.mock.calls[0][0]).toBe(`${expectedBaseUrl}/dpm/command-center/waves/preview`);
    expect(fetchMock.mock.calls[1][0]).toBe(`${expectedBaseUrl}/dpm/command-center/waves`);
    expect(fetchMock.mock.calls[2][0]).toBe(`${expectedBaseUrl}/dpm/command-center/waves/dwv_001`);
    expect(fetchMock.mock.calls[3][0]).toBe(`${expectedBaseUrl}/dpm/command-center/waves/dwv_001/items`);
    expect(fetchMock.mock.calls[4][0]).toBe(`${expectedBaseUrl}/dpm/command-center/waves/dwv_001/source-check`);
    expect(fetchMock.mock.calls[5][0]).toBe(`${expectedBaseUrl}/dpm/command-center/waves/dwv_001/simulate`);
    expect(fetchMock.mock.calls[6][0]).toBe(`${expectedBaseUrl}/dpm/command-center/waves/dwv_001/approve`);
    expect(fetchMock.mock.calls[7][0]).toBe(`${expectedBaseUrl}/dpm/command-center/waves/dwv_001/stage`);
    expect(fetchMock.mock.calls[8][0]).toBe(`${expectedBaseUrl}/dpm/command-center/waves/dwv_001/handoff`);
    expect(fetchMock.mock.calls[9][0]).toBe(`${expectedBaseUrl}/dpm/command-center/waves/dwv_001/proof-pack`);
    expect(fetchMock.mock.calls[10][0]).toBe(`${expectedBaseUrl}/dpm/command-center/waves/dwv_001/supportability`);
    expect(fetchMock.mock.calls[11][0]).toBe(`${expectedBaseUrl}/dpm/command-center/waves/dwv_001/report-input`);
    expect(fetchMock.mock.calls[12][0]).toBe(`${expectedBaseUrl}/dpm/command-center/waves/dwv_001/ai-pm-memo`);
    expect(fetchMock.mock.calls[13][0]).toBe(
      `${expectedBaseUrl}/dpm/command-center/waves/dwv_001/operations-handoff-summary`
    );
    expect(fetchMock.mock.calls[14][0]).toBe(
      `${expectedBaseUrl}/dpm/command-center/exceptions/me_1/ai-summary`
    );
    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toEqual({
      body: {
        trigger_type: "EXPLICIT_PORTFOLIO_LIST",
        trigger_id: "workbench-wave-PB_SG_GLOBAL_BAL_001-2026-05-03",
        rationale: "Workbench PM requested a Gateway-backed explicit portfolio-list rebalance wave.",
        as_of_date: "2026-05-03",
        actor_id: "pm_1",
        portfolios: [{ portfolio_id: "PB_SG_GLOBAL_BAL_001" }],
      },
    });
    expect(JSON.parse(fetchMock.mock.calls[1][1].body).idempotency_key).toBe(
      "workbench-wave-PB_SG_GLOBAL_BAL_001-2026-05-03"
    );
    expect(JSON.parse(fetchMock.mock.calls[4][1].body).body).toMatchObject({
      actor_id: "workbench-system",
    });
    expect(JSON.parse(fetchMock.mock.calls[5][1].body).body).toMatchObject({
      actor_id: "workbench-system",
      methods: ["DO_NOTHING_BASELINE", "HEURISTIC_EXPLAINABLE", "MIN_TURNOVER"],
    });
    expect(JSON.parse(fetchMock.mock.calls[6][1].body).body).toMatchObject({
      actor_id: "workbench-system",
      reason_code: "PM_APPROVED_AFTER_PROOF_REVIEW",
    });
    expect(JSON.parse(fetchMock.mock.calls[7][1].body).body).toMatchObject({
      actor_id: "workbench-system",
      reason_code: "READY_FOR_INTERNAL_OPERATIONS",
    });
    expect(JSON.parse(fetchMock.mock.calls[8][1].body).body).toMatchObject({
      actor_id: "workbench-system",
      reason_code: "INTERNAL_HANDOFF_READY",
    });
    expect(JSON.parse(fetchMock.mock.calls[12][1].body)).toMatchObject({
      requested_outputs: [
        "wave_pm_memo",
        "wave_rationale_summary",
        "approval_checklist",
        "risk_caveats",
        "operations_handoff",
        "evidence_gaps",
      ],
      audience: ["portfolio_manager", "investment_control", "operations"],
    });
    expect(JSON.parse(fetchMock.mock.calls[13][1].body)).toMatchObject({
      requested_outputs: [
        "operations_summary",
        "execution_prerequisites",
        "blocking_conditions",
        "support_references",
        "evidence_gaps",
      ],
      audience: ["operations", "portfolio_manager", "investment_control"],
    });
    expect(JSON.parse(fetchMock.mock.calls[14][1].body)).toMatchObject({
      mandate_id: "MANDATE_PB_SG_GLOBAL_BAL_001",
      state: "ACTIVE",
      requested_outputs: [
        "exception_summary",
        "severity_summary",
        "recommended_triage",
        "support_references",
        "evidence_gaps",
      ],
      audience: ["portfolio_manager", "investment_control", "operations"],
    });
    const metricEventsJson = JSON.stringify(getAnalyticsUiMetricEvents());
    expect(metricEventsJson).toContain("wave-preview");
    expect(metricEventsJson).toContain("wave-create");
    expect(metricEventsJson).toContain("wave-detail");
    expect(metricEventsJson).toContain("wave-items");
    expect(metricEventsJson).toContain("wave-source-check");
    expect(metricEventsJson).toContain("wave-simulate");
    expect(metricEventsJson).toContain("wave-approve");
    expect(metricEventsJson).toContain("wave-stage");
    expect(metricEventsJson).toContain("wave-handoff");
    expect(metricEventsJson).toContain("wave-proof-pack");
    expect(metricEventsJson).toContain("wave-supportability");
    expect(metricEventsJson).toContain("wave-report-input");
    expect(metricEventsJson).toContain("wave-ai-pm-memo");
    expect(metricEventsJson).toContain("wave-operations-handoff-summary");
    expect(metricEventsJson).toContain("mandate-command-center-exception-ai-summary");
    expect(metricEventsJson).not.toContain("PB_SG_GLOBAL_BAL_001");
    expect(metricEventsJson).not.toContain("dwv_001");
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
      sourceSystem: "lotus-performance",
      sourceType: "PortfolioRealizedTaxSummary:v1",
      sourceScanLimit: 250,
      limit: 5,
      offset: 10,
      cursor: "cursor_1",
    });

    const requestedUrl = (global.fetch as unknown as ReturnType<typeof vi.fn>).mock.calls[0][0].toString();
    expect(requestedUrl).toContain(
      "/api/v1/dpm/command-center/outcome-reviews?portfolio_id=PB_SG_GLOBAL_BAL_001&limit=5&state=READY&source_system=lotus-performance&source_type=PortfolioRealizedTaxSummary%3Av1&source_scan_limit=250&offset=10&cursor=cursor_1"
    );
    const metricEventsJson = JSON.stringify(getAnalyticsUiMetricEvents());
    expect(metricEventsJson).toContain("outcome-review-list");
    expect(metricEventsJson).not.toContain("PB_SG_GLOBAL_BAL_001");
    expect(metricEventsJson).not.toContain("or_1");
  });

  it("loads bounded DPM portfolio-memory source search without leaking source ids into metrics", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        new Response(
          JSON.stringify({
            correlation_id: "corr-memory-search",
            contract_version: "v1",
            source_service: "lotus-manage",
            upstream_status: 200,
            supportability: {
              source_service: "lotus-manage",
              authority: "lotus-manage:RFC-0040/RFC-0041/RFC-0042",
              state: "READY",
              event_count: 1,
              event_type_counts: { OUTCOME_REVIEW_SOURCE_LINEAGE_RECORDED: 1 },
              source_systems: ["lotus-performance"],
              source_system_counts: { "lotus-performance": 1 },
              source_type_counts: { "PortfolioRealizedTaxSummary:v1": 1 },
              reason_codes: ["PERSISTED_LINEAGE_SEARCH_ONLY"],
              content_hash: "sha256:memory-search",
            },
            data: {
              items: [
                {
                  event_id: "memory:tax:PMTAX_001",
                  source_system: "lotus-performance",
                  source_type: "PortfolioRealizedTaxSummary:v1",
                  source_id: "PMTAX_001",
                },
              ],
            },
          }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        )
      )
    );

    await searchDpmPortfolioMemory({
      portfolioIds: ["PB_SG_GLOBAL_BAL_001"],
      sourceSystem: "lotus-performance",
      sourceType: "PortfolioRealizedTaxSummary:v1",
      sourceScanLimit: 250,
      limit: 5,
      offset: 0,
    });

    const requestedUrl = (global.fetch as unknown as ReturnType<typeof vi.fn>).mock.calls[0][0].toString();
    expect(requestedUrl).toContain(
      "/api/v1/dpm/command-center/portfolio-memory/search?portfolio_ids=PB_SG_GLOBAL_BAL_001&source_system=lotus-performance&source_type=PortfolioRealizedTaxSummary%3Av1&limit=5&offset=0&source_scan_limit=250"
    );
    const metricEventsJson = JSON.stringify(getAnalyticsUiMetricEvents());
    expect(metricEventsJson).toContain("dpm.portfolio-memory.search");
    expect(metricEventsJson).not.toContain("PB_SG_GLOBAL_BAL_001");
    expect(metricEventsJson).not.toContain("PMTAX_001");
    expect(metricEventsJson).not.toContain("sha256:memory-search");
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
      idempotencyKey: "workbench-construction-test-idem-1",
    });

    const fetchMock = global.fetch as unknown as ReturnType<typeof vi.fn>;
    expect(fetchMock.mock.calls[0][0]).toBe(
      `${expectedBaseUrl}/dpm/command-center/construction/alternative-sets/generate`
    );
    const options = fetchMock.mock.calls[0][1];
    expect(options.headers["X-Caller-Application"]).toBe("lotus-workbench");
    expect(options.headers["X-Actor-Id"]).toBe("workbench-construction-operator");
    const body = JSON.parse(options.body);
    expect(body.idempotency_key).toBe("workbench-construction-test-idem-1");
    expect(body.body.input_mode).toBe("stateful");
    expect(body.body).not.toHaveProperty("methods");
    expect(body.body.stateful_input.portfolio_id).toBe(
      "PB_SG_GLOBAL_BAL_001"
    );
    expect(body.body.stateful_input.as_of).toBe(
      constructionPortfolio().as_of_date
    );
    expect(body.body.stateful_input.mandate_id).toBe(
      "MANDATE_PB_SG_GLOBAL_BAL_001"
    );
    expect(body.body.stateful_input.model_portfolio_id).toBe(
      "MODEL_PB_SG_GLOBAL_BAL_DPM"
    );
    expect(body.body.stateful_input.tenant_id).toBe("tenant-sg");
    expect(body.body.stateful_input.booking_center_code).toBe("Singapore");
    expect(body.body.stateful_input.include_model_portfolio).toBe(true);
    expect(body.body).not.toHaveProperty("options_override");
    expect(JSON.stringify(body.body)).not.toContain("cash_band");
    expect(JSON.stringify(body.body)).not.toContain("min_trade_notional");
    const metricEventsJson = JSON.stringify(getAnalyticsUiMetricEvents());
    expect(metricEventsJson).toContain("construction-alternatives");
    expect(metricEventsJson).not.toContain("PB_SG_GLOBAL_BAL_001");
    expect(metricEventsJson).not.toContain("cas_1");
  });

  it("uses a fresh DPM construction generation idempotency key for each default request", async () => {
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
            },
            data: { alternative_set_id: "cas_1", alternatives: [] },
          }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        )
      )
    );

    await generateDpmConstructionAlternatives({
      portfolio: constructionPortfolio(),
    });
    await generateDpmConstructionAlternatives({
      portfolio: constructionPortfolio(),
    });

    const fetchMock = global.fetch as unknown as ReturnType<typeof vi.fn>;
    const firstBody = JSON.parse(fetchMock.mock.calls[0][1].body);
    const secondBody = JSON.parse(fetchMock.mock.calls[1][1].body);
    const firstHeaders = fetchMock.mock.calls[0][1].headers;
    const secondHeaders = fetchMock.mock.calls[1][1].headers;
    const constructionContext = constructionPortfolio();
    const operationPrefix = `workbench-construction-${constructionContext.portfolio.portfolio_id}-${constructionContext.as_of_date}-`;
    const correlationPrefix = `corr-${operationPrefix}`;
    expect(firstBody.idempotency_key).toMatch(
      new RegExp(`^${operationPrefix}[0-9a-f-]+$`)
    );
    expect(secondBody.idempotency_key).toMatch(
      new RegExp(`^${operationPrefix}[0-9a-f-]+$`)
    );
    expect(firstBody.idempotency_key).not.toBe(secondBody.idempotency_key);
    expect(firstHeaders["X-Correlation-Id"]).toMatch(
      new RegExp(`^${correlationPrefix}[0-9a-f-]+$`)
    );
    expect(secondHeaders["X-Correlation-Id"]).toMatch(
      new RegExp(`^${correlationPrefix}[0-9a-f-]+$`)
    );
    expect(firstHeaders["X-Correlation-Id"]).not.toBe(
      secondHeaders["X-Correlation-Id"]
    );
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

  it("loads external OMS acknowledgement supportability through the Gateway source-product route", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        new Response(
          JSON.stringify({
            product_name: "ExternalOrderExecutionAcknowledgement",
            product_version: "v1",
            portfolio_id: "PB_SG_GLOBAL_BAL_001",
            order_reference_ids: [],
            acknowledgements: [],
            data_quality_status: "MISSING",
            supportability: {
              state: "UNAVAILABLE",
              reason: "EXTERNAL_OMS_SOURCE_NOT_INGESTED",
              acknowledgement_count: 0,
              missing_data_families: [
                "external_oms_order_execution_acknowledgement",
              ],
              blocked_capabilities: [
                "oms_acknowledgement",
                "fills",
                "settlement",
              ],
            },
            lineage: {
              runtime_posture: "fail_closed",
              integration_status: "not_ingested",
            },
          }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        )
      )
    );

    await getExternalOrderExecutionAcknowledgement({
      portfolio: constructionPortfolio(),
      orderReferenceIds: ["order-ref-001"],
    });

    const fetchMock = global.fetch as unknown as ReturnType<typeof vi.fn>;
    expect(fetchMock.mock.calls[0][0]).toBe(
      `${expectedBaseUrl}/source-products/portfolios/PB_SG_GLOBAL_BAL_001/external-order-execution-acknowledgement`
    );
    const options = fetchMock.mock.calls[0][1];
    const headers = new Headers(options.headers);
    expect(options.method).toBe("POST");
    expect(headers.get("Content-Type")).toBe("application/json");
    expect(headers.get("X-Correlation-Id")).toBe(
      "corr-workbench-execution-acknowledgement-PB_SG_GLOBAL_BAL_001"
    );
    expect(JSON.parse(options.body)).toEqual({
      as_of_date: "2026-02-24",
      tenant_id: "tenant-sg",
      mandate_id: "MANDATE_PB_SG_GLOBAL_BAL_001",
      order_reference_ids: ["order-ref-001"],
    });
    const metricEventsJson = JSON.stringify(getAnalyticsUiMetricEvents());
    expect(metricEventsJson).toContain(
      "source-products.external-order-execution-acknowledgement.get"
    );
    expect(metricEventsJson).toContain("execution-acknowledgement-supportability");
    expect(metricEventsJson).not.toContain("PB_SG_GLOBAL_BAL_001");
  });

  it("uses Gateway PM operating quality routes including fairness-analysis and review-action reads", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        new Response(
          JSON.stringify({
            correlation_id: "corr-pmq",
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
              score_run_id: "pmq_run_001",
              fairness_analysis_id: "pmq_fair_001",
              review_action_id: "pmq_review_001",
              summary_invocation_id: "pmq_summary_001",
            },
            data: { ok: true },
          }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        )
      )
    );

    await listDpmPmOperatingQualityPolicies({ policyId: "pmq_sg_dpm", limit: 3 });
    await listDpmPmOperatingQualityScoreRuns({ bookId: "BOOK_SG_BALANCED_DPM", limit: 4 });
    await listDpmPmOperatingQualityFairnessAnalyses({
      policyId: "pmq_sg_dpm",
      policyVersion: "2026.05",
      limit: 5,
    });
    await getDpmPmOperatingQualityFairnessAnalysis("pmq_fair_001");
    await listDpmPmOperatingQualityReviewActions({
      targetType: "SCORE_RUN",
      targetId: "pmq_run_001",
      policyId: "pmq_sg_dpm",
      limit: 6,
    });
    await getDpmPmOperatingQualityReviewAction("pmq_review_001");
    await listDpmPmOperatingQualitySummaryInvocations({
      scoreRunId: "pmq_run_001",
      reviewActionId: "pmq_review_001",
      policyId: "pmq_sg_dpm",
      invocationState: "PENDING_REVIEW",
      limit: 7,
    });
    await getDpmPmOperatingQualitySummaryInvocation("pmq_summary_001");
    await previewDpmPmOperatingQualityScoreRun({
      pmId: "PM_SG_DPM_001",
      policyId: "pmq_sg_dpm",
      policyVersion: "2026.05",
    });
    await previewDpmPmOperatingQualityFairnessAnalysis({
      policyId: "pmq_sg_dpm",
      policyVersion: "2026.05",
      segments: [
        {
          segment_id: "mandate_balanced",
          segment_type: "MANDATE_TYPE",
          display_name: "Balanced DPM Mandates",
          score_run_ids: ["pmq_run_001"],
        },
        {
          segment_id: "mandate_income",
          segment_type: "MANDATE_TYPE",
          display_name: "Income DPM Mandates",
          score_run_ids: ["pmq_run_002"],
        },
      ],
    });
    await createDpmPmOperatingQualityFairnessAnalysis({
      policyId: "pmq_sg_dpm",
      policyVersion: "2026.05",
      segments: [
        {
          segment_id: "mandate_balanced",
          segment_type: "MANDATE_TYPE",
          display_name: "Balanced DPM Mandates",
          score_run_ids: ["pmq_run_001"],
        },
        {
          segment_id: "mandate_income",
          segment_type: "MANDATE_TYPE",
          display_name: "Income DPM Mandates",
          score_run_ids: ["pmq_run_002"],
        },
      ],
    });
    await previewDpmPmOperatingQualityReviewAction({
      request: {
        target_type: "SCORE_RUN",
        target_id: "pmq_run_001",
        action_type: "REQUEST_EVIDENCE_REMEDIATION",
        action_state: "REVIEW_REQUIRED",
        review_action_ref: "PMQ-REVIEW-pmq_run_001",
        review_reason: "Bounded supervisory review for source-owned PM quality evidence.",
        actor_id: "supervisor_sg_1",
        policy_id: "pmq_sg_dpm",
        policy_version: "2026.05",
        as_of_date: "2026-05-13",
        source_refs: [],
      },
      actorId: "supervisor_sg_1",
    });
    await createDpmPmOperatingQualityReviewAction({
      request: {
        target_type: "SCORE_RUN",
        target_id: "pmq_run_001",
        action_type: "REQUEST_EVIDENCE_REMEDIATION",
        action_state: "REVIEW_REQUIRED",
        review_action_ref: "PMQ-REVIEW-pmq_run_001",
        review_reason: "Bounded supervisory review for source-owned PM quality evidence.",
        actor_id: "supervisor_sg_1",
        policy_id: "pmq_sg_dpm",
        policy_version: "2026.05",
        as_of_date: "2026-05-13",
        source_refs: [],
      },
      actorId: "supervisor_sg_1",
    });
    await previewDpmPmOperatingQualitySummaryInvocation({
      request: {
        score_run_id: "pmq_run_001",
        review_action_id: "pmq_review_001",
        invocation_state: "PENDING_REVIEW",
        summary_ref: "PMQ-SUMMARY-pmq_run_001",
        workflow_pack_name: "pm-operating-quality-summary",
        workflow_pack_version: "2026.05",
        workflow_run_id: "wf_pmq_summary_001",
        summary_artifact_ref: "artifact://pmq-summary/001",
        summary_content_hash: "sha256:summary-invocation",
        requested_by: "supervisor_sg_1",
        source_refs: [],
      },
      actorId: "supervisor_sg_1",
    });
    await createDpmPmOperatingQualitySummaryInvocation({
      request: {
        score_run_id: "pmq_run_001",
        review_action_id: "pmq_review_001",
        invocation_state: "PENDING_REVIEW",
        summary_ref: "PMQ-SUMMARY-pmq_run_001",
        workflow_pack_name: "pm-operating-quality-summary",
        workflow_pack_version: "2026.05",
        workflow_run_id: "wf_pmq_summary_001",
        summary_artifact_ref: "artifact://pmq-summary/001",
        summary_content_hash: "sha256:summary-invocation",
        requested_by: "supervisor_sg_1",
        source_refs: [],
      },
      actorId: "supervisor_sg_1",
    });
    await requestDpmPmOperatingQualitySummary({ scoreRunId: "pmq_run_001" });

    const fetchMock = global.fetch as unknown as ReturnType<typeof vi.fn>;
    expect(fetchMock.mock.calls[0][0].toString()).toContain(
      "/dpm/command-center/pm-operating-quality/policies?limit=3&offset=0&policy_id=pmq_sg_dpm"
    );
    expect(fetchMock.mock.calls[1][0].toString()).toContain(
      "/dpm/command-center/pm-operating-quality/score-runs?book_id=BOOK_SG_BALANCED_DPM"
    );
    expect(fetchMock.mock.calls[2][0].toString()).toContain(
      "/dpm/command-center/pm-operating-quality/fairness-analyses?as_of_date="
    );
    expect(fetchMock.mock.calls[2][0].toString()).toContain("policy_id=pmq_sg_dpm");
    expect(fetchMock.mock.calls[2][0].toString()).toContain("policy_version=2026.05");
    expect(fetchMock.mock.calls[2][0].toString()).toContain("limit=5");
    expect(fetchMock.mock.calls[3][0].toString()).toContain(
      "/dpm/command-center/pm-operating-quality/fairness-analyses/pmq_fair_001"
    );
    expect(fetchMock.mock.calls[4][0].toString()).toContain(
      "/dpm/command-center/pm-operating-quality/review-actions?as_of_date="
    );
    expect(fetchMock.mock.calls[4][0].toString()).toContain("target_type=SCORE_RUN");
    expect(fetchMock.mock.calls[4][0].toString()).toContain("target_id=pmq_run_001");
    expect(fetchMock.mock.calls[4][0].toString()).toContain("policy_id=pmq_sg_dpm");
    expect(fetchMock.mock.calls[4][0].toString()).toContain("limit=6");
    expect(fetchMock.mock.calls[5][0].toString()).toContain(
      "/dpm/command-center/pm-operating-quality/review-actions/pmq_review_001"
    );
    expect(fetchMock.mock.calls[6][0].toString()).toContain(
      "/dpm/command-center/pm-operating-quality/summary-invocations?as_of_date="
    );
    expect(fetchMock.mock.calls[6][0].toString()).toContain("score_run_id=pmq_run_001");
    expect(fetchMock.mock.calls[6][0].toString()).toContain("review_action_id=pmq_review_001");
    expect(fetchMock.mock.calls[6][0].toString()).toContain("policy_id=pmq_sg_dpm");
    expect(fetchMock.mock.calls[6][0].toString()).toContain("invocation_state=PENDING_REVIEW");
    expect(fetchMock.mock.calls[6][0].toString()).toContain("limit=7");
    expect(fetchMock.mock.calls[7][0].toString()).toContain(
      "/dpm/command-center/pm-operating-quality/summary-invocations/pmq_summary_001"
    );
    expect(fetchMock.mock.calls[8][0]).toBe(
      `${expectedBaseUrl}/dpm/command-center/pm-operating-quality/score-runs/preview`
    );
    expect(fetchMock.mock.calls[9][0]).toBe(
      `${expectedBaseUrl}/dpm/command-center/pm-operating-quality/fairness-analyses/preview`
    );
    expect(fetchMock.mock.calls[10][0]).toBe(
      `${expectedBaseUrl}/dpm/command-center/pm-operating-quality/fairness-analyses`
    );
    expect(fetchMock.mock.calls[11][0]).toBe(
      `${expectedBaseUrl}/dpm/command-center/pm-operating-quality/review-actions/preview`
    );
    expect(fetchMock.mock.calls[12][0]).toBe(
      `${expectedBaseUrl}/dpm/command-center/pm-operating-quality/review-actions`
    );
    expect(fetchMock.mock.calls[13][0]).toBe(
      `${expectedBaseUrl}/dpm/command-center/pm-operating-quality/summary-invocations/preview`
    );
    expect(fetchMock.mock.calls[14][0]).toBe(
      `${expectedBaseUrl}/dpm/command-center/pm-operating-quality/summary-invocations`
    );
    expect(fetchMock.mock.calls[15][0]).toBe(
      `${expectedBaseUrl}/dpm/command-center/pm-operating-quality/score-runs/pmq_run_001/ai-summary`
    );
    expect(fetchMock.mock.calls[15][1].headers["X-Caller-Application"]).toBe("lotus-workbench");
    const summaryBody = JSON.parse(fetchMock.mock.calls[15][1].body);
    expect(summaryBody.requested_outputs).toEqual([
      "score_run_summary",
      "governance_summary",
      "fairness_review_posture",
      "support_references",
      "evidence_gaps",
    ]);
    expect(summaryBody.audience).toEqual([
      "portfolio_manager",
      "investment_control",
      "cio_office",
    ]);
    expect(fetchMock.mock.calls[9][1].headers["X-Caller-Application"]).toBe("lotus-workbench");
    const fairnessBody = JSON.parse(fetchMock.mock.calls[9][1].body);
    expect(fairnessBody.body.policy_id).toBe("pmq_sg_dpm");
    expect(fairnessBody.body.segments).toHaveLength(2);
    expect(fairnessBody.body.minimum_segment_score_run_count).toBeUndefined();
    expect(fairnessBody.body.maximum_average_score_spread).toBeUndefined();
    expect(fetchMock.mock.calls[10][1].headers["X-Caller-Application"]).toBe("lotus-workbench");
    const persistedFairnessBody = JSON.parse(fetchMock.mock.calls[10][1].body);
    expect(persistedFairnessBody.body.policy_id).toBe("pmq_sg_dpm");
    expect(persistedFairnessBody.body.segments).toHaveLength(2);
    expect(fetchMock.mock.calls[11][1].headers["X-Actor-Id"]).toBe("supervisor_sg_1");
    expect(fetchMock.mock.calls[12][1].headers["X-Actor-Id"]).toBe("supervisor_sg_1");
    expect(fetchMock.mock.calls[13][1].headers["X-Actor-Id"]).toBe("supervisor_sg_1");
    expect(fetchMock.mock.calls[14][1].headers["X-Actor-Id"]).toBe("supervisor_sg_1");
    expect(fetchMock.mock.calls[11][1].headers["X-Correlation-Id"]).toMatch(
      /^corr-workbench-pm-quality-review-action-/
    );
    expect(fetchMock.mock.calls[12][1].headers["X-Correlation-Id"]).toMatch(
      /^corr-workbench-pm-quality-review-action-/
    );
    expect(fetchMock.mock.calls[13][1].headers["X-Correlation-Id"]).toMatch(
      /^corr-workbench-pm-quality-summary-invocation-/
    );
    expect(fetchMock.mock.calls[14][1].headers["X-Correlation-Id"]).toMatch(
      /^corr-workbench-pm-quality-summary-invocation-/
    );
    expect(fetchMock.mock.calls[11][1].headers["X-Correlation-Id"]).not.toBe(
      "corr-workbench-pm-operating-quality"
    );
    expect(fetchMock.mock.calls[12][1].headers["X-Correlation-Id"]).not.toBe(
      "corr-workbench-pm-operating-quality"
    );
    expect(fetchMock.mock.calls[13][1].headers["X-Correlation-Id"]).not.toContain("pmq_run_001");
    expect(fetchMock.mock.calls[14][1].headers["X-Correlation-Id"]).not.toContain("pmq_summary_001");
    const reviewPreviewBody = JSON.parse(fetchMock.mock.calls[11][1].body);
    expect(reviewPreviewBody.body).toEqual(
      expect.objectContaining({
        target_type: "SCORE_RUN",
        target_id: "pmq_run_001",
        review_reason: "Bounded supervisory review for source-owned PM quality evidence.",
        actor_id: "supervisor_sg_1",
      })
    );
    const reviewCreateBody = JSON.parse(fetchMock.mock.calls[12][1].body);
    expect(reviewCreateBody.body).toEqual(reviewPreviewBody.body);
    const summaryInvocationPreviewBody = JSON.parse(fetchMock.mock.calls[13][1].body);
    expect(summaryInvocationPreviewBody.body).toEqual(
      expect.objectContaining({
        score_run_id: "pmq_run_001",
        review_action_id: "pmq_review_001",
        summary_ref: "PMQ-SUMMARY-pmq_run_001",
        requested_by: "supervisor_sg_1",
      })
    );
    const summaryInvocationCreateBody = JSON.parse(fetchMock.mock.calls[14][1].body);
    expect(summaryInvocationCreateBody.body).toEqual(summaryInvocationPreviewBody.body);
    const metricEventsJson = JSON.stringify(getAnalyticsUiMetricEvents());
    expect(metricEventsJson).toContain("pm-operating-quality-fairness-preview");
    expect(metricEventsJson).toContain("pm-operating-quality-fairness-analysis-create");
    expect(metricEventsJson).toContain("pm-operating-quality-score-run-ai-summary");
    expect(metricEventsJson).toContain("pm-operating-quality-fairness-analysis-list");
    expect(metricEventsJson).toContain("pm-operating-quality-fairness-analysis-detail");
    expect(metricEventsJson).toContain("pm-operating-quality-review-action-list");
    expect(metricEventsJson).toContain("pm-operating-quality-review-action-detail");
    expect(metricEventsJson).toContain("pm-operating-quality-review-action-preview");
    expect(metricEventsJson).toContain("pm-operating-quality-review-action-create");
    expect(metricEventsJson).toContain("pm-operating-quality-summary-invocation-list");
    expect(metricEventsJson).toContain("pm-operating-quality-summary-invocation-detail");
    expect(metricEventsJson).toContain("pm-operating-quality-summary-invocation-preview");
    expect(metricEventsJson).toContain("pm-operating-quality-summary-invocation-create");
    expect(metricEventsJson).not.toContain("pmq_run_001");
    expect(metricEventsJson).not.toContain("pmq_fair_001");
    expect(metricEventsJson).not.toContain("pmq_review_001");
    expect(metricEventsJson).not.toContain("pmq_summary_001");
  });

  it("builds bounded PM-quality review-action correlation ids without source identifiers", () => {
    const correlationId = buildDpmPmOperatingQualityReviewActionCorrelationId();

    expect(correlationId).toMatch(/^corr-workbench-pm-quality-review-action-/);
    expect(correlationId).not.toBe("corr-workbench-pm-operating-quality");
    expect(correlationId).not.toContain("pmq_run_001");
    expect(correlationId).not.toContain("pmq_fair_001");
    expect(correlationId).not.toContain("pmq_review_001");
    expect(correlationId).not.toContain("PM_SG");
  });

  it("refreshes PM-quality persisted source collections through the governed BFF", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        new Response(
          JSON.stringify({
            correlation_id: "corr-pmq-refresh",
            contract_version: "v1",
            source_service: "lotus-manage",
            upstream_status: 200,
            supportability: {
              source_service: "lotus-manage",
              authority: "lotus-manage:RFC-0042/PM_OPERATING_QUALITY",
              state: "READY",
              reason_codes: ["PM_QUALITY_READY"],
              blocked_actions: [],
            },
            data: { items: [] },
          }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        ),
      ),
    );

    await listDpmPmOperatingQualityFairnessAnalyses({ limit: 10 }, "client");
    await listDpmPmOperatingQualityReviewActions({ limit: 10 }, "client");
    await listDpmPmOperatingQualitySummaryInvocations({ limit: 10 }, "client");

    const calls = (global.fetch as unknown as ReturnType<typeof vi.fn>).mock.calls.map(
      ([url]) => url.toString(),
    );
    expect(calls).toHaveLength(3);
    expect(calls.every((url) => url.startsWith("/api/bff/api/v1/"))).toBe(true);
    expect(calls).toEqual(
      expect.arrayContaining([
        expect.stringContaining("/pm-operating-quality/fairness-analyses?"),
        expect.stringContaining("/pm-operating-quality/review-actions?"),
        expect.stringContaining("/pm-operating-quality/summary-invocations?"),
      ]),
    );
  });

  it("builds bounded PM-quality summary-invocation correlation ids without source identifiers", () => {
    const correlationId = buildDpmPmOperatingQualitySummaryInvocationCorrelationId();

    expect(correlationId).toMatch(/^corr-workbench-pm-quality-summary-invocation-/);
    expect(correlationId).not.toBe("corr-workbench-pm-operating-quality");
    expect(correlationId).not.toContain("pmq_run_001");
    expect(correlationId).not.toContain("pmq_review_001");
    expect(correlationId).not.toContain("pmq_summary_001");
    expect(correlationId).not.toContain("PM_SG");
  });

  it("generates and loads DPM proof packs through Gateway endpoints", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        new Response(
          JSON.stringify({
            correlation_id: "corr-rfc40",
            contract_version: "v1",
            source_service: "lotus-manage",
            upstream_status: 200,
            supportability: {
              source_service: "lotus-manage",
              authority: "lotus-manage:RFC-0040",
              state: "READY",
              proof_pack_id: "ppack_1",
              reason_codes: [],
              section_state_counts: { READY: 3 },
              content_hash: "sha256:proof-pack",
              markdown_available: true,
              report_input_available: true,
              ai_evidence_input_available: true,
            },
            data: { proof_pack_id: "ppack_1", content_hash: "sha256:proof-pack" },
          }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        )
      )
    );

    await generateDpmProofPackFromRun({
      rebalanceRunId: "rr_1",
      mandateId: "MANDATE_PB_SG_GLOBAL_BAL_001",
      actorId: "pm_1",
    });
    await getDpmProofPack("ppack_1");
    await getDpmProofPackMarkdown("ppack_1");
    await getDpmProofPackReportInput("ppack_1");
    await getDpmProofPackAiEvidenceInput("ppack_1");
    await requestDpmProofPackAiPmMemo({
      proofPackId: "ppack_1",
      requestedOutputs: ["pm_memo"],
      audience: ["pm"],
    });
    await getDpmProofPack("ppack_1", "server");

    const fetchMock = global.fetch as unknown as ReturnType<typeof vi.fn>;
    expect(fetchMock.mock.calls[0][0]).toBe(
      `${expectedBaseUrl}/dpm/command-center/proof-packs`
    );
    expect(fetchMock.mock.calls[0][1].headers["X-Caller-Application"]).toBe(
      "lotus-workbench"
    );
    expect(fetchMock.mock.calls[0][1].headers["X-Actor-Id"]).toBe("pm_1");
    expect(fetchMock.mock.calls[0][1].headers["Content-Type"]).toBe("application/json");
    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toEqual({
      idempotency_key: "workbench-proof-pack-rr_1",
      body: {
        source_type: "REBALANCE_RUN",
        rebalance_run_id: "rr_1",
        mandate_id: "MANDATE_PB_SG_GLOBAL_BAL_001",
        include_markdown: true,
        include_report_input: true,
        include_ai_evidence_input: true,
        actor_id: "pm_1",
        reason: "Workbench PM generated proof pack from Gateway-backed rebalance run.",
      },
    });
    expect(fetchMock.mock.calls[1][0]).toBe(
      `${expectedBaseUrl}/dpm/command-center/proof-packs/ppack_1`
    );
    expect(fetchMock.mock.calls[2][0]).toBe(
      `${expectedBaseUrl}/dpm/command-center/proof-packs/ppack_1/summary.md`
    );
    expect(fetchMock.mock.calls[3][0]).toBe(
      `${expectedBaseUrl}/dpm/command-center/proof-packs/ppack_1/report-input`
    );
    expect(fetchMock.mock.calls[4][0]).toBe(
      `${expectedBaseUrl}/dpm/command-center/proof-packs/ppack_1/ai-evidence-input`
    );
    expect(fetchMock.mock.calls[5][0]).toBe(
      `${expectedBaseUrl}/dpm/command-center/proof-packs/ppack_1/ai-pm-memo`
    );
    expect(JSON.parse(fetchMock.mock.calls[5][1].body)).toEqual({
      requested_outputs: ["pm_memo"],
      audience: ["pm"],
    });
    expect(fetchMock.mock.calls[6][0]).toBe(
      `${resolveGatewayBaseUrl()}/api/v1/dpm/command-center/proof-packs/ppack_1`
    );
    const metricEventsJson = JSON.stringify(getAnalyticsUiMetricEvents());
    expect(metricEventsJson).toContain("proof-pack-generate");
    expect(metricEventsJson).toContain("proof-pack-detail");
    expect(metricEventsJson).toContain("proof-pack-markdown");
    expect(metricEventsJson).toContain("proof-pack-report-input");
    expect(metricEventsJson).toContain("proof-pack-ai-evidence");
    expect(metricEventsJson).toContain("proof-pack-ai-pm-memo");
    expect(metricEventsJson).not.toContain("ppack_1");
    expect(metricEventsJson).not.toContain("sha256:proof-pack");
    expect(metricEventsJson).not.toContain("rr_1");
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
