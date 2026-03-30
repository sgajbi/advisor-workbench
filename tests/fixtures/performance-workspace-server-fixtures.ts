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
