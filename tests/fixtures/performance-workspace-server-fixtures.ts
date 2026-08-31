import { vi } from "vitest";

import {
  buildPerformanceAttributionTrend,
  buildPerformanceHorizonComparison,
  buildPerformanceHorizonComparisonForScenario,
  buildBenchmarkUnassignedPerformanceScenario,
  buildPerformanceWorkspaceDetails,
  buildPerformanceWorkspaceSummary,
  buildSupportedPerformanceScenario,
  type PerformanceFixtureOptions,
  type PerformancePresentationScenario,
} from "./performance-workspace-fixtures";
import {
  buildFixtureRiskAttribution,
  buildFixtureRiskConcentration,
  buildFixtureRiskDrawdown,
  buildFixtureRiskRolling,
  buildFixtureRiskSummary,
} from "../../src/apps/performance/risk-workspace-view-model";

type InstallPerformancePageFetchScenarioOptions = {
  portfolioId?: string;
};

const FIXTURE_AS_OF_DATE = "2026-02-24";
const FIXTURE_BASE_CURRENCY = "USD";

function withPerformanceReviewContext<Response extends Record<string, unknown>>(
  response: Response,
  requestUrl: string,
) {
  const query = new URL(requestUrl, "http://workbench.test").searchParams;
  const requestedAsOfDate = query.get("as_of_date");
  const requestedPeriod = query.get("period");
  const requestedReportingCurrency = query.get("reporting_currency")?.toUpperCase() ?? null;
  const effectiveAsOfDate = requestedAsOfDate ?? FIXTURE_AS_OF_DATE;
  return {
    ...response,
    report_end_date:
      requestedAsOfDate && requestedPeriod !== "EXPLICIT"
        ? effectiveAsOfDate
        : response.report_end_date,
    as_of_date: effectiveAsOfDate,
    requested_as_of_date: requestedAsOfDate,
    effective_as_of_date: effectiveAsOfDate,
    requested_reporting_currency: requestedReportingCurrency,
    effective_reporting_currency: requestedReportingCurrency ?? FIXTURE_BASE_CURRENCY,
    reporting_currency_state: "accepted_unverified" as const,
  };
}

function withPerformanceHorizonReviewContext<Response extends Record<string, unknown>>(
  response: Response,
  requestUrl: string,
) {
  const query = new URL(requestUrl, "http://workbench.test").searchParams;
  return {
    ...response,
    period: query.get("period") ?? response.period,
    detail_basis: query.get("detail_basis") ?? response.detail_basis,
    benchmark_code: query.has("benchmark_code")
      ? query.get("benchmark_code")
      : response.benchmark_code,
    chart_frequency: query.get("chart_frequency") ?? response.chart_frequency,
    report_start_date:
      query.get("report_start_date") ?? response.report_start_date,
    report_end_date: query.get("report_end_date") ?? response.report_end_date,
  };
}

function buildLookupResponse() {
  return {
    ok: true,
    json: async () => ({
      items: [
        { id: "DEMO_ADV_USD_001", label: "Global Balanced Mandate" },
        { id: "PF_1001", label: "Global Balanced Mandate" },
      ],
    }),
  } as Response;
}

function buildAdvisorBriefResponse(portfolioId: string, benchmarkCode: string | null) {
  return {
    correlation_id: "corr-advisor-brief",
    contract_version: "v1",
    portfolio_id: portfolioId,
    portfolio: {
      portfolio_id: portfolioId,
      client_id: "CIF_1001",
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
    benchmark_code: benchmarkCode,
    status: "ready",
    summary: "Gateway advisor brief is ready with source-grounded talking points.",
    talking_points: [
      {
        headline: "Portfolio delivered 5.42% versus benchmark 4.91%.",
        detail: "Active return was 0.51% over the selected period.",
        tone: "positive",
        evidence_refs: [
          {
            metric_label: "Active Return",
            metric_value: "0.51%",
            source_surface: "performance.return_path",
            target_mode: "summary",
            route: `/performance?portfolioId=${portfolioId}&period=YTD&detailBasis=NET`,
          },
        ],
      },
    ],
    recommended_actions: [
      {
        label: "Open Return Path",
        target_mode: "summary",
        route: `/performance?portfolioId=${portfolioId}&period=YTD&detailBasis=NET`,
      },
      {
        label: "Review Contribution",
        target_mode: "analysis",
        route: `/performance?portfolioId=${portfolioId}&period=YTD&detailBasis=NET`,
      },
    ],
    risks_and_exceptions: [],
    source_metrics: [
      {
        label: "Active Return",
        value: "0.51%",
        support_label: "YTD Net",
        target_mode: "summary",
        route: `/performance?portfolioId=${portfolioId}&period=YTD&detailBasis=NET`,
        state: "ready",
      },
    ],
    supportability: [
      { label: "Advisor Brief", value: "Ready", tone: "success" },
      { label: "Evidence", value: "Partial", tone: "warn" },
    ],
    ai_audit: {
      task_id: "explain.v1",
      output_label: "EXPLANATION_ONLY",
      prompt_version: "foundation.explain.v1",
      provider_mode: "local_openai_compatible",
      provider_id: "text.local",
      adapter_kind: "OPENAI_COMPATIBLE_LOCAL",
      model_id: "qwen3:8b",
      generated_at: "2026-02-24T00:00:00Z",
      stubbed: false,
    },
    ai_evidence: {
      source_refs: [
        `lotus-gateway:workbench:${portfolioId}:performance-summary:YTD`,
        `lotus-ai:task:explain.v1`,
      ],
    },
    warnings: [],
    partial_failures: [],
  };
}

function buildRiskSummaryResponse(portfolioId: string, options?: PerformanceFixtureOptions) {
  const scenario = options
    ? buildBenchmarkUnassignedPerformanceScenario()
    : buildSupportedPerformanceScenario();
  const workspace = {
    ...scenario.workspace,
    portfolio_id: portfolioId,
    portfolio: { ...scenario.workspace.portfolio, portfolio_id: portfolioId },
  };
  return buildFixtureRiskSummary(workspace, workspace.period, workspace.detail_basis);
}

function buildRiskConcentrationResponse(portfolioId: string, options?: PerformanceFixtureOptions) {
  const scenario = options
    ? buildBenchmarkUnassignedPerformanceScenario()
    : buildSupportedPerformanceScenario();
  const workspace = {
    ...scenario.workspace,
    portfolio_id: portfolioId,
    portfolio: { ...scenario.workspace.portfolio, portfolio_id: portfolioId },
  };
  return buildFixtureRiskConcentration(workspace, workspace.period);
}

function buildRiskDrawdownResponse(
  portfolioId: string,
  options?: PerformanceFixtureOptions,
  includeUnderwaterSeries = false
) {
  const scenario = options
    ? buildBenchmarkUnassignedPerformanceScenario()
    : buildSupportedPerformanceScenario();
  const workspace = {
    ...scenario.workspace,
    portfolio_id: portfolioId,
    portfolio: { ...scenario.workspace.portfolio, portfolio_id: portfolioId },
  };
  return buildFixtureRiskDrawdown(workspace, workspace.period, workspace.detail_basis, {
    includeUnderwaterSeries,
    includeBenchmarkRelative: Boolean(workspace.benchmark_code),
  });
}

function buildRiskRollingResponse(
  portfolioId: string,
  options?: PerformanceFixtureOptions,
  includeTimeSeries = false
) {
  const scenario = options
    ? buildBenchmarkUnassignedPerformanceScenario()
    : buildSupportedPerformanceScenario();
  const workspace = {
    ...scenario.workspace,
    portfolio_id: portfolioId,
    portfolio: { ...scenario.workspace.portfolio, portfolio_id: portfolioId },
  };
  return buildFixtureRiskRolling(workspace, workspace.period, workspace.detail_basis, {
    includeTimeSeries,
  });
}

function buildRiskAttributionResponse(
  portfolioId: string,
  options?: PerformanceFixtureOptions,
  attributionType: "TOTAL_RISK" | "ACTIVE_RISK" = "TOTAL_RISK",
  groupingDimension: "POSITION" | "SECTOR" | "ASSET_CLASS" | "ISSUER" = "SECTOR"
) {
  const scenario = options
    ? buildBenchmarkUnassignedPerformanceScenario()
    : buildSupportedPerformanceScenario();
  const workspace = {
    ...scenario.workspace,
    portfolio_id: portfolioId,
    portfolio: { ...scenario.workspace.portfolio, portfolio_id: portfolioId },
  };
  return buildFixtureRiskAttribution(workspace, workspace.period, workspace.detail_basis, {
    attributionType,
    groupingDimension,
  });
}

export function installPerformancePageFetchMock(options?: PerformanceFixtureOptions) {
  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: string | URL) => {
      const url = input.toString();
      if (url.includes("/api/v1/lookups/portfolios")) {
        return buildLookupResponse();
      }
      if (url.includes("/api/v1/workbench/DEMO_ADV_USD_001/performance/summary")) {
        return {
          ok: true,
          json: async () => withPerformanceReviewContext(
            buildPerformanceWorkspaceSummary("DEMO_ADV_USD_001", options),
            url,
          ),
        } as Response;
      }
      if (url.includes("/api/v1/workbench/DEMO_ADV_USD_001/performance/details")) {
        return {
          ok: true,
          json: async () => withPerformanceReviewContext(
            buildPerformanceWorkspaceDetails("DEMO_ADV_USD_001", options),
            url,
          ),
        } as Response;
      }
      if (url.includes("/api/bff/api/v1/workbench/DEMO_ADV_USD_001/performance/details")) {
        return {
          ok: true,
          json: async () => withPerformanceReviewContext(
            buildPerformanceWorkspaceDetails("DEMO_ADV_USD_001", options),
            url,
          ),
        } as Response;
      }
      if (url.includes("/api/bff/api/v1/workbench/DEMO_ADV_USD_001/performance/horizon-comparison")) {
        return {
          ok: true,
          json: async () => withPerformanceHorizonReviewContext(
            buildPerformanceHorizonComparison("DEMO_ADV_USD_001"),
            url,
          ),
        } as Response;
      }
      if (url.includes("/api/bff/api/v1/workbench/DEMO_ADV_USD_001/performance/attribution-trend")) {
        return {
          ok: true,
          json: async () => withPerformanceReviewContext(
            buildPerformanceAttributionTrend("DEMO_ADV_USD_001"),
            url,
          ),
        } as Response;
      }
      if (url.includes("/api/bff/api/v1/workbench/DEMO_ADV_USD_001/performance/advisor-brief")) {
        return {
          ok: true,
          json: async () => withPerformanceReviewContext(
            buildAdvisorBriefResponse("DEMO_ADV_USD_001", "BMK_GLOBAL_BALANCED_60_40"),
            url,
          ),
        } as Response;
      }
      if (url.includes("/api/bff/api/v1/workbench/DEMO_ADV_USD_001/risk/summary")) {
        return {
          ok: true,
          json: async () => buildRiskSummaryResponse("DEMO_ADV_USD_001", options),
        } as Response;
      }
      if (url.includes("/api/bff/api/v1/workbench/DEMO_ADV_USD_001/risk/concentration")) {
        return {
          ok: true,
          json: async () => buildRiskConcentrationResponse("DEMO_ADV_USD_001", options),
        } as Response;
      }
      if (url.includes("/api/bff/api/v1/workbench/DEMO_ADV_USD_001/risk/attribution")) {
        return {
          ok: true,
          json: async () =>
            buildRiskAttributionResponse(
              "DEMO_ADV_USD_001",
              options,
              url.includes("attribution_type=ACTIVE_RISK") ? "ACTIVE_RISK" : "TOTAL_RISK",
              url.includes("grouping_dimension=ASSET_CLASS")
                ? "ASSET_CLASS"
                : url.includes("grouping_dimension=ISSUER")
                  ? "ISSUER"
                  : url.includes("grouping_dimension=POSITION")
                    ? "POSITION"
                    : "SECTOR"
            ),
        } as Response;
      }
      if (url.includes("/api/bff/api/v1/workbench/DEMO_ADV_USD_001/risk/drawdown")) {
        return {
          ok: true,
          json: async () =>
            buildRiskDrawdownResponse(
              "DEMO_ADV_USD_001",
              options,
              url.includes("include_underwater_series=true")
            ),
        } as Response;
      }
      if (url.includes("/api/bff/api/v1/workbench/DEMO_ADV_USD_001/risk/rolling")) {
        return {
          ok: true,
          json: async () =>
            buildRiskRollingResponse(
              "DEMO_ADV_USD_001",
              options,
              url.includes("include_time_series=true")
            ),
        } as Response;
      }
      if (url.includes("/api/v1/workbench/PF_1001/performance/summary")) {
        return {
          ok: true,
          json: async () => withPerformanceReviewContext(
            buildPerformanceWorkspaceSummary("PF_1001"),
            url,
          ),
        } as Response;
      }
      if (url.includes("/api/v1/workbench/PF_1001/performance/details")) {
        return {
          ok: true,
          json: async () => withPerformanceReviewContext(
            buildPerformanceWorkspaceDetails("PF_1001"),
            url,
          ),
        } as Response;
      }
      if (url.includes("/api/bff/api/v1/workbench/PF_1001/performance/details")) {
        return {
          ok: true,
          json: async () => withPerformanceReviewContext(
            buildPerformanceWorkspaceDetails("PF_1001"),
            url,
          ),
        } as Response;
      }
      return { ok: false, json: async () => ({}) } as Response;
    })
  );
}

export function installPerformancePageFetchScenario(
  scenario: PerformancePresentationScenario,
  options?: InstallPerformancePageFetchScenarioOptions
) {
  const portfolioId = options?.portfolioId ?? "DEMO_ADV_USD_001";
  const workspace = {
    ...scenario.workspace,
    portfolio_id: portfolioId,
    portfolio: {
      ...scenario.workspace.portfolio,
      portfolio_id: portfolioId,
    },
  };

  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: string | URL) => {
      const url = input.toString();
      if (url.includes("/api/v1/lookups/portfolios")) {
        return buildLookupResponse();
      }
      if (url.includes(`/api/v1/workbench/${portfolioId}/performance/summary`)) {
        return {
          ok: true,
          json: async () => withPerformanceReviewContext(workspace, url),
        } as Response;
      }
      if (url.includes(`/api/v1/workbench/${portfolioId}/performance/details`)) {
        return {
          ok: true,
          json: async () => withPerformanceReviewContext(workspace, url),
        } as Response;
      }
      if (url.includes(`/api/bff/api/v1/workbench/${portfolioId}/performance/details`)) {
        return {
          ok: true,
          json: async () => withPerformanceReviewContext(workspace, url),
        } as Response;
      }
      if (url.includes(`/api/bff/api/v1/workbench/${portfolioId}/performance/horizon-comparison`)) {
        return {
          ok: true,
          json: async () => withPerformanceHorizonReviewContext(
            buildPerformanceHorizonComparisonForScenario(
              {
                ...scenario,
                workspace,
              },
              portfolioId,
            ),
            url,
          ),
        } as Response;
      }
      if (url.includes(`/api/bff/api/v1/workbench/${portfolioId}/performance/attribution-trend`)) {
        return {
          ok: true,
          json: async () => withPerformanceReviewContext(
            buildPerformanceAttributionTrend(portfolioId),
            url,
          ),
        } as Response;
      }
      if (url.includes(`/api/bff/api/v1/workbench/${portfolioId}/performance/advisor-brief`)) {
        return {
          ok: true,
          json: async () => withPerformanceReviewContext(
            buildAdvisorBriefResponse(portfolioId, workspace.benchmark_code),
            url,
          ),
        } as Response;
      }
      if (url.includes(`/api/bff/api/v1/workbench/${portfolioId}/risk/summary`)) {
        return {
          ok: true,
          json: async () => buildFixtureRiskSummary(workspace, workspace.period, workspace.detail_basis),
        } as Response;
      }
      if (url.includes(`/api/bff/api/v1/workbench/${portfolioId}/risk/concentration`)) {
        return {
          ok: true,
          json: async () => buildFixtureRiskConcentration(workspace, workspace.period),
        } as Response;
      }
      if (url.includes(`/api/bff/api/v1/workbench/${portfolioId}/risk/attribution`)) {
        return {
          ok: true,
          json: async () =>
            buildFixtureRiskAttribution(workspace, workspace.period, workspace.detail_basis, {
              attributionType: url.includes("attribution_type=ACTIVE_RISK")
                ? "ACTIVE_RISK"
                : "TOTAL_RISK",
              groupingDimension: url.includes("grouping_dimension=ASSET_CLASS")
                ? "ASSET_CLASS"
                : url.includes("grouping_dimension=ISSUER")
                  ? "ISSUER"
                  : url.includes("grouping_dimension=POSITION")
                    ? "POSITION"
                    : "SECTOR",
            }),
        } as Response;
      }
      if (url.includes(`/api/bff/api/v1/workbench/${portfolioId}/risk/drawdown`)) {
        return {
          ok: true,
          json: async () =>
            buildFixtureRiskDrawdown(workspace, workspace.period, workspace.detail_basis, {
              includeUnderwaterSeries: url.includes("include_underwater_series=true"),
              includeBenchmarkRelative: Boolean(workspace.benchmark_code),
            }),
        } as Response;
      }
      if (url.includes(`/api/bff/api/v1/workbench/${portfolioId}/risk/rolling`)) {
        return {
          ok: true,
          json: async () =>
            buildFixtureRiskRolling(workspace, workspace.period, workspace.detail_basis, {
              includeTimeSeries: url.includes("include_time_series=true"),
            }),
        } as Response;
      }
      if (url.includes("/api/v1/workbench/PF_1001/performance/summary")) {
        return {
          ok: true,
          json: async () => withPerformanceReviewContext(
            buildPerformanceWorkspaceSummary("PF_1001"),
            url,
          ),
        } as Response;
      }
      if (url.includes("/api/v1/workbench/PF_1001/performance/details")) {
        return {
          ok: true,
          json: async () => withPerformanceReviewContext(
            buildPerformanceWorkspaceDetails("PF_1001"),
            url,
          ),
        } as Response;
      }
      return { ok: false, json: async () => ({}) } as Response;
    })
  );
}

export function installSupportedPerformancePageFetchScenario() {
  installPerformancePageFetchScenario(buildSupportedPerformanceScenario());
}

export function installBenchmarkUnassignedPerformancePageFetchScenario() {
  installPerformancePageFetchScenario(buildBenchmarkUnassignedPerformanceScenario());
}
