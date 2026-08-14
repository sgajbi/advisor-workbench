import React from "react";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import PerformanceAnalyticsPage from "../../src/apps/performance/performance-analytics-page";
import {
  getAnalyticsUiMetricEvents,
  resetAnalyticsUiMetricEvents,
} from "../../src/features/analytics-observability/metrics";
import {
  buildPerformanceAttributionTrend,
  buildAggregateContributionPerformanceScenario,
  buildBenchmarkUnassignedPerformanceScenario,
  buildCombinedPartialPerformanceScenario,
  buildNormalizedControlsPerformanceScenario,
  buildPartialAttributionPerformanceScenario,
  buildPartialBenchmarkPerformanceScenario,
  buildPerformancePresentationScenario,
  buildPerformanceHorizonComparison,
  buildSupportedPerformanceScenario,
  buildUnavailableAttributionPerformanceScenario,
  buildUnavailableContributionPerformanceScenario,
  type PerformancePresentationScenario,
} from "../fixtures/performance-workspace-fixtures";
import {
  installPerformancePageFetchMock,
  installPerformancePageFetchScenario,
} from "../fixtures/performance-workspace-server-fixtures";

const replaceMock = vi.fn();

vi.mock("next/navigation", () => ({
  usePathname: () => "/performance",
  useSearchParams: () => new URLSearchParams(),
  useRouter: () => ({
    replace: replaceMock,
  }),
}));

vi.mock("next/dynamic", () => ({
  default: (loader: () => Promise<unknown>) => {
    return function MockDynamicComponent(props: Record<string, unknown>) {
      const [Component, setComponent] =
        React.useState<React.ComponentType<Record<string, unknown>> | null>(null);
      React.useEffect(() => {
        loader().then((mod: unknown) => {
          const resolved =
            typeof mod === "function"
              ? (mod as React.ComponentType<Record<string, unknown>>)
              : (mod as { default?: React.ComponentType<Record<string, unknown>> }).default;
          setComponent(() => resolved ?? null);
        });
      }, []);
      return Component ? React.createElement(Component, props) : null;
    };
  },
}));

vi.mock("echarts-for-react", () => ({
  default: ({ style }: { style?: React.CSSProperties }) => (
    <div data-testid="performance-echart" style={style} />
  ),
}));

type PerformanceSummaryScenario = {
  name: string;
  scenario: PerformancePresentationScenario;
  executiveExpectations?: string[];
  readoutExpectations?: string[];
  deferredExpectations?: string[];
  contextExpectations?: string[];
  horizonExpectations?: string[];
  absentTexts?: string[];
};

type PerformanceWorkspaceScenarioMatrix = {
  name: string;
  scenario: PerformancePresentationScenario;
  summaryExpectations: string[];
  analysisExpectations: string[];
  evidenceExpectations?: string[];
  summaryAbsent?: string[];
  analysisAbsent?: string[];
};

function compactPattern(text: string) {
  return new RegExp(text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replaceAll(" ", "\\s*"));
}

function isServerDetailsCall(url: string, portfolioId: string) {
  return url.includes(`gateway.dev.lotus/api/v1/workbench/${portfolioId}/performance/details`);
}

function deniedResponse(status = 403): Response {
  return {
    ok: false,
    status,
    text: async () => "raw_entitlement_denied_for_PB_SG_GLOBAL_BAL_001",
    json: async () => ({ detail: "raw_entitlement_denied_for_PB_SG_GLOBAL_BAL_001" }),
  } as Response;
}

async function expectTextPresent(text: string) {
  const matches = await screen.findAllByText(text);
  expect(matches.length).toBeGreaterThan(0);
}

async function findWorkflowControl(name: string | RegExp) {
  const visibleControl = screen.queryByRole("button", { name });
  if (visibleControl) {
    return visibleControl;
  }

  const changeStep = await screen.findByRole("button", {
    name: /Change workflow step/i,
  });
  if (changeStep.getAttribute("aria-expanded") !== "true") {
    fireEvent.click(changeStep);
  }
  return screen.findByRole("button", { name });
}

describe("PerformanceAnalyticsPage", () => {
  afterEach(() => {
    replaceMock.mockReset();
    resetAnalyticsUiMetricEvents();
    vi.unstubAllGlobals();
  });

  it("uses the shared full-width workstation shell instead of a centered page container", async () => {
    installPerformancePageFetchMock();

    render(await PerformanceAnalyticsPage({ searchParams: Promise.resolve({}) }));

    expect(await screen.findByRole("button", { name: "Performance Overview" })).toBeInTheDocument();
    expect(
      document.querySelector("main.workstation-page.app-page-shell.app-page-shell-performance.performance-page")
    ).toBeTruthy();
    expect(document.querySelector(".page-container")).toBeFalsy();
    expect(document.querySelector(".workbench-page-frame.performance-page-frame")).toBeTruthy();
    expect(document.querySelector(".workbench-page-frame-header.workbench-page-header")).toBeTruthy();
    expect(document.querySelector(".workbench-page-frame-body.performance-page-frame-body")).toBeTruthy();
    expect(document.querySelector(".workbench-section-stack.performance-page-sections")).toBeTruthy();
    expect(document.querySelector(".main-with-side-rail-layout.workstation-shell-both")).toBeTruthy();
    expect(document.querySelector(".workstation-shell-rail.performance-rail-shell")).toBeTruthy();
    expect(document.querySelector(".workstation-shell-side.performance-side")).toBeTruthy();
    expect(document.querySelector(".lotus-workstation-header")).toBeFalsy();
    expect(document.querySelector(".workbench-page-header")).toBeTruthy();
    expect(document.querySelectorAll(".workbench-summary-module-card").length).toBeGreaterThanOrEqual(1);
    expect(screen.getByRole("heading", { name: "Performance" })).toBeInTheDocument();
    expect(document.querySelector(".workbench-page-header-subtitle")).toBeFalsy();
    expect(document.querySelector(".workbench-page-header-actions [role='radiogroup']"))
      .toBeFalsy();
    expect(screen.getByText("Selected portfolio")).toBeInTheDocument();
    const workbenchScreenNav = screen.getByRole("navigation", {
      name: "Workbench screen navigation",
    });
    expect(within(workbenchScreenNav).getByRole("link", { name: /Portfolio/i })).toHaveAttribute(
      "href",
      "/portfolio?portfolioId=DEMO_ADV_USD_001"
    );
    expect(within(workbenchScreenNav).getByRole("link", { name: /Performance/i })).toHaveAttribute(
      "aria-current",
      "page"
    );
    expect(screen.getByLabelText("Performance surface navigation")).toBeInTheDocument();
    fireEvent.click(
      within(screen.getByLabelText("Performance surface navigation")).getByRole("button", {
        name: /Change workflow step/i,
      }),
    );
    expect(screen.queryByText("Performance Surface")).not.toBeInTheDocument();
    expect(document.querySelectorAll(".performance-surface-switcher")).toHaveLength(0);
    expect(
      within(workbenchScreenNav).getByRole("button", { name: /^Performance Analysis/i })
    ).toBeInTheDocument();
    expect(
      screen.queryByText(
        "Review benchmark-aware outcome, horizon comparisons, and contributor leadership in one governed performance surface before moving into deeper analysis."
      )
    ).not.toBeInTheDocument();
    expect(screen.queryByText("Calendar-to-date window")).not.toBeInTheDocument();
    expect(
      screen.queryByText(
        "Move between summary, diagnostics, advisory narrative, and risk review without losing context."
      )
    ).not.toBeInTheDocument();
    expect(screen.getByText("Review Context")).toBeInTheDocument();
    expect(screen.getByLabelText("Executive return strip")).toBeInTheDocument();
    expect(screen.queryByLabelText("Trust and completeness strip")).not.toBeInTheDocument();
  });

  it("records bounded route-load observability for the initial performance summary", async () => {
    installPerformancePageFetchMock();

    render(await PerformanceAnalyticsPage({ searchParams: Promise.resolve({}) }));

    expect(await screen.findByRole("button", { name: "Performance Overview" })).toBeInTheDocument();

    const summaryEvents = getAnalyticsUiMetricEvents().filter(
      (event) => event.labels.operation === "performance.workspace.summary"
    );
    const summaryMetricNames = new Set(summaryEvents.map((event) => event.metric_name));

    expect(summaryMetricNames.has("lotus_workbench_api_request_duration_seconds")).toBe(true);
    expect(summaryMetricNames.has("lotus_workbench_panel_state_total")).toBe(true);
    expect(summaryMetricNames.has("lotus_workbench_panel_hydration_duration_seconds")).toBe(true);
    expect(summaryEvents.length).toBeGreaterThanOrEqual(3);

    for (const event of summaryEvents) {
      expect(event.labels).toEqual(
        expect.objectContaining({
          route: "workbench.performance",
          panel: "performance-summary",
          operation: "performance.workspace.summary",
          service: "lotus-gateway",
        })
      );
    }

    const renderedMetrics = JSON.stringify(summaryEvents);
    expect(renderedMetrics).not.toContain("portfolio_id");
    expect(renderedMetrics).not.toContain("client_id");
    expect(renderedMetrics).not.toContain("PB_SG_GLOBAL_BAL_001");
    expect(renderedMetrics).not.toContain("CIF_");
  });

  it("prefers the front-office seeded performance portfolio when it is available", async () => {
    const summary = buildSupportedPerformanceScenario().workspace;
    const details = buildSupportedPerformanceScenario().workspace;

    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: string | URL) => {
        const url = input.toString();
        if (url.includes("/api/v1/lookups/portfolios")) {
          return {
            ok: true,
            json: async () => ({
              items: [
                { id: "DEMO_ADV_USD_001", label: "Global Balanced Mandate" },
                { id: "PB_SG_GLOBAL_BAL_001", label: "Private Banking Global Balanced" },
              ],
            }),
          } as Response;
        }
        if (url.includes("/api/v1/workbench/PB_SG_GLOBAL_BAL_001/performance/summary")) {
          return {
            ok: true,
            json: async () => ({
              ...summary,
              portfolio_id: "PB_SG_GLOBAL_BAL_001",
              portfolio: { ...summary.portfolio, portfolio_id: "PB_SG_GLOBAL_BAL_001" },
              benchmark_code: "BMK_PB_GLOBAL_BALANCED_60_40",
            }),
          } as Response;
        }
        if (url.includes("/api/bff/api/v1/workbench/PB_SG_GLOBAL_BAL_001/performance/details")) {
          return {
            ok: true,
            json: async () => ({
              ...details,
              portfolio_id: "PB_SG_GLOBAL_BAL_001",
              portfolio: { ...details.portfolio, portfolio_id: "PB_SG_GLOBAL_BAL_001" },
              benchmark_code: "BMK_PB_GLOBAL_BALANCED_60_40",
            }),
          } as Response;
        }
        return { ok: false, json: async () => ({}) } as Response;
      })
    );

    render(await PerformanceAnalyticsPage({ searchParams: Promise.resolve({}) }));

    const fetchMock = global.fetch as unknown as ReturnType<typeof vi.fn>;
    await waitFor(() => {
      expect(
        fetchMock.mock.calls.some(([input]) =>
          input
            .toString()
            .includes("/api/v1/workbench/PB_SG_GLOBAL_BAL_001/performance/summary")
        )
      ).toBe(true);
    });
    const summaryCall = fetchMock.mock.calls.find(([input]) =>
      input.toString().includes("/api/v1/workbench/PB_SG_GLOBAL_BAL_001/performance/summary")
    );
    expect(summaryCall?.[0].toString()).toContain("period=EXPLICIT");
    expect(summaryCall?.[0].toString()).toContain("report_start_date=2026-01-01");
    expect(summaryCall?.[0].toString()).toContain("report_end_date=2026-04-10");
    expect(summaryCall?.[0].toString()).toContain(
      "benchmark_code=BMK_PB_GLOBAL_BALANCED_60_40"
    );
    expect(
      fetchMock.mock.calls.some(([input]) =>
        isServerDetailsCall(input.toString(), "PB_SG_GLOBAL_BAL_001")
      )
    ).toBe(false);
  });

  it("renders a bounded permission-blocked state when the initial performance summary is denied", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: string | URL) => {
        const url = input.toString();
        if (url.includes("/api/v1/lookups/portfolios")) {
          return {
            ok: true,
            json: async () => ({
              items: [{ id: "PB_SG_GLOBAL_BAL_001", label: "Private Banking Global Balanced" }],
            }),
          } as Response;
        }
        if (url.includes("/api/v1/workbench/PB_SG_GLOBAL_BAL_001/performance/summary")) {
          return deniedResponse(403);
        }
        return { ok: false, status: 404, json: async () => ({}) } as Response;
      })
    );

    render(await PerformanceAnalyticsPage({ searchParams: Promise.resolve({}) }));

    const blockedState = await screen.findByLabelText("Performance workspace access restricted");
    expect(blockedState).toHaveTextContent("Access restricted");
    expect(blockedState).toHaveTextContent("permission-blocked");
    expect(blockedState).toHaveTextContent("HTTP status");
    expect(blockedState).toHaveTextContent("403");
    expect(blockedState).not.toHaveTextContent("raw_entitlement_denied");
    expect(screen.queryByText("raw_entitlement_denied_for_PB_SG_GLOBAL_BAL_001")).not.toBeInTheDocument();
  });

  it("renders Risk Review as permission-blocked when the gateway risk reads are denied", async () => {
    const scenario = buildSupportedPerformanceScenario();
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: string | URL) => {
        const url = input.toString();
        if (url.includes("/api/v1/lookups/portfolios")) {
          return {
            ok: true,
            json: async () => ({
              items: [{ id: "PB_SG_GLOBAL_BAL_001", label: "Private Banking Global Balanced" }],
            }),
          } as Response;
        }
        if (url.includes("/api/v1/workbench/PB_SG_GLOBAL_BAL_001/performance/summary")) {
          return {
            ok: true,
            json: async () => ({
              ...scenario.workspace,
              portfolio_id: "PB_SG_GLOBAL_BAL_001",
              portfolio: { ...scenario.workspace.portfolio, portfolio_id: "PB_SG_GLOBAL_BAL_001" },
              benchmark_code: "BMK_PB_GLOBAL_BALANCED_60_40",
            }),
          } as Response;
        }
        if (url.includes("/api/bff/api/v1/workbench/PB_SG_GLOBAL_BAL_001/performance/details")) {
          return {
            ok: true,
            json: async () => ({
              ...scenario.workspace,
              portfolio_id: "PB_SG_GLOBAL_BAL_001",
              portfolio: { ...scenario.workspace.portfolio, portfolio_id: "PB_SG_GLOBAL_BAL_001" },
              benchmark_code: "BMK_PB_GLOBAL_BALANCED_60_40",
            }),
          } as Response;
        }
        if (url.includes("/api/bff/api/v1/workbench/") && url.includes("/risk/")) {
          return deniedResponse(403);
        }
        return { ok: false, status: 404, json: async () => ({}) } as Response;
      })
    );

    render(await PerformanceAnalyticsPage({ searchParams: Promise.resolve({}) }));
    fireEvent.click(await findWorkflowControl(/^Risk Review/i));

    const riskRegion = await screen.findByRole("region", { name: "Risk" });
    await waitFor(() => {
      expect(within(riskRegion).getByText("Risk access restricted")).toBeInTheDocument();
    });
    expect(within(riskRegion).getByLabelText("Risk mode status")).toHaveTextContent(
      "Access Restricted"
    );
    expect(riskRegion).toHaveTextContent("permission-blocked");
    expect(riskRegion).not.toHaveTextContent("raw_entitlement_denied");
  });

  it("falls back to the demo performance portfolio when the front-office seed is unavailable", async () => {
    installPerformancePageFetchMock();

    render(await PerformanceAnalyticsPage({ searchParams: Promise.resolve({}) }));

    const fetchMock = global.fetch as unknown as ReturnType<typeof vi.fn>;
    await waitFor(() => {
      expect(
        fetchMock.mock.calls.some(([input]) =>
          input
            .toString()
            .includes("/api/v1/workbench/DEMO_ADV_USD_001/performance/summary")
        )
      ).toBe(true);
    });
    expect(
      fetchMock.mock.calls.some(([input]) =>
        isServerDetailsCall(input.toString(), "DEMO_ADV_USD_001")
      )
    ).toBe(false);
    expect(await screen.findByLabelText("Benchmark")).toHaveValue("BMK_GLOBAL_BALANCED_60_40");
  });

  it("renders performance content inside the workstation shell main region", async () => {
    installPerformancePageFetchMock();

    render(await PerformanceAnalyticsPage({ searchParams: Promise.resolve({}) }));

    const mainShell = document.querySelector(".workstation-shell-main");
    const fetchMock = global.fetch as unknown as ReturnType<typeof vi.fn>;
    expect(mainShell).toBeTruthy();
    await waitFor(() => {
      expect(screen.getByLabelText("Executive return strip")).toBeInTheDocument();
      expect(screen.getAllByText("Horizon Comparison")).toHaveLength(1);
      expect(screen.getByRole("img", { name: "Net Return Path chart" })).toBeInTheDocument();
      expect(screen.getByLabelText("Performance decision workspace")).toBeInTheDocument();
      expect(screen.getByLabelText("Return decision readout")).toHaveTextContent(
        /portfolio/i
      );
      expect(screen.getByLabelText("Return path legend")).toHaveTextContent("Portfolio");
      expect(screen.getByText("Observation trail")).toBeInTheDocument();
      expect(mainShell?.querySelector(".performance-horizon-review-bar")).toBeTruthy();
      expect(mainShell?.querySelector(".performance-horizon-toolbar.workbench-summary-toolbar")).toBeTruthy();
      expect(screen.getByRole("radiogroup", { name: "Horizon table view" })).toBeInTheDocument();
      expect(screen.getByRole("radiogroup", { name: "Horizon basis view" })).toBeInTheDocument();
      expect(screen.getByRole("radiogroup", { name: "Return view" })).toBeInTheDocument();
      expect(screen.getByText("Detailed table")).toBeInTheDocument();
      expect(screen.queryByLabelText("Horizon comparison context")).not.toBeInTheDocument();
      expect(
        fetchMock.mock.calls.some(([input]) => {
          const url = input.toString();
          return (
            url.includes("/performance/horizon-comparison") &&
            url.includes("report_start_date=2026-01-01") &&
            url.includes("report_end_date=2026-02-24")
          );
        })
      ).toBe(true);
    });
    fireEvent.click(screen.getByText("Detailed table"));
    expect(screen.getByLabelText("Multi-horizon return table")).toBeInTheDocument();
    expect(mainShell?.querySelector(".performance-chart-stage.workbench-chart-shell")).toBeTruthy();
    expect(mainShell?.querySelectorAll(".workbench-summary-region")).toHaveLength(2);
    const chartSummaryBand = mainShell?.querySelector(".performance-outcome-strip.workbench-summary-metric-strip");
    expect(chartSummaryBand).toBeTruthy();
    expect(within(chartSummaryBand as HTMLElement).queryByText("Portfolio Return")).not.toBeInTheDocument();
    expect(within(chartSummaryBand as HTMLElement).queryByText("Benchmark Return")).not.toBeInTheDocument();
    expect(within(chartSummaryBand as HTMLElement).queryByText("Active Return")).not.toBeInTheDocument();
    expect(within(chartSummaryBand as HTMLElement).queryByText("Money-Weighted Return")).not.toBeInTheDocument();
    const returnDecisionReadout = screen.getByLabelText("Return decision readout");
    expect(returnDecisionReadout).toHaveTextContent(
      compactPattern(
        "Active Return 0.52% Money-Weighted Return 5.12% Portfolio Return 5.42% Benchmark Return 4.91%"
      )
    );
    expect(
      Boolean(
        returnDecisionReadout.compareDocumentPosition(chartSummaryBand as HTMLElement) &
          Node.DOCUMENT_POSITION_FOLLOWING
      )
    ).toBe(true);
    expect(within(chartSummaryBand as HTMLElement).getByText("Net Flow")).toBeInTheDocument();
    expect(within(chartSummaryBand as HTMLElement).getByText("Opening Cash")).toBeInTheDocument();
    expect(within(chartSummaryBand as HTMLElement).getByText("Closing Cash")).toBeInTheDocument();
    expect(within(chartSummaryBand as HTMLElement).getByText("Flow-Adjusted MV")).toBeInTheDocument();
    expect(within(chartSummaryBand as HTMLElement).getByText("Ending MV")).toBeInTheDocument();
    expect(
      within(chartSummaryBand as HTMLElement).queryByText("Period Range / Basis")
    ).not.toBeInTheDocument();
    fireEvent.click(screen.getByText("Observation trail"));
    expect(screen.getByLabelText("Return path observation table")).toBeInTheDocument();
    expect(mainShell?.querySelector(".performance-detail-grid")).toBeTruthy();
  });

  it("shows summary modules by default and hides analysis modules", async () => {
    installPerformancePageFetchMock();

    render(await PerformanceAnalyticsPage({ searchParams: Promise.resolve({}) }));

    expect(document.querySelector(".workstation-shell-main")).toBeTruthy();
    await waitFor(() => {
      expect(screen.getByLabelText("Executive return strip")).toBeInTheDocument();
      expect(screen.getByRole("img", { name: "Net Return Path chart" })).toBeInTheDocument();
    });
    const executiveStrip = screen.getByLabelText("Executive return strip");
    expect(within(executiveStrip).getByText("Opening MV")).toBeInTheDocument();
    expect(within(executiveStrip).getByText("Net Flow")).toBeInTheDocument();
    expect(within(executiveStrip).getByText("Opening Cash")).toBeInTheDocument();
    expect(within(executiveStrip).getByText("Closing Cash")).toBeInTheDocument();
    expect(within(executiveStrip).getByText("Flow-Adjusted MV")).toBeInTheDocument();
    expect(within(executiveStrip).getByText("Ending MV")).toBeInTheDocument();
    expect(within(executiveStrip).queryByText("Period Range / Basis")).not.toBeInTheDocument();
    expect(executiveStrip).toHaveTextContent(compactPattern("Opening Cash $50,000"));
    expect(executiveStrip).toHaveTextContent(compactPattern("Closing Cash -$8,000"));
    expect(executiveStrip).toHaveTextContent(compactPattern("Ending MV $1,250,000"));
    expect(executiveStrip.querySelector(".performance-outcome-strip-item")).toBeTruthy();
    expect(screen.getByLabelText("Return decision readout")).toHaveTextContent(
      compactPattern(
        "Active Return 0.52% Money-Weighted Return 5.12% Portfolio Return 5.42% Benchmark Return 4.91%"
      )
    );
    expect(screen.getAllByLabelText("Status Ready").length).toBeGreaterThanOrEqual(2);
    expect((await screen.findAllByText("Horizon Comparison")).length).toBe(1);
    expect(screen.getAllByText("Performance Drivers").length).toBe(1);
    expect(document.querySelectorAll(".workbench-chart-shell").length).toBeGreaterThanOrEqual(3);
    expect(document.querySelectorAll(".performance-summary-driver-module.workbench-chart-shell")).toHaveLength(2);
    const contributorsModule =
      screen
        .getAllByText("Performance Drivers")
        .map((node) => node.closest(".workbench-chart-shell"))
        .find(Boolean) ?? null;
    expect(contributorsModule).toBeTruthy();
    expect(
      within(contributorsModule as HTMLElement).getByTestId("performance-contributor-groups")
    ).toHaveAttribute("data-layout", "asymmetric");
    expect(within(contributorsModule as HTMLElement).getByLabelText("Top Contributors impact bars")).toBeInTheDocument();
    expect(within(contributorsModule as HTMLElement).getByLabelText("Top Detractors impact bars")).toBeInTheDocument();
    expect(within(contributorsModule as HTMLElement).getByText("Contribution coverage is limited")).toBeInTheDocument();
    expect(within(contributorsModule as HTMLElement).getByText(
      "Not source-authored: income effects and tax effects."
    )).toBeInTheDocument();
    fireEvent.click(within(contributorsModule as HTMLElement).getByText("Calculation evidence"));
    const contributionEvidence = within(contributorsModule as HTMLElement).getByLabelText(
      "Contribution calculation evidence"
    );
    expect(within(contributionEvidence).getByText("SOURCE_LIMITED")).toBeInTheDocument();
    expect(within(contributionEvidence).getByText("APPLIED")).toBeInTheDocument();
    expect(within(contributionEvidence).getByText(
      "LOTUS_CORE_ANALYTICS_INPUTS_USED, COMPONENT_PNL_NOT_SOURCE_AUTHORED"
    )).toBeInTheDocument();
    expect(within(contributorsModule as HTMLElement).getByText("Instrument detail")).toBeInTheDocument();
    expect(within(contributorsModule as HTMLElement).queryByLabelText("Contributor summary")).not.toBeInTheDocument();
    expect(within(contributorsModule as HTMLElement).queryByLabelText("Contributor driver strip")).not.toBeInTheDocument();
    fireEvent.click(within(contributorsModule as HTMLElement).getByText("Instrument detail"));
    expect(within(contributorsModule as HTMLElement).getByLabelText("Contributor instrument detail table")).toBeInTheDocument();
    expect(within(contributorsModule as HTMLElement).getAllByText("Instrument").length).toBeGreaterThanOrEqual(1);
    expect(within(contributorsModule as HTMLElement).getAllByText("Weight").length).toBeGreaterThanOrEqual(1);
    expect(within(contributorsModule as HTMLElement).getByText("Direction")).toBeInTheDocument();
    expect(screen.queryByText("Attribution Over Time")).not.toBeInTheDocument();
    expect(screen.queryByText("Attribution Detail")).not.toBeInTheDocument();
    expect(screen.queryByText("Contribution Detail")).not.toBeInTheDocument();
    expect(screen.queryByText("Evidence and Calculation Context")).not.toBeInTheDocument();
  });

  it("honors query param period on initial page entry", async () => {
    installPerformancePageFetchScenario(
      buildPerformancePresentationScenario({
        workspaceOverrides: {
          period: "QTD",
          report_start_date: "2026-01-01",
          report_end_date: "2026-02-24",
        },
      }),
      { portfolioId: "PF_1001" }
    );

    render(
      await PerformanceAnalyticsPage({
        searchParams: Promise.resolve({
          portfolioId: "PF_1001",
          period: "QTD",
          detailBasis: "NET",
          contributionDimension: "asset_class",
          attributionDimension: "asset_class",
          chartFrequency: "monthly",
          benchmark: "BMK_GLOBAL_BALANCED_60_40",
        }),
      })
    );

    const executiveStrip = await screen.findByLabelText("Executive return strip");
    const returnDecisionReadout = await screen.findByLabelText("Return decision readout");
    await waitFor(() => {
      expect(within(returnDecisionReadout).getByText("Money-Weighted Return")).toBeInTheDocument();
    });
    expect(within(executiveStrip).queryByText("Period Range / Basis")).not.toBeInTheDocument();
    expect(screen.queryByRole("group", { name: "Return path context" })).not.toBeInTheDocument();
  });

  it("renders a compact benchmark-unassigned state intentionally in summary mode", async () => {
    installPerformancePageFetchScenario(buildBenchmarkUnassignedPerformanceScenario());

    render(await PerformanceAnalyticsPage({ searchParams: Promise.resolve({}) }));

    expect(await screen.findByLabelText("Net Return Path unavailable")).toBeInTheDocument();
    expect(screen.getAllByLabelText("Status Unavailable").length).toBeGreaterThanOrEqual(1);
    expect(screen.queryByText("N/A")).not.toBeInTheDocument();
  });

  it("renders the compact top analysis zone with chart-first hierarchy on first paint", async () => {
    installPerformancePageFetchMock();

    render(await PerformanceAnalyticsPage({ searchParams: Promise.resolve({}) }));

    expect(await screen.findByRole("button", { name: "Performance Overview" })).toBeInTheDocument();
    expect(screen.getByLabelText("Executive return strip")).toBeInTheDocument();
    expect(screen.queryByLabelText("Trust and completeness strip")).not.toBeInTheDocument();
    expect(await screen.findByRole("img", { name: "Net Return Path chart" })).toBeInTheDocument();
    expect(document.querySelector(".performance-analysis-control-bar")).toBeTruthy();
    expect(document.querySelector(".performance-outcome-strip")).toBeTruthy();
    expect(screen.getByLabelText("Return decision readout")).toBeInTheDocument();
    const returnDecisionReadout = screen.getByLabelText("Return decision readout");
    const controlBar = screen.getByLabelText("Performance source selection");
    const chart = screen.getByRole("img", { name: "Net Return Path chart" });
    const executiveStrip = screen.getByLabelText("Executive return strip");
    expect(
      Boolean(returnDecisionReadout.compareDocumentPosition(controlBar) & Node.DOCUMENT_POSITION_FOLLOWING)
    ).toBe(true);
    expect(Boolean(controlBar.compareDocumentPosition(chart) & Node.DOCUMENT_POSITION_FOLLOWING)).toBe(true);
    expect(
      Boolean(chart.compareDocumentPosition(executiveStrip) & Node.DOCUMENT_POSITION_FOLLOWING)
    ).toBe(true);
    expect(screen.queryByText("Attribution Detail")).not.toBeInTheDocument();
    expect(screen.queryByRole("group", { name: "Performance mode readiness" })).not.toBeInTheDocument();
  });

  it("shows analysis modules and hides summary-only modules when analysis mode is selected", async () => {
    installPerformancePageFetchMock();

    render(await PerformanceAnalyticsPage({ searchParams: Promise.resolve({}) }));

    fireEvent.click(await findWorkflowControl(/^Performance Analysis/i));

    expect(await screen.findByLabelText("Analysis decision summary")).toBeInTheDocument();
    const sourceSelection = await screen.findByRole("group", {
      name: "Performance Analysis source selection",
    });
    expect(within(sourceSelection).getByRole("radiogroup", { name: "Horizon" })).toBeVisible();
    expect(within(sourceSelection).getByRole("radiogroup", { name: "Basis" })).toBeVisible();
    expect(within(sourceSelection).getByLabelText("From")).toBeVisible();
    expect(within(sourceSelection).getByLabelText("To")).toBeVisible();
    expect(within(sourceSelection).getByLabelText("Frequency")).toBeVisible();
    expect(within(sourceSelection).getByLabelText("Benchmark")).toBeVisible();
    expect(screen.queryByRole("group", { name: "Return-path presentation" })).not.toBeInTheDocument();
    expect(screen.queryByRole("radiogroup", { name: "Return view" })).not.toBeInTheDocument();
    expect(screen.getByLabelText("Analysis decision summary")).toHaveTextContent(
      "Analysis Snapshot"
    );
    expect(screen.queryByLabelText("Analysis evidence gaps")).not.toBeInTheDocument();
    expect(await screen.findByText("Attribution Observation")).toBeInTheDocument();
    expect(screen.queryByLabelText("Performance analysis mode intro")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Performance analysis context")).not.toBeInTheDocument();
    expect(document.querySelector(".performance-analysis-trend-shell.workbench-chart-shell")).toBeTruthy();
    expect(screen.queryByLabelText("Attribution trend context")).not.toBeInTheDocument();
    expect(await screen.findByLabelText("Attribution trend summary strip")).toBeInTheDocument();
    expect(screen.getByLabelText("Attribution observation table")).toBeInTheDocument();
    expect(screen.queryByRole("img", { name: "Attribution over time chart" })).not.toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Attribution Detail" })).toBeInTheDocument();
    expect(screen.queryByRole("group", { name: "Attribution detail context" })).not.toBeInTheDocument();
    expect(screen.getByText("Performance Drivers")).toBeInTheDocument();
    expect(screen.queryByLabelText("Contribution detail summary strip")).not.toBeInTheDocument();
    expect(document.querySelector(".performance-analysis-stage")).toBeTruthy();
    expect(document.querySelector("#performance-attribution.workbench-chart-shell")).toBeTruthy();
    expect(document.querySelector("#performance-drivers.workbench-data-grid-frame")).toBeTruthy();
    expect(document.querySelectorAll(".performance-analysis-toolbar").length).toBeGreaterThanOrEqual(2);
    expect(document.querySelector("#performance-drivers .performance-analysis-drilldown-workspace")).toBeFalsy();
    expect(document.querySelectorAll("#performance-drivers .performance-analysis-drilldown-pane")).toHaveLength(0);
    expect(screen.queryByLabelText("Top / Bottom Contributors panel")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Contribution Detail panel")).not.toBeInTheDocument();
    expect(screen.queryByText("Contribution Breakdown")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Top Effects panel")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Attribution Detail panel")).not.toBeInTheDocument();
    expect(screen.queryByText("Segment Attribution")).not.toBeInTheDocument();
    expect(screen.getByRole("tab", { name: /^Positions/ })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByRole("tab", { name: /^Segment Summary/ })).toHaveAttribute(
      "aria-selected",
      "false"
    );
    expect(document.querySelectorAll("#performance-drivers .performance-analysis-table").length).toBe(2);
    expect(screen.getByLabelText("Position contribution table")).toBeVisible();
    expect(screen.getByLabelText("Asset Class contribution table")).not.toBeVisible();
    expect(screen.queryByLabelText("Attribution summary strip")).not.toBeInTheDocument();
    const attributionTable = await screen.findByLabelText("Asset Class attribution table");
    expect(screen.queryByRole("tab", { name: /^Relative Segment Context/ })).not.toBeInTheDocument();
    expect(screen.queryByRole("tab", { name: /^Effect Breakdown/ })).not.toBeInTheDocument();
    expect(screen.queryByRole("img", { name: "Net Return Path chart" })).not.toBeInTheDocument();
    expect(screen.queryByText("Horizon Comparison")).not.toBeInTheDocument();
    expect(within(attributionTable).getAllByText("—")).toHaveLength(3);
    expect(screen.queryByLabelText("Attribution effect legend")).not.toBeInTheDocument();
  });

  it("accepts the advisor-brief route alias and opens the advisor brief surface on first paint", async () => {
    installPerformancePageFetchMock();

    render(
      await PerformanceAnalyticsPage({
        searchParams: Promise.resolve({
          mode: "advisor-brief",
        }),
      })
    );

    expect(
      await screen.findByRole("heading", { name: "Performance Advisor Brief" })
    ).toBeInTheDocument();
    expect(screen.getByLabelText("Advisor brief mode intro")).toHaveTextContent(
      "Source-grounded brief, drilldowns, and supportability"
    );
    expect(screen.getByLabelText("Advisor brief mode intro")).not.toHaveTextContent(
      "Internal working narrative"
    );
    expect(document.querySelector(".performance-advisor-brief-shell")).toBeTruthy();
  });

  it("accepts the advisor-brief route alias and opens the advisor brief surface on first paint", async () => {
    installPerformancePageFetchMock();

    render(
      await PerformanceAnalyticsPage({
        searchParams: Promise.resolve({
          mode: "advisor-brief",
        }),
      })
    );

    expect(
      await screen.findByRole("heading", { name: "Performance Advisor Brief" })
    ).toBeInTheDocument();
    expect(screen.getByLabelText("Advisor brief mode intro")).toHaveTextContent(
      "Source-grounded brief, drilldowns, and supportability"
    );
    expect(screen.getByLabelText("Advisor brief mode intro")).not.toHaveTextContent(
      "Internal working narrative"
    );
    expect(document.querySelector(".performance-advisor-brief-shell")).toBeTruthy();
  });

  it("shows Advisor Brief as a first-class mode and allows source drilldown back to Summary and Analysis", async () => {
    installPerformancePageFetchMock();

    render(await PerformanceAnalyticsPage({ searchParams: Promise.resolve({}) }));

    fireEvent.click(await findWorkflowControl("Advisor Brief"));

    expect(screen.getByLabelText("Advisor brief mode intro")).toHaveTextContent(
      "Source-grounded brief, drilldowns, and supportability"
    );
    expect(screen.getByLabelText("Advisor brief mode intro")).not.toHaveTextContent(
      "Internal working narrative"
    );
    expect(
      await screen.findByRole("heading", { name: "Performance Advisor Brief" })
    ).toBeInTheDocument();
    await waitFor(() => {
      const supportability = screen.getByLabelText("Advisor brief supportability");
      expect(supportability).toHaveTextContent("Decision support coverage");
      expect(supportability).toHaveTextContent("Ready modules");
      expect(supportability).toHaveTextContent("Review items");
      expect(supportability).toHaveTextContent("Evidence");
      expect(supportability).toHaveTextContent("Partial");
    });
    expect(screen.getByLabelText("Advisor brief toolbar")).toHaveTextContent("Ready");
    expect(screen.getByLabelText("Advisor brief toolbar")).toHaveTextContent(
      "Evidence available"
    );
    expect(screen.getByLabelText("Advisor Talking Points")).toHaveTextContent(
      "Portfolio delivered 5.42% versus benchmark 4.91%."
    );
    expect(screen.getByLabelText("Source Metrics")).toHaveTextContent("Active Return");
    expect(screen.queryByText("foundation.explain.v1")).not.toBeInTheDocument();
    expect(screen.queryByRole("img", { name: "Net Return Path chart" })).not.toBeInTheDocument();
    expect(screen.getByText("How this was prepared")).toBeInTheDocument();
    expect(screen.getByText("Live AI-assisted output")).toBeInTheDocument();
    fireEvent.click(screen.getByText("How this was prepared"));
    expect(screen.getByText("Human-review status not available")).toBeInTheDocument();
    expect(screen.getByText("Not approved for client use")).toBeInTheDocument();

    fireEvent.click(
      within(screen.getByLabelText("Recommended Actions")).getByRole("button", {
        name: /Open Return Path/,
      })
    );

    expect(await screen.findByRole("img", { name: "Net Return Path chart" })).toBeInTheDocument();

    fireEvent.click(await findWorkflowControl("Advisor Brief"));
    fireEvent.click(
      within(screen.getByLabelText("Advisor Talking Points")).getByRole("button", {
        name: /Top Contributor/,
      })
    );

    expect(await screen.findByRole("heading", { name: "Attribution Detail" })).toBeInTheDocument();
  });

  it("opens Performance Risk mode from the mode query parameter and preserves it in navigation updates", async () => {
    installPerformancePageFetchMock();

    render(
      await PerformanceAnalyticsPage({
        searchParams: Promise.resolve({
          portfolioId: "DEMO_ADV_USD_001",
          mode: "risk",
        }),
      })
    );

    expect(await findWorkflowControl(/^Risk Review/i)).toHaveAttribute(
      "aria-current",
      "page"
    );
    expect(screen.getAllByRole("heading", { name: "Risk" }).length).toBeGreaterThanOrEqual(1);
    expect(document.querySelector(".workbench-page-header-subtitle")).toBeFalsy();
    expect(screen.getByLabelText("Risk mode status")).toBeInTheDocument();

    fireEvent.click(await findWorkflowControl(/^Performance Analysis/i));

    await waitFor(() => {
      expect(replaceMock).toHaveBeenCalledWith(
        expect.stringContaining("/performance?portfolioId=DEMO_ADV_USD_001&mode=analysis"),
        { scroll: false }
      );
    });
  });

  it(
    "shows Risk as a stateful fixture-backed mode without browser calls to raw lotus-risk APIs",
    async () => {
    installPerformancePageFetchMock();

    render(await PerformanceAnalyticsPage({ searchParams: Promise.resolve({}) }));

    fireEvent.click(await findWorkflowControl(/^Risk Review/i));

    expect(screen.getByLabelText("Risk mode intro")).toHaveTextContent(
      "Downside, concentration, and rolling stability posture"
    );
    expect(screen.getByLabelText("Risk mode intro")).not.toHaveTextContent("Risk review");
    expect(screen.getByLabelText("Risk mode intro")).not.toHaveTextContent(
      "Compare current mandate risk posture with drawdown path, concentration, and rolling stability before moving into historical attribution detail."
    );
    expect(await screen.findByRole("region", { name: "Risk" })).toBeInTheDocument();
    expect(
      screen.getAllByRole("heading", { name: "Risk" }).some((heading) =>
        heading.classList.contains("workbench-page-header-title")
      )
    ).toBe(true);
    expect(screen.getByLabelText("Risk mode status")).not.toHaveTextContent("Stateful only");
    expect(screen.getByLabelText("Primary risk review")).toHaveTextContent(
      "Posture, drawdown, and concentration"
    );
    expect(screen.getByLabelText("Secondary risk analysis")).toHaveTextContent(
      "Rolling stability and contributors"
    );
    expect(screen.getByLabelText("Risk snapshot headline metrics")).toHaveTextContent("Volatility");
    expect(screen.getByLabelText("Historical risk attribution table")).toHaveTextContent(
      "Technology"
    );
    expect(screen.getByLabelText("Rolling risk summary table")).toHaveTextContent("Typical");
    expect(screen.getByLabelText("Risk concentration indicator strip")).toHaveTextContent(
      "Portfolio Concentration Index"
    );
    expect(screen.queryByLabelText("Risk concentration diagnostic table")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Risk support rail")).not.toBeInTheDocument();

    const fetchMock = global.fetch as unknown as ReturnType<typeof vi.fn>;
    expect(
      fetchMock.mock.calls.some(([input]) =>
        input.toString().includes("/api/bff/api/v1/workbench/DEMO_ADV_USD_001/risk/summary")
      )
    ).toBe(true);
    expect(
      fetchMock.mock.calls.some(([input]) =>
        input
          .toString()
          .includes("/api/bff/api/v1/workbench/DEMO_ADV_USD_001/risk/concentration")
      )
    ).toBe(true);
    expect(
      fetchMock.mock.calls.some(([input]) =>
        input.toString().includes("/api/bff/api/v1/workbench/DEMO_ADV_USD_001/risk/attribution")
      )
    ).toBe(true);
    expect(
      fetchMock.mock.calls.some(([input]) =>
        input.toString().includes("/api/bff/api/v1/workbench/DEMO_ADV_USD_001/risk/rolling")
      )
    ).toBe(true);
    expect(
      fetchMock.mock.calls.some(([input]) => input.toString().includes("/analytics/risk/"))
    ).toBe(false);
    expect(
      fetchMock.mock.calls.some(([input]) => input.toString().includes("lotus-risk"))
    ).toBe(false);

    fireEvent.click(screen.getByRole("button", { name: "View rolling series" }));

    await waitFor(() => {
      expect(screen.getByLabelText("Rolling risk series table")).toBeInTheDocument();
    });
    expect(
      fetchMock.mock.calls.some(([input]) =>
        input
          .toString()
          .includes(
            "/api/bff/api/v1/workbench/DEMO_ADV_USD_001/risk/rolling?period=YTD&detail_basis=NET&benchmark_code=BMK_GLOBAL_BALANCED_60_40&as_of_date=2026-02-24&reporting_currency=USD&include_time_series=true"
          )
      )
    ).toBe(true);
    fireEvent.click(screen.getByRole("button", { name: "Close Rolling series detail" }));

    fireEvent.click(screen.getByRole("radio", { name: "Active Risk" }));
    await waitFor(() => {
      expect(
        fetchMock.mock.calls.some(([input]) =>
          input.toString().includes("/api/bff/api/v1/workbench/DEMO_ADV_USD_001/risk/attribution") &&
          input.toString().includes("attribution_type=ACTIVE_RISK") &&
          input.toString().includes("grouping_dimension=SECTOR")
        )
      ).toBe(true);
    });
    fireEvent.click(screen.getByRole("radio", { name: "Asset Class" }));

    await waitFor(() => {
      expect(
        fetchMock.mock.calls.some(([input]) =>
          input.toString().includes("/api/bff/api/v1/workbench/DEMO_ADV_USD_001/risk/attribution") &&
          input.toString().includes("attribution_type=ACTIVE_RISK") &&
          input.toString().includes("grouping_dimension=ASSET_CLASS")
        )
      ).toBe(true);
    });
    },
    15000
  );

  it("shows a compact normalization notice when the backend adjusted unsupported controls", async () => {
    installPerformancePageFetchScenario(buildNormalizedControlsPerformanceScenario());

    render(
      await PerformanceAnalyticsPage({
        searchParams: Promise.resolve({
          chartFrequency: "weekly",
          contributionDimension: "currency",
          attributionDimension: "issuer",
        }),
      })
    );

    const normalizationNotice = await screen.findByRole("status", {
      name: "Performance control normalization",
    });
    expect(normalizationNotice).toHaveTextContent("Selection adjusted");
    expect(normalizationNotice).toHaveTextContent("frequency reset to Monthly");
    expect(normalizationNotice).toHaveTextContent(
      "contribution view reset to Asset Class"
    );
    expect(normalizationNotice).toHaveTextContent(
      "attribution view reset to Asset Class"
    );
    expect(document.querySelector(".performance-control-normalization-note")).toBeTruthy();
  });

  it("converges a stale deep link through deferred attribution-trend normalization", async () => {
    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const consoleWarnSpy = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const rawWorkspace = {
      ...buildSupportedPerformanceScenario().workspace,
      portfolio_id: "DEMO_ADV_USD_001",
      portfolio: {
        ...buildSupportedPerformanceScenario().workspace.portfolio,
        portfolio_id: "DEMO_ADV_USD_001",
      },
      chart_frequency: "monthly",
      attribution_dimension: "issuer",
      requested_chart_frequency_supported: true,
      requested_attribution_dimension_supported: true,
    };
    const normalizedTrend = {
      ...buildPerformanceAttributionTrend("DEMO_ADV_USD_001"),
      chart_frequency: "monthly",
      attribution_dimension: "asset_class",
      requested_chart_frequency_supported: true,
      requested_attribution_dimension_supported: false,
      warnings: ["PERFORMANCE_ATTRIBUTION_TREND_DIMENSION_NORMALIZED"],
    };

    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: string | URL) => {
        const url = input.toString();
        if (url.includes("/api/v1/lookups/portfolios")) {
          return {
            ok: true,
            json: async () => ({
              items: [{ id: "DEMO_ADV_USD_001", label: "Global Balanced Mandate" }],
            }),
          } as Response;
        }
        if (url.includes("/api/v1/workbench/DEMO_ADV_USD_001/performance/summary")) {
          return { ok: true, json: async () => rawWorkspace } as Response;
        }
        if (url.includes("/api/bff/api/v1/workbench/DEMO_ADV_USD_001/performance/details")) {
          return {
            ok: true,
            json: async () => ({
              ...rawWorkspace,
              attribution_dimension: "asset_class",
              requested_attribution_dimension_supported: true,
            }),
          } as Response;
        }
        if (url.includes("/api/v1/workbench/DEMO_ADV_USD_001/performance/details")) {
          return { ok: true, json: async () => rawWorkspace } as Response;
        }
        if (url.includes("/api/bff/api/v1/workbench/DEMO_ADV_USD_001/performance/horizon-comparison")) {
          return {
            ok: true,
            json: async () => ({
              ...buildPerformanceHorizonComparison("DEMO_ADV_USD_001"),
              chart_frequency: "monthly",
              requested_chart_frequency_supported: true,
            }),
          } as Response;
        }
        if (url.includes("/api/bff/api/v1/workbench/DEMO_ADV_USD_001/performance/attribution-trend")) {
          return { ok: true, json: async () => normalizedTrend } as Response;
        }
        return { ok: false, json: async () => ({}) } as Response;
      })
    );

    try {
      render(
        await PerformanceAnalyticsPage({
          searchParams: Promise.resolve({
            attributionDimension: "issuer",
            chartFrequency: "monthly",
          }),
        })
      );

      fireEvent.click(await findWorkflowControl(/^Performance Analysis/i));

      await waitFor(() => {
        expect(replaceMock).toHaveBeenCalledWith(
          "/performance?portfolioId=DEMO_ADV_USD_001&mode=analysis&period=YTD&detailBasis=NET&contributionDimension=asset_class&attributionDimension=asset_class&chartFrequency=monthly&benchmark=BMK_GLOBAL_BALANCED_60_40",
          { scroll: false }
        );
      });

      const notice = await screen.findByRole("status", {
        name: "Attribution trend normalization",
      });
      expect(notice).toHaveTextContent("segment reset to Asset Class");
    } finally {
      consoleErrorSpy.mockRestore();
      consoleWarnSpy.mockRestore();
    }
  });

  it("converges a stale deep link through deferred horizon normalization", async () => {
    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const consoleWarnSpy = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const rawWorkspace = {
      ...buildSupportedPerformanceScenario().workspace,
      portfolio_id: "DEMO_ADV_USD_001",
      portfolio: {
        ...buildSupportedPerformanceScenario().workspace.portfolio,
        portfolio_id: "DEMO_ADV_USD_001",
      },
      chart_frequency: "weekly",
      requested_chart_frequency_supported: true,
    };
    const normalizedHorizon = {
      ...buildPerformanceHorizonComparison("DEMO_ADV_USD_001"),
      chart_frequency: "monthly",
      requested_chart_frequency_supported: false,
      warnings: ["PERFORMANCE_HORIZON_CHART_FREQUENCY_NORMALIZED"],
    };

    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: string | URL) => {
        const url = input.toString();
        if (url.includes("/api/v1/lookups/portfolios")) {
          return {
            ok: true,
            json: async () => ({
              items: [{ id: "DEMO_ADV_USD_001", label: "Global Balanced Mandate" }],
            }),
          } as Response;
        }
        if (url.includes("/api/v1/workbench/DEMO_ADV_USD_001/performance/summary")) {
          return { ok: true, json: async () => rawWorkspace } as Response;
        }
        if (url.includes("/api/bff/api/v1/workbench/DEMO_ADV_USD_001/performance/details")) {
          return {
            ok: true,
            json: async () => ({
              ...rawWorkspace,
              chart_frequency: "monthly",
              requested_chart_frequency_supported: true,
            }),
          } as Response;
        }
        if (url.includes("/api/v1/workbench/DEMO_ADV_USD_001/performance/details")) {
          return { ok: true, json: async () => rawWorkspace } as Response;
        }
        if (url.includes("/api/bff/api/v1/workbench/DEMO_ADV_USD_001/performance/horizon-comparison")) {
          return { ok: true, json: async () => normalizedHorizon } as Response;
        }
        if (url.includes("/api/bff/api/v1/workbench/DEMO_ADV_USD_001/performance/attribution-trend")) {
          return {
            ok: true,
            json: async () => buildPerformanceAttributionTrend("DEMO_ADV_USD_001"),
          } as Response;
        }
        return { ok: false, json: async () => ({}) } as Response;
      })
    );

    try {
      render(
        await PerformanceAnalyticsPage({
          searchParams: Promise.resolve({
            chartFrequency: "weekly",
          }),
        })
      );

      await waitFor(() => {
        expect(replaceMock).toHaveBeenCalledWith(
          "/performance?portfolioId=DEMO_ADV_USD_001&period=YTD&detailBasis=NET&contributionDimension=asset_class&attributionDimension=asset_class&chartFrequency=monthly&benchmark=BMK_GLOBAL_BALANCED_60_40",
          { scroll: false }
        );
      });

      const notice = await screen.findByRole("status", {
        name: "Horizon comparison normalization",
      });
      expect(notice).toHaveTextContent("Unsupported frequency was replaced with Monthly.");
    } finally {
      consoleErrorSpy.mockRestore();
      consoleWarnSpy.mockRestore();
    }
  });

  it("keeps attribution detail out of the analysis stage when attribution data is unavailable", async () => {
    installPerformancePageFetchScenario(buildUnavailableAttributionPerformanceScenario());

    render(await PerformanceAnalyticsPage({ searchParams: Promise.resolve({}) }));

    fireEvent.click(await findWorkflowControl(/^Performance Analysis/i));

    await screen.findByText("Performance Drivers");
    expect(document.querySelector(".performance-relative-segment-module")).toBeFalsy();
    expect(screen.getByText("Performance Drivers")).toBeInTheDocument();
  });

  it("renders summary-only attribution totals when detailed rows are unavailable", async () => {
    installPerformancePageFetchScenario(buildPartialAttributionPerformanceScenario());

    render(await PerformanceAnalyticsPage({ searchParams: Promise.resolve({}) }));

    fireEvent.click(await findWorkflowControl(/^Performance Analysis/i));

    expect(await screen.findByRole("heading", { name: "Attribution Detail" })).toBeInTheDocument();
    expect(screen.queryByRole("group", { name: "Attribution detail context" })).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Attribution summary strip")).not.toBeInTheDocument();
    expect(screen.queryByRole("tab", { name: /^Effect Breakdown/ })).not.toBeInTheDocument();
    expect(screen.queryByRole("tab", { name: /^Relative Segment Context/ })).not.toBeInTheDocument();
    expect(screen.queryByText("Attribution Summary")).not.toBeInTheDocument();
    expect(await screen.findByLabelText("Asset Class attribution totals")).toBeInTheDocument();
    expect(await screen.findByText("Summary Total")).toBeInTheDocument();
    expect(screen.queryByLabelText("Asset Class attribution table")).not.toBeInTheDocument();
    expect(
      screen.queryByRole("heading", { name: "Relative Segment Context" })
    ).not.toBeInTheDocument();
    expect(screen.queryByText("Top Active Effects")).not.toBeInTheDocument();
  });

  it("shows a truthful attribution state when a ready contract returns no attribution levels", async () => {
    const scenario = buildSupportedPerformanceScenario();
    scenario.workspace = {
      ...scenario.workspace,
      attribution: scenario.workspace.attribution
        ? {
            ...scenario.workspace.attribution,
            levels: [],
          }
        : null,
    };
    installPerformancePageFetchScenario(scenario);

    render(await PerformanceAnalyticsPage({ searchParams: Promise.resolve({}) }));

    fireEvent.click(await findWorkflowControl(/^Performance Analysis/i));

    expect(await screen.findByRole("heading", { name: "Attribution Detail" })).toBeInTheDocument();
    expect(
      await screen.findByText(
        "Attribution detail is marked available, but no segment attribution levels were returned for the current selection."
      )
    ).toBeInTheDocument();
    expect(screen.queryByLabelText("Asset Class attribution table")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Asset Class attribution totals")).not.toBeInTheDocument();
  });

  it("shows a truthful contribution state when a ready contract returns no contribution detail rows", async () => {
    const scenario = buildSupportedPerformanceScenario();
    scenario.workspace = {
      ...scenario.workspace,
      contribution: scenario.workspace.contribution
        ? {
            ...scenario.workspace.contribution,
            position_rows: [],
            levels: [],
          }
        : null,
    };
    installPerformancePageFetchScenario(scenario);

    render(await PerformanceAnalyticsPage({ searchParams: Promise.resolve({}) }));

    fireEvent.click(await findWorkflowControl(/^Performance Analysis/i));

    expect(await screen.findByRole("heading", { name: "Performance Drivers" })).toBeInTheDocument();
    expect(
      await screen.findByText(
        "Contribution detail is marked available, but no position or segment contribution rows were returned for the current selection."
      )
    ).toBeInTheDocument();
    expect(screen.queryByLabelText("Position contribution table")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Asset Class contribution table")).not.toBeInTheDocument();
  });

  it.each([
    {
      name: "supported analysis",
      scenario: buildSupportedPerformanceScenario(),
      expectations: ["Attribution Over Time", "Attribution Detail", "Performance Drivers"],
      absent: ["Attribution detail unavailable", "Contribution detail unavailable"],
    },
    {
      name: "unavailable attribution analysis",
      scenario: buildUnavailableAttributionPerformanceScenario(),
      expectations: ["Performance Drivers"],
      absent: ["Relative Segment Context"],
    },
    {
      name: "unavailable contribution analysis",
      scenario: buildUnavailableContributionPerformanceScenario(),
      expectations: [
        "Contribution detail unavailable",
        "Contribution detail is not available for the current selection.",
      ],
      absent: ["AAPL", "Contribution detail is partial"],
    },
    {
      name: "combined partial analysis",
      scenario: buildCombinedPartialPerformanceScenario(),
      expectations: ["Performance Drivers", "Equity"],
      absent: ["AAPL"],
    },
  ])(
    "renders a contract-backed analysis scenario matrix for $name",
    async ({ scenario, expectations, absent }) => {
      installPerformancePageFetchScenario(scenario);

      render(await PerformanceAnalyticsPage({ searchParams: Promise.resolve({}) }));
      fireEvent.click(await findWorkflowControl(/^Performance Analysis/i));

      for (const text of expectations) {
        await expectTextPresent(text);
      }

      for (const text of absent) {
        expect(screen.queryByText(text)).not.toBeInTheDocument();
      }
    }
  );

  it("disables evidence mode and keeps the page on the current supported surface", async () => {
    installPerformancePageFetchMock();

    render(await PerformanceAnalyticsPage({ searchParams: Promise.resolve({}) }));

    const evidenceTab = await findWorkflowControl(/^Evidence/i);
    expect(evidenceTab).toBeDisabled();
    fireEvent.click(evidenceTab);

    expect(document.querySelector("#performance-evidence.workbench-data-grid-frame")).toBeFalsy();
    expect(screen.queryByTestId("performance-evidence-assurance")).not.toBeInTheDocument();
    expect(screen.queryByText("Evidence and Calculation Context")).not.toBeInTheDocument();
    expect(screen.queryByRole("group", { name: "Performance mode readiness" })).not.toBeInTheDocument();
  });

  it.each<PerformanceWorkspaceScenarioMatrix>([
    {
      name: "supported workspace",
      scenario: buildSupportedPerformanceScenario(),
      summaryExpectations: ["Portfolio Return", "Horizon Comparison"],
      analysisExpectations: ["Attribution Over Time", "Performance Drivers"],
      evidenceExpectations: [],
      summaryAbsent: ["Benchmark not assigned"],
      analysisAbsent: ["Attribution detail unavailable", "Contribution detail unavailable"],
    },
    {
      name: "unavailable attribution workspace",
      scenario: buildUnavailableAttributionPerformanceScenario(),
      summaryExpectations: ["Portfolio Return", "Horizon Comparison"],
      analysisExpectations: ["Performance Drivers"],
      evidenceExpectations: [],
      analysisAbsent: ["Relative Segment Context"],
    },
    {
      name: "unavailable contribution workspace",
      scenario: buildUnavailableContributionPerformanceScenario(),
      summaryExpectations: ["Portfolio Return", "Horizon Comparison"],
      analysisExpectations: [
        "Attribution Over Time",
        "Contribution detail unavailable",
      ],
      evidenceExpectations: [],
      analysisAbsent: ["Contribution detail is partial"],
    },
    {
      name: "combined partial workspace",
      scenario: buildCombinedPartialPerformanceScenario(),
      summaryExpectations: ["Horizon Comparison", "Performance Drivers"],
      analysisExpectations: ["Performance Drivers", "Equity"],
      evidenceExpectations: [],
      analysisAbsent: ["AAPL"],
    },
  ])(
    "renders a contract-backed workspace mode matrix for $name",
    async ({
      scenario,
      summaryExpectations,
      analysisExpectations,
      evidenceExpectations = [],
      summaryAbsent = [],
      analysisAbsent = [],
    }) => {
      installPerformancePageFetchScenario(scenario);

      render(await PerformanceAnalyticsPage({ searchParams: Promise.resolve({}) }));

      expect(await screen.findByRole("button", { name: "Performance Overview" })).toBeInTheDocument();
      for (const text of summaryExpectations) {
        await expectTextPresent(text);
      }
      for (const text of summaryAbsent) {
        expect(screen.queryByText(text)).not.toBeInTheDocument();
      }

      fireEvent.click(await findWorkflowControl(/^Performance Analysis/i));
      for (const text of analysisExpectations) {
        await expectTextPresent(text);
      }
      for (const text of analysisAbsent) {
        expect(screen.queryByText(text)).not.toBeInTheDocument();
      }

      fireEvent.click(await findWorkflowControl("Advisor Brief"));
      expect(
        await screen.findByRole("heading", { name: "Performance Advisor Brief" })
      ).toBeInTheDocument();
      expect(screen.getByLabelText("Source Metrics")).toBeInTheDocument();

      const evidenceTab = await findWorkflowControl(/^Evidence/i);
      expect(evidenceTab).toBeDisabled();
      for (const text of evidenceExpectations) {
        await expectTextPresent(text);
      }
      fireEvent.click(evidenceTab);
      expect(document.querySelector("#performance-evidence.workbench-data-grid-frame")).toBeFalsy();
    }
  );

  it("renders compact unavailable summary states when benchmark and return series are missing", async () => {
    installPerformancePageFetchScenario(buildBenchmarkUnassignedPerformanceScenario());

    render(await PerformanceAnalyticsPage({ searchParams: Promise.resolve({}) }));

    expect(await screen.findByRole("button", { name: "Performance Overview" })).toBeInTheDocument();
    expect(screen.getAllByLabelText("Status Unavailable").length).toBeGreaterThanOrEqual(1);
    await waitFor(() => {
      expect(screen.getByLabelText("Net Return Path unavailable")).toBeInTheDocument();
      expect(
        screen.getByText("Return history is unavailable for the selected window")
      ).toBeInTheDocument();
    });
    const horizonEvidence = await screen.findByTestId("horizon-comparison-evidence");
    expect(horizonEvidence).toHaveAttribute("data-state", "empty");
    expect(horizonEvidence).toHaveTextContent("No published horizon comparison");
    expect(screen.getByText("Performance Drivers")).toBeInTheDocument();
    expect(screen.queryByRole("img", { name: "Net Return Path chart" })).not.toBeInTheDocument();
    expect(screen.queryByText("N/A")).not.toBeInTheDocument();
  });

  it("keeps summary mode free of the duplicate top trust strip when attribution detail is missing", async () => {
    installPerformancePageFetchScenario(buildUnavailableAttributionPerformanceScenario());

    render(await PerformanceAnalyticsPage({ searchParams: Promise.resolve({}) }));

    expect(screen.queryByLabelText("Trust and completeness strip")).not.toBeInTheDocument();
    expect(await screen.findByRole("img", { name: "Net Return Path chart" })).toBeInTheDocument();
  });

  it("renders partial benchmark trust and chart context when a benchmark is assigned but relative returns are incomplete", async () => {
    installPerformancePageFetchScenario(buildPartialBenchmarkPerformanceScenario());

    render(await PerformanceAnalyticsPage({ searchParams: Promise.resolve({}) }));

    expect(await screen.findByRole("button", { name: "Performance Overview" })).toBeInTheDocument();
    expect(screen.queryByLabelText("Trust and completeness strip")).not.toBeInTheDocument();
    expect(screen.queryByRole("group", { name: "Return path context" })).not.toBeInTheDocument();
    await waitFor(() => {
      expect(screen.getByRole("img", { name: "Net Return Path chart" })).toBeInTheDocument();
    });
    expect(screen.queryByText("Benchmark unassigned")).not.toBeInTheDocument();
  });

  it("renders top contributor and detractor cards when only aggregate contribution rows are available", async () => {
    installPerformancePageFetchScenario(buildAggregateContributionPerformanceScenario());

    render(await PerformanceAnalyticsPage({ searchParams: Promise.resolve({}) }));

    expect(await screen.findByRole("button", { name: "Performance Overview" })).toBeInTheDocument();
    expect((await screen.findAllByText("Performance Drivers")).length).toBe(1);
    expect(screen.getByLabelText("Top Contributors impact bars")).toHaveTextContent("Equity");
    expect(screen.getByLabelText("Top Detractors impact bars")).toBeInTheDocument();
    expect(screen.queryByText("Contributor ranking is partial")).not.toBeInTheDocument();
    expect(screen.queryByText("AAPL")).not.toBeInTheDocument();
  });

  it("keeps deferred horizon and contributor modules coherent when multiple support gaps exist", async () => {
    installPerformancePageFetchScenario(buildCombinedPartialPerformanceScenario());

    render(await PerformanceAnalyticsPage({ searchParams: Promise.resolve({}) }));

    expect(await screen.findByRole("button", { name: "Performance Overview" })).toBeInTheDocument();
    expect(screen.queryByLabelText("Trust and completeness strip")).not.toBeInTheDocument();

    const horizonTitles = await screen.findAllByText("Horizon Comparison");
    expect(horizonTitles).toHaveLength(1);
    expect(await screen.findByLabelText("Multi-horizon returns")).toBeInTheDocument();
    expect(screen.getByText("Detailed table")).toBeInTheDocument();
    expect(screen.queryByRole("group", { name: "Horizon comparison context" })).not.toBeInTheDocument();
    expect(screen.getByLabelText("Multi-horizon returns")).toBeInTheDocument();

    expect((await screen.findAllByText("Performance Drivers")).length).toBe(1);
    expect(screen.getByLabelText("Top Contributors impact bars")).toBeInTheDocument();
    expect(screen.getByLabelText("Top Detractors impact bars")).toBeInTheDocument();
    expect(screen.queryByText("Contributor ranking is partial")).not.toBeInTheDocument();
    expect(screen.queryByText("AAPL")).not.toBeInTheDocument();
  });

  it.each<PerformanceSummaryScenario>([
    {
      name: "benchmark-unassigned and return-series-unavailable",
      scenario: buildBenchmarkUnassignedPerformanceScenario(),
      executiveExpectations: [
        "Money-Weighted Return",
        "Flow-Adjusted MV",
      ],
      deferredExpectations: [
        "Return history is unavailable for the selected window",
        "No published horizon comparison",
      ],
      absentTexts: ["Relative Segment Context Partial"],
    },
    {
      name: "assigned benchmark with partial relative comparison",
      scenario: buildPartialBenchmarkPerformanceScenario(),
      executiveExpectations: ["Flow-Adjusted MV"],
      readoutExpectations: ["Money-Weighted Return"],
      horizonExpectations: [
        "Benchmark Global Balanced 60/40",
      ],
      absentTexts: ["Benchmark unassigned"],
    },
    {
      name: "aggregate-only contribution ranking",
      scenario: buildAggregateContributionPerformanceScenario(),
      executiveExpectations: ["Flow-Adjusted MV"],
      readoutExpectations: ["Money-Weighted Return"],
      deferredExpectations: ["Top Contributors", "Top Detractors"],
      horizonExpectations: ["Benchmark Global Balanced 60/40"],
      absentTexts: ["AAPL"],
    },
    {
      name: "combined benchmark, attribution, and contributor support gaps",
      scenario: buildCombinedPartialPerformanceScenario(),
      executiveExpectations: ["Flow-Adjusted MV"],
      readoutExpectations: ["Money-Weighted Return"],
      deferredExpectations: ["Top Contributors", "Top Detractors"],
      horizonExpectations: ["Benchmark Global Balanced 60/40"],
      absentTexts: ["Benchmark unassigned", "AAPL"],
    },
  ])(
    "renders a contract-backed summary supportability matrix for $name",
    async ({
      scenario,
      executiveExpectations = [],
      readoutExpectations = [],
      deferredExpectations = [],
      absentTexts = [],
    }) => {
      installPerformancePageFetchScenario(scenario);

      render(await PerformanceAnalyticsPage({ searchParams: Promise.resolve({}) }));

      expect(await screen.findByRole("button", { name: "Performance Overview" })).toBeInTheDocument();

      const executiveStrip = screen.queryByLabelText("Executive return strip");

      if (executiveExpectations.length) {
        const resolvedExecutiveStrip = await screen.findByLabelText("Executive return strip");
        expect(resolvedExecutiveStrip).toBeInTheDocument();
        for (const text of executiveExpectations) {
          expect(within(resolvedExecutiveStrip).queryAllByText(text).length).toBeGreaterThan(0);
        }
      } else {
        expect(executiveStrip).not.toBeInTheDocument();
      }
      expect(screen.queryByLabelText("Trust and completeness strip")).not.toBeInTheDocument();

      if (readoutExpectations.length) {
        const returnDecisionReadout = await screen.findByLabelText("Return decision readout");
        for (const text of readoutExpectations) {
          expect(within(returnDecisionReadout).queryAllByText(text).length).toBeGreaterThan(0);
        }
      }

      for (const text of deferredExpectations) {
        expect(await screen.findByText(text)).toBeInTheDocument();
      }

      expect(screen.queryByRole("group", { name: "Return path context" })).not.toBeInTheDocument();

      expect(screen.queryByRole("group", { name: "Horizon comparison context" })).not.toBeInTheDocument();

      for (const text of absentTexts) {
        expect(screen.queryByText(text)).not.toBeInTheDocument();
      }
    }
  );

  it("passes a selected benchmark through to summary and deferred details requests", async () => {
    installPerformancePageFetchMock();

    render(
      await PerformanceAnalyticsPage({
        searchParams: Promise.resolve({
          portfolioId: "PF_1001",
          benchmark: "BMK_GLOBAL_BALANCED_60_40",
        }),
      })
    );

    const fetchMock = global.fetch as unknown as ReturnType<typeof vi.fn>;
    const summaryCall = fetchMock.mock.calls.find(([input]) =>
      input.toString().includes("/api/v1/workbench/PF_1001/performance/summary")
    );
    const detailsCall = fetchMock.mock.calls.find(([input]) =>
      input
        .toString()
        .includes("/api/bff/api/v1/workbench/PF_1001/performance/details")
    );
    expect(summaryCall?.[0].toString()).toContain("benchmark_code=BMK_GLOBAL_BALANCED_60_40");
    expect(detailsCall?.[0].toString()).toContain("benchmark_code=BMK_GLOBAL_BALANCED_60_40");
    expect(await screen.findByLabelText("Benchmark")).toHaveValue("BMK_GLOBAL_BALANCED_60_40");
  });
});
