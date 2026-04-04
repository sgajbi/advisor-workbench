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

type InstallPerformancePageFetchScenarioOptions = {
  portfolioId?: string;
};

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
      provider_mode: "disabled",
      generated_at: "2026-02-24T00:00:00Z",
      stubbed: true,
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
          json: async () => buildPerformanceWorkspaceSummary("DEMO_ADV_USD_001", options),
        } as Response;
      }
      if (url.includes("/api/v1/workbench/DEMO_ADV_USD_001/performance/details")) {
        return {
          ok: true,
          json: async () => buildPerformanceWorkspaceDetails("DEMO_ADV_USD_001", options),
        } as Response;
      }
      if (url.includes("/api/bff/api/v1/workbench/DEMO_ADV_USD_001/performance/details")) {
        return {
          ok: true,
          json: async () => buildPerformanceWorkspaceDetails("DEMO_ADV_USD_001", options),
        } as Response;
      }
      if (url.includes("/api/bff/api/v1/workbench/DEMO_ADV_USD_001/performance/horizon-comparison")) {
        return {
          ok: true,
          json: async () => buildPerformanceHorizonComparison("DEMO_ADV_USD_001"),
        } as Response;
      }
      if (url.includes("/api/bff/api/v1/workbench/DEMO_ADV_USD_001/performance/attribution-trend")) {
        return {
          ok: true,
          json: async () => buildPerformanceAttributionTrend("DEMO_ADV_USD_001"),
        } as Response;
      }
      if (url.includes("/api/bff/api/v1/workbench/DEMO_ADV_USD_001/performance/advisor-brief")) {
        return {
          ok: true,
          json: async () => buildAdvisorBriefResponse("DEMO_ADV_USD_001", "BMK_GLOBAL_BALANCED_60_40"),
        } as Response;
      }
      if (url.includes("/api/v1/workbench/PF_1001/performance/summary")) {
        return {
          ok: true,
          json: async () => buildPerformanceWorkspaceSummary("PF_1001"),
        } as Response;
      }
      if (url.includes("/api/v1/workbench/PF_1001/performance/details")) {
        return {
          ok: true,
          json: async () => buildPerformanceWorkspaceDetails("PF_1001"),
        } as Response;
      }
      if (url.includes("/api/bff/api/v1/workbench/PF_1001/performance/details")) {
        return {
          ok: true,
          json: async () => buildPerformanceWorkspaceDetails("PF_1001"),
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
          json: async () => workspace,
        } as Response;
      }
      if (url.includes(`/api/v1/workbench/${portfolioId}/performance/details`)) {
        return {
          ok: true,
          json: async () => workspace,
        } as Response;
      }
      if (url.includes(`/api/bff/api/v1/workbench/${portfolioId}/performance/details`)) {
        return {
          ok: true,
          json: async () => workspace,
        } as Response;
      }
      if (url.includes(`/api/bff/api/v1/workbench/${portfolioId}/performance/horizon-comparison`)) {
        return {
          ok: true,
          json: async () => buildPerformanceHorizonComparisonForScenario(
            {
              ...scenario,
              workspace,
            },
            portfolioId
          ),
        } as Response;
      }
      if (url.includes(`/api/bff/api/v1/workbench/${portfolioId}/performance/attribution-trend`)) {
        return {
          ok: true,
          json: async () => buildPerformanceAttributionTrend(portfolioId),
        } as Response;
      }
      if (url.includes(`/api/bff/api/v1/workbench/${portfolioId}/performance/advisor-brief`)) {
        return {
          ok: true,
          json: async () => buildAdvisorBriefResponse(portfolioId, workspace.benchmark_code),
        } as Response;
      }
      if (url.includes("/api/v1/workbench/PF_1001/performance/summary")) {
        return {
          ok: true,
          json: async () => buildPerformanceWorkspaceSummary("PF_1001"),
        } as Response;
      }
      if (url.includes("/api/v1/workbench/PF_1001/performance/details")) {
        return {
          ok: true,
          json: async () => buildPerformanceWorkspaceDetails("PF_1001"),
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
