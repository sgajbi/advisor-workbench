import React from "react";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import PerformanceAnalyticsPage from "../../src/apps/performance/performance-analytics-page";
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
  useRouter: () => ({
    replace: replaceMock,
  }),
}));

vi.mock("next/dynamic", () => ({
  default: (loader: () => Promise<unknown>) => {
    const React = require("react");
    return function MockDynamicComponent(props: Record<string, unknown>) {
      const [Component, setComponent] = React.useState(
        null as React.ComponentType<Record<string, unknown>> | null
      );
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
  trustExpectations?: string[];
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

async function expectTextPresent(text: string) {
  const matches = await screen.findAllByText(text);
  expect(matches.length).toBeGreaterThan(0);
}

describe("PerformanceAnalyticsPage", () => {
  afterEach(() => {
    replaceMock.mockReset();
    vi.unstubAllGlobals();
  });

  it("uses the shared full-width workstation shell instead of a centered page container", async () => {
    installPerformancePageFetchMock();

    render(await PerformanceAnalyticsPage({ searchParams: Promise.resolve({}) }));

    expect(await screen.findByRole("tab", { name: "Summary" })).toBeInTheDocument();
    expect(document.querySelector("main.workstation-page.performance-page")).toBeTruthy();
    expect(document.querySelector(".page-container")).toBeFalsy();
    expect(document.querySelector(".workbench-page-frame.performance-page-frame")).toBeTruthy();
    expect(document.querySelector(".workbench-page-frame-header.workbench-page-header")).toBeTruthy();
    expect(document.querySelector(".workbench-page-frame-body.performance-page-frame-body")).toBeTruthy();
    expect(document.querySelector(".workbench-section-stack.performance-page-sections")).toBeTruthy();
    expect(document.querySelector(".workstation-shell-main-only")).toBeTruthy();
    expect(document.querySelector(".lotus-workstation-header")).toBeFalsy();
    expect(document.querySelector(".workbench-page-header")).toBeTruthy();
    expect(document.querySelector(".performance-summary-stage")).toBeTruthy();
    expect(document.querySelectorAll(".workbench-summary-module-card").length).toBeGreaterThanOrEqual(1);
    expect(screen.getByRole("heading", { name: "Performance Workbench" })).toBeInTheDocument();
    expect(
      screen.getByText(
        "Benchmark-aware portfolio performance, attribution, and contribution analysis"
      )
    ).toBeInTheDocument();
    expect(document.querySelector(".workbench-page-header-actions .workbench-segmented-control"))
      .toBeTruthy();
    expect(screen.getByLabelText("Executive return strip")).toBeInTheDocument();
    expect(screen.getByLabelText("Trust and completeness strip")).toBeInTheDocument();
  });

  it("renders performance content inside the workstation shell main region", async () => {
    installPerformancePageFetchMock();

    render(await PerformanceAnalyticsPage({ searchParams: Promise.resolve({}) }));

    const mainShell = document.querySelector(".workstation-shell-main");
    expect(mainShell).toBeTruthy();
    expect(screen.getByLabelText("Executive return strip")).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.getAllByText("How did this compare across horizons?")).toHaveLength(1);
      expect(screen.getByRole("img", { name: "Net Return Path chart" })).toBeInTheDocument();
      expect(mainShell?.querySelector(".performance-mini-legend.workbench-summary-toolbar")).toBeTruthy();
      expect(screen.getByRole("tablist", { name: "Horizon table view" })).toBeInTheDocument();
      expect(screen.getByRole("tablist", { name: "Horizon basis view" })).toBeInTheDocument();
      expect(screen.getByRole("tablist", { name: "Return path view mode" })).toBeInTheDocument();
      expect(screen.getByLabelText("Horizon comparison context")).toHaveTextContent(
        compactPattern("Active return 0.51%")
      );
      expect(screen.getByLabelText("Multi-horizon return table")).toBeInTheDocument();
    });
    expect(mainShell?.querySelector(".performance-summary-stage")).toBeTruthy();
    expect(mainShell?.querySelector(".performance-chart-stage.workbench-chart-shell")).toBeTruthy();
    expect(mainShell?.querySelector(".workbench-chart-shell-context")).toBeFalsy();
    expect(mainShell?.querySelector(".workbench-chart-shell-body .performance-chart-context-strip")).toBeTruthy();
    expect(mainShell?.querySelectorAll(".workbench-summary-region")).toHaveLength(2);
    const chartSummaryBand = mainShell?.querySelector(".performance-outcome-strip.workbench-summary-metric-strip");
    expect(chartSummaryBand).toBeTruthy();
    expect(within(chartSummaryBand as HTMLElement).getByText("Portfolio Return")).toBeInTheDocument();
    expect(within(chartSummaryBand as HTMLElement).getByText("Benchmark Return")).toBeInTheDocument();
    expect(within(chartSummaryBand as HTMLElement).getByText("Active Return")).toBeInTheDocument();
    expect(within(chartSummaryBand as HTMLElement).getByText("Net Flow")).toBeInTheDocument();
    expect(within(chartSummaryBand as HTMLElement).getByText("Ending MV")).toBeInTheDocument();
    expect(within(chartSummaryBand as HTMLElement).getByText("Basis / Period")).toBeInTheDocument();
    expect(screen.getByLabelText("Return path observation table")).toBeInTheDocument();
    expect(mainShell?.querySelector(".performance-detail-grid")).toBeTruthy();
  });

  it("shows summary modules by default and hides analysis modules", async () => {
    installPerformancePageFetchMock();

    render(await PerformanceAnalyticsPage({ searchParams: Promise.resolve({}) }));

    expect(document.querySelector(".workstation-shell-main")).toBeTruthy();
    expect(screen.getByLabelText("Executive return strip")).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.getByRole("img", { name: "Net Return Path chart" })).toBeInTheDocument();
    });
    expect(document.querySelector(".performance-summary-stage")).toBeTruthy();
    const executiveStrip = screen.getByLabelText("Executive return strip");
    expect(within(executiveStrip).getByText("Portfolio Return")).toBeInTheDocument();
    expect(within(executiveStrip).getByText("Benchmark Return")).toBeInTheDocument();
    expect(within(executiveStrip).getByText("Active Return")).toBeInTheDocument();
    expect(within(executiveStrip).getByText("Net Flow")).toBeInTheDocument();
    expect(within(executiveStrip).getByText("Ending MV")).toBeInTheDocument();
    expect(within(executiveStrip).getByText("Basis / Period")).toBeInTheDocument();
    expect(executiveStrip).toHaveTextContent(
      compactPattern(
        "01 Jan 2026 - 24 Feb 2026 • MWR XIRR • Stateful inputs • 01 Jan 2026 - 24 Feb 2026 • Flow-adj $1,208,000"
      )
    );
    expect(executiveStrip.querySelector(".performance-outcome-strip-item")).toBeTruthy();
    expect(screen.getByText("Assigned")).toBeInTheDocument();
    expect(screen.getAllByText("Ready").length).toBeGreaterThanOrEqual(2);
    expect((await screen.findAllByText("How did this compare across horizons?")).length).toBe(1);
    expect(screen.getAllByText("What drove the result?").length).toBe(1);
    expect(screen.getByLabelText("Contributor driver strip")).toBeInTheDocument();
    expect(document.querySelectorAll(".workbench-chart-shell").length).toBeGreaterThanOrEqual(3);
    expect(document.querySelectorAll(".performance-summary-driver-module.workbench-chart-shell")).toHaveLength(2);
    const contributorsModule =
      screen
        .getAllByText("What drove the result?")
        .map((node) => node.closest(".workbench-chart-shell"))
        .find(Boolean) ?? null;
    expect(contributorsModule).toBeTruthy();
    expect(
      contributorsModule?.querySelectorAll(".workbench-summary-visual-card").length
    ).toBe(2);
    expect(contributorsModule?.querySelectorAll(".workbench-ranked-bar-list").length).toBe(2);
    expect(document.querySelector(".workbench-summary-visual-heading")).toBeTruthy();
    expect(document.querySelector(".workbench-summary-visual-label")).toBeTruthy();
    expect(document.querySelector(".workbench-summary-visual-value")).toBeTruthy();
    expect(document.querySelector(".workbench-summary-visual-meta")).toBeTruthy();
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
    expect(within(executiveStrip).getByText("Basis / Period")).toBeInTheDocument();
    expect(executiveStrip).toHaveTextContent(
      compactPattern(
        "01 Jan 2026 - 24 Feb 2026 • MWR XIRR • Stateful inputs • 01 Jan 2026 - 24 Feb 2026 • Flow-adj $1,208,000"
      )
    );
    expect(within(executiveStrip).getByText("Net • QTD")).toBeInTheDocument();
  });

  it("renders a compact benchmark-unassigned state intentionally in summary mode", async () => {
    installPerformancePageFetchScenario(buildBenchmarkUnassignedPerformanceScenario());

    render(await PerformanceAnalyticsPage({ searchParams: Promise.resolve({}) }));

    expect((await screen.findAllByText("Unassigned")).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("Benchmark not assigned").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("Unavailable").length).toBeGreaterThanOrEqual(1);
    expect(screen.queryByText("N/A")).not.toBeInTheDocument();
  });

  it("renders the compact top analysis zone with chart-first hierarchy on first paint", async () => {
    installPerformancePageFetchMock();

    render(await PerformanceAnalyticsPage({ searchParams: Promise.resolve({}) }));

    expect(await screen.findByRole("tab", { name: "Summary" })).toBeInTheDocument();
    expect(screen.getByLabelText("Executive return strip")).toBeInTheDocument();
    expect(screen.getByLabelText("Trust and completeness strip")).toBeInTheDocument();
    expect(await screen.findByRole("img", { name: "Net Return Path chart" })).toBeInTheDocument();
    expect(document.querySelector(".performance-analysis-control-bar")).toBeTruthy();
    expect(document.querySelector(".performance-outcome-strip")).toBeTruthy();
    expect(screen.queryByText("Attribution Detail")).not.toBeInTheDocument();
    expect(screen.getByRole("group", { name: "Performance mode readiness" })).toHaveTextContent(
      "Evidence pending contract"
    );
  });

  it("shows analysis modules and hides summary-only modules when analysis mode is selected", async () => {
    installPerformancePageFetchMock();

    render(await PerformanceAnalyticsPage({ searchParams: Promise.resolve({}) }));

    fireEvent.click(await screen.findByRole("tab", { name: "Analysis" }));

    expect(await screen.findByText("Attribution Over Time")).toBeInTheDocument();
    expect(document.querySelector(".performance-analysis-trend-shell.workbench-chart-shell")).toBeTruthy();
    expect(screen.getByLabelText("Attribution trend context")).toBeInTheDocument();
    expect(await screen.findByLabelText("Attribution trend summary strip")).toBeInTheDocument();
    expect(screen.getByText("Attribution Detail")).toBeInTheDocument();
    expect(screen.getByRole("group", { name: "Attribution detail context" })).toBeInTheDocument();
    expect(screen.getByText("What drove the result?")).toBeInTheDocument();
    expect(screen.getByLabelText("Contribution detail summary strip")).toBeInTheDocument();
    expect(document.querySelector(".performance-analysis-stage")).toBeTruthy();
    expect(document.querySelector("#performance-attribution.workbench-chart-shell")).toBeTruthy();
    expect(document.querySelector("#performance-drivers.workbench-data-grid-frame")).toBeTruthy();
    expect(document.querySelectorAll(".performance-analysis-toolbar").length).toBeGreaterThanOrEqual(2);
    expect(document.querySelector(".performance-relative-segment-module.workbench-chart-shell")).toBeTruthy();
    expect(document.querySelector("#performance-drivers .performance-analysis-drilldown-workspace")).toBeTruthy();
    expect(document.querySelectorAll("#performance-drivers .performance-analysis-drilldown-pane")).toHaveLength(2);
    expect(screen.getByLabelText("Contribution ranked insight panel")).toBeInTheDocument();
    expect(screen.getByLabelText("Contribution detail grid panel")).toBeInTheDocument();
    expect(screen.getByLabelText("Attribution ranked insight panel")).toBeInTheDocument();
    expect(screen.getByLabelText("Attribution detail grid panel")).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: /^Positions/ })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByRole("tab", { name: /^Segment breakdown/ })).toHaveAttribute(
      "aria-selected",
      "false"
    );
    expect(document.querySelectorAll("#performance-drivers .performance-analysis-table").length).toBe(1);
    expect(screen.getByRole("tab", { name: "Relative context" })).toHaveAttribute(
      "aria-selected",
      "true"
    );
    expect(screen.getByRole("tab", { name: /^Effect breakdown/ })).toHaveAttribute(
      "aria-selected",
      "false"
    );
    expect(screen.getByLabelText("Attribution summary strip")).toBeInTheDocument();
    expect(screen.getByText("Relative Segment Matrix")).toBeInTheDocument();
    expect(screen.queryByLabelText("Asset Class attribution table")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("tab", { name: /^Effect breakdown/ }));
    const attributionTable = await screen.findByLabelText("Asset Class attribution table");
    expect(screen.queryByRole("img", { name: "Net Return Path chart" })).not.toBeInTheDocument();
    expect(screen.queryByText("How did this compare across horizons?")).not.toBeInTheDocument();
    expect(within(attributionTable).getAllByText("—")).toHaveLength(2);
    const attributionLegend = screen.getByLabelText("Attribution effect legend");
    expect(within(attributionLegend).getByText("Allocation")).toBeInTheDocument();
    expect(within(attributionLegend).getByText("Selection")).toBeInTheDocument();
    expect(within(attributionLegend).getByText("Interaction")).toBeInTheDocument();
  });

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

      fireEvent.click(await screen.findByRole("tab", { name: "Analysis" }));

      await waitFor(() => {
        expect(replaceMock).toHaveBeenCalledWith(
          "/performance?portfolioId=DEMO_ADV_USD_001&period=YTD&detailBasis=NET&contributionDimension=asset_class&attributionDimension=asset_class&chartFrequency=monthly&benchmark=BMK_GLOBAL_BALANCED_60_40",
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

  it("uses the shared analysis state panel when attribution detail is unavailable", async () => {
    installPerformancePageFetchScenario(buildUnavailableAttributionPerformanceScenario());

    render(await PerformanceAnalyticsPage({ searchParams: Promise.resolve({}) }));

    fireEvent.click(await screen.findByRole("tab", { name: "Analysis" }));

    expect(await screen.findByText("Attribution detail unavailable")).toBeInTheDocument();
    expect(
      document.querySelector(".performance-analysis-state-panel-unavailable .module-state-panel")
    ).toBeTruthy();
    expect(document.querySelectorAll(".performance-analysis-state-panel").length).toBeGreaterThanOrEqual(1);
    expect(document.querySelector(".performance-relative-segment-module")).toBeFalsy();
    expect(screen.getByText("What drove the result?")).toBeInTheDocument();
  });

  it("renders summary-only attribution totals when detailed rows are unavailable", async () => {
    installPerformancePageFetchScenario(buildPartialAttributionPerformanceScenario());

    render(await PerformanceAnalyticsPage({ searchParams: Promise.resolve({}) }));

    fireEvent.click(await screen.findByRole("tab", { name: "Analysis" }));

    expect(await screen.findByText("Attribution Detail")).toBeInTheDocument();
    expect(screen.getByRole("group", { name: "Attribution detail context" })).toBeInTheDocument();
    expect(await screen.findByLabelText("Attribution summary strip")).toBeInTheDocument();
    expect(screen.queryByText("Summary-only attribution")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("tab", { name: /^Effect breakdown/ }));
    expect(await screen.findByText("Summary-only attribution")).toBeInTheDocument();
    expect(await screen.findByLabelText("Asset Class attribution totals")).toBeInTheDocument();
    expect(await screen.findByText("Summary totals")).toBeInTheDocument();
    expect(screen.queryByLabelText("Asset Class attribution table")).not.toBeInTheDocument();
    expect(screen.queryByText("Relative Segment Matrix")).not.toBeInTheDocument();
    expect(screen.getByText("Total Effect Ranking")).toBeInTheDocument();
  });

  it.each([
    {
      name: "supported analysis",
      scenario: buildSupportedPerformanceScenario(),
      expectations: ["Attribution Over Time", "Attribution Detail", "What drove the result?"],
      absent: ["Attribution detail unavailable", "Contribution detail unavailable"],
    },
    {
      name: "unavailable attribution analysis",
      scenario: buildUnavailableAttributionPerformanceScenario(),
      expectations: ["Attribution detail unavailable"],
      absent: ["Relative Segment Matrix"],
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
      expectations: [
        "Attribution detail unavailable",
        "What drove the result?",
        "Equity",
      ],
      absent: ["AAPL"],
    },
  ])(
    "renders a contract-backed analysis scenario matrix for $name",
    async ({ scenario, expectations, absent }) => {
      installPerformancePageFetchScenario(scenario);

      render(await PerformanceAnalyticsPage({ searchParams: Promise.resolve({}) }));
      fireEvent.click(await screen.findByRole("tab", { name: "Analysis" }));

      for (const text of expectations) {
        expect(await screen.findByText(text)).toBeInTheDocument();
      }

      expect(document.querySelector(".performance-analysis-stage")).toBeTruthy();
      expect(document.querySelectorAll(".performance-analysis-toolbar").length).toBeGreaterThanOrEqual(1);

      for (const text of absent) {
        expect(screen.queryByText(text)).not.toBeInTheDocument();
      }
    }
  );

  it("disables evidence mode and keeps the page on the current supported surface", async () => {
    installPerformancePageFetchMock();

    render(await PerformanceAnalyticsPage({ searchParams: Promise.resolve({}) }));

    const evidenceTab = await screen.findByRole("tab", { name: "Evidence" });
    expect(evidenceTab).toBeDisabled();
    expect(screen.getByRole("group", { name: "Performance mode readiness" })).toHaveTextContent(
      "Evidence pending contract"
    );
    fireEvent.click(evidenceTab);

    expect(document.querySelector("#performance-evidence.workbench-data-grid-frame")).toBeFalsy();
    expect(document.querySelector(".performance-evidence-module")).toBeFalsy();
    expect(screen.queryByText("Evidence and Calculation Context")).not.toBeInTheDocument();
    expect(screen.queryByText("Evidence pending contract")).toBeInTheDocument();
  });

  it.each<PerformanceWorkspaceScenarioMatrix>([
    {
      name: "supported workspace",
      scenario: buildSupportedPerformanceScenario(),
      summaryExpectations: ["Portfolio Return", "How did this compare across horizons?"],
      analysisExpectations: ["Attribution Over Time", "What drove the result?"],
      evidenceExpectations: ["Evidence pending contract"],
      summaryAbsent: ["Benchmark not assigned"],
      analysisAbsent: ["Attribution detail unavailable", "Contribution detail unavailable"],
    },
    {
      name: "unavailable attribution workspace",
      scenario: buildUnavailableAttributionPerformanceScenario(),
      summaryExpectations: ["Attribution", "Unavailable"],
      analysisExpectations: ["Attribution detail unavailable", "What drove the result?"],
      evidenceExpectations: ["Evidence pending contract"],
      analysisAbsent: ["Relative Segment Matrix"],
    },
    {
      name: "unavailable contribution workspace",
      scenario: buildUnavailableContributionPerformanceScenario(),
      summaryExpectations: ["Contribution", "Unavailable"],
      analysisExpectations: [
        "Attribution Over Time",
        "Contribution detail unavailable",
      ],
      evidenceExpectations: ["Evidence pending contract"],
      analysisAbsent: ["Contribution detail is partial"],
    },
    {
      name: "combined partial workspace",
      scenario: buildCombinedPartialPerformanceScenario(),
      summaryExpectations: ["Relative returns incomplete", "Attribution detail unavailable"],
      analysisExpectations: [
        "Attribution detail unavailable",
        "What drove the result?",
        "Equity",
      ],
      evidenceExpectations: ["Evidence pending contract"],
      analysisAbsent: ["AAPL"],
    },
  ])(
    "renders a contract-backed workspace mode matrix for $name",
    async ({
      scenario,
      summaryExpectations,
      analysisExpectations,
      evidenceExpectations = ["Evidence pending contract"],
      summaryAbsent = [],
      analysisAbsent = [],
    }) => {
      installPerformancePageFetchScenario(scenario);

      render(await PerformanceAnalyticsPage({ searchParams: Promise.resolve({}) }));

      expect(await screen.findByRole("tab", { name: "Summary" })).toBeInTheDocument();
      for (const text of summaryExpectations) {
        await expectTextPresent(text);
      }
      expect(document.querySelector(".performance-summary-stage")).toBeTruthy();
      for (const text of summaryAbsent) {
        expect(screen.queryByText(text)).not.toBeInTheDocument();
      }

      fireEvent.click(screen.getByRole("tab", { name: "Analysis" }));
      for (const text of analysisExpectations) {
        await expectTextPresent(text);
      }
      expect(document.querySelector(".performance-analysis-stage")).toBeTruthy();
      for (const text of analysisAbsent) {
        expect(screen.queryByText(text)).not.toBeInTheDocument();
      }

      const evidenceTab = screen.getByRole("tab", { name: "Evidence" });
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

    expect(await screen.findByRole("tab", { name: "Summary" })).toBeInTheDocument();
    expect(screen.getAllByText("Unassigned").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("Benchmark not assigned").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("Unavailable").length).toBeGreaterThanOrEqual(1);
    await waitFor(() => {
      expect(screen.getByLabelText("Net Return Path unavailable")).toBeInTheDocument();
      expect(screen.getByText("Return series unavailable")).toBeInTheDocument();
    });
    expect(screen.queryByRole("img", { name: "Net Return Path chart" })).not.toBeInTheDocument();
    expect(screen.queryByText("N/A")).not.toBeInTheDocument();
  });

  it("renders attribution as unavailable in the trust strip when attribution detail is missing", async () => {
    installPerformancePageFetchScenario(buildUnavailableAttributionPerformanceScenario());

    render(await PerformanceAnalyticsPage({ searchParams: Promise.resolve({}) }));

    const trustStrip = await screen.findByLabelText("Trust and completeness strip");
    expect(within(trustStrip).getByText("Attribution")).toBeInTheDocument();
    expect(within(trustStrip).getByText("Unavailable")).toBeInTheDocument();
    expect(within(trustStrip).getByText("Attribution detail unavailable")).toBeInTheDocument();
    expect(within(trustStrip).getByText("Evidence")).toBeInTheDocument();
    expect(within(trustStrip).getByText("Pending")).toBeInTheDocument();
    expect(trustStrip.querySelectorAll(".performance-trust-item .status-chip")).toHaveLength(5);
  });

  it("renders partial benchmark trust and chart context when a benchmark is assigned but relative returns are incomplete", async () => {
    installPerformancePageFetchScenario(buildPartialBenchmarkPerformanceScenario());

    render(await PerformanceAnalyticsPage({ searchParams: Promise.resolve({}) }));

    expect(await screen.findByRole("tab", { name: "Summary" })).toBeInTheDocument();
    expect(screen.getByText("Partial")).toBeInTheDocument();
    expect(screen.getAllByText("Relative returns incomplete").length).toBeGreaterThanOrEqual(1);
    expect(await screen.findByRole("group", { name: "Return path context" })).toHaveTextContent(
      compactPattern("Benchmark Global Balanced 60/40")
    );
    expect(screen.getByRole("group", { name: "Return path context" })).toHaveTextContent(
      compactPattern("Active Unavailable")
    );
    await waitFor(() => {
      expect(screen.getByRole("img", { name: "Net Return Path chart" })).toBeInTheDocument();
    });
    expect(screen.queryByText("Benchmark unassigned")).not.toBeInTheDocument();
  });

  it("renders a contributor-ranking partial state when only aggregate contribution rows are available", async () => {
    installPerformancePageFetchScenario(buildAggregateContributionPerformanceScenario());

    render(await PerformanceAnalyticsPage({ searchParams: Promise.resolve({}) }));

    expect(await screen.findByRole("tab", { name: "Summary" })).toBeInTheDocument();
    expect((await screen.findAllByText("What drove the result?")).length).toBe(1);
    expect(await screen.findByText("Contributor ranking is partial")).toBeInTheDocument();
    expect(
      screen.getByText("Contribution exists, but only aggregate rows are available.")
    ).toBeInTheDocument();
    expect(
      screen.getByText("Aggregate contribution remains available even when position-level ranking is absent.")
    ).toBeInTheDocument();
    expect(screen.getByText("High coverage")).toBeInTheDocument();
    expect(screen.getByText("Reconciles to return")).toBeInTheDocument();
    expect(screen.getByLabelText("Aggregate contributor summary")).toBeInTheDocument();
    expect(screen.getByText("Equity")).toBeInTheDocument();
    expect(screen.queryByText("AAPL")).not.toBeInTheDocument();
  });

  it("keeps deferred horizon and contributor modules coherent when multiple support gaps exist", async () => {
    installPerformancePageFetchScenario(buildCombinedPartialPerformanceScenario());

    render(await PerformanceAnalyticsPage({ searchParams: Promise.resolve({}) }));

    expect(await screen.findByRole("tab", { name: "Summary" })).toBeInTheDocument();

    const trustStrip = screen.getByLabelText("Trust and completeness strip");
    expect(within(trustStrip).getAllByText("Partial").length).toBeGreaterThan(0);
    expect(within(trustStrip).getAllByText("Unavailable").length).toBeGreaterThan(0);

    const horizonTitles = await screen.findAllByText("How did this compare across horizons?");
    expect(horizonTitles).toHaveLength(1);
    expect(await screen.findByLabelText("Multi-horizon returns")).toBeInTheDocument();
    expect(screen.getByRole("group", { name: "Horizon comparison context" })).toHaveTextContent(
      compactPattern("Active return Unavailable")
    );
    expect(screen.getByRole("group", { name: "Horizon comparison context" })).toHaveTextContent(
      compactPattern("Compared against Global Balanced 60/40")
    );
    expect(screen.getByLabelText("Multi-horizon returns")).toBeInTheDocument();

    expect((await screen.findAllByText("What drove the result?")).length).toBe(1);
    expect(screen.getByText("Contributor ranking is partial")).toBeInTheDocument();
    expect(screen.getByText("Contribution exists, but only aggregate rows are available.")).toBeInTheDocument();
    expect(
      screen.getByText("Aggregate contribution remains available even when position-level ranking is absent.")
    ).toBeInTheDocument();
    expect(screen.getByLabelText("Aggregate contributor summary")).toBeInTheDocument();
    expect(screen.getByText("Equity")).toBeInTheDocument();
    expect(screen.queryByText("AAPL")).not.toBeInTheDocument();
  });

  it.each<PerformanceSummaryScenario>([
    {
      name: "benchmark-unassigned and return-series-unavailable",
      scenario: buildBenchmarkUnassignedPerformanceScenario(),
      executiveExpectations: [],
      trustExpectations: [
        "Benchmark not assigned",
        "Published observations unavailable",
        "Unavailable",
      ],
      deferredExpectations: [
        "Return series unavailable",
        "Horizon comparison is unavailable for this mandate.",
      ],
      absentTexts: ["Relative context Partial"],
    },
    {
      name: "assigned benchmark with partial relative comparison",
      scenario: buildPartialBenchmarkPerformanceScenario(),
      executiveExpectations: ["Basis / Period", "Portfolio Return"],
      trustExpectations: [
        "Partial",
        "Relative returns incomplete",
      ],
      contextExpectations: ["Active Unavailable", "Benchmark Global Balanced 60/40"],
      horizonExpectations: [
        "Active return Unavailable",
        "Compared against Global Balanced 60/40",
      ],
      absentTexts: ["Benchmark unassigned"],
    },
    {
      name: "aggregate-only contribution ranking",
      scenario: buildAggregateContributionPerformanceScenario(),
      executiveExpectations: ["Basis / Period", "Portfolio Return"],
      trustExpectations: [],
      deferredExpectations: ["Contributor ranking is partial"],
      horizonExpectations: ["Active return 0.51%", "Compared against Global Balanced 60/40"],
      absentTexts: ["AAPL"],
    },
    {
      name: "combined benchmark, attribution, and contributor support gaps",
      scenario: buildCombinedPartialPerformanceScenario(),
      executiveExpectations: ["Basis / Period", "Portfolio Return"],
      trustExpectations: [
        "Partial",
        "Unavailable",
        "Relative returns incomplete",
        "Attribution detail unavailable",
      ],
      deferredExpectations: ["Contributor ranking is partial"],
      contextExpectations: ["Active Unavailable"],
      horizonExpectations: ["Active return Unavailable", "Compared against Global Balanced 60/40"],
      absentTexts: ["Benchmark unassigned", "AAPL"],
    },
  ])(
    "renders a contract-backed summary supportability matrix for $name",
    async ({
      scenario,
      executiveExpectations = [],
      trustExpectations = [],
      deferredExpectations = [],
      contextExpectations = [],
      horizonExpectations = [],
      absentTexts = [],
    }) => {
      installPerformancePageFetchScenario(scenario);

      render(await PerformanceAnalyticsPage({ searchParams: Promise.resolve({}) }));

      expect(await screen.findByRole("tab", { name: "Summary" })).toBeInTheDocument();

      const executiveStrip = screen.queryByLabelText("Executive return strip");
      const trustStrip = screen.getByLabelText("Trust and completeness strip");

      if (executiveExpectations.length) {
        expect(executiveStrip).toBeInTheDocument();
        for (const text of executiveExpectations) {
          expect(within(executiveStrip as HTMLElement).queryAllByText(text).length).toBeGreaterThan(0);
        }
      } else {
        expect(executiveStrip).not.toBeInTheDocument();
      }

      for (const text of trustExpectations) {
        expect(within(trustStrip).queryAllByText(text).length).toBeGreaterThan(0);
      }

      for (const text of deferredExpectations) {
        expect(await screen.findByText(text)).toBeInTheDocument();
      }

      if (contextExpectations.length) {
        const returnPathContext = await screen.findByRole("group", { name: "Return path context" });
        for (const text of contextExpectations) {
          expect(returnPathContext).toHaveTextContent(compactPattern(text));
        }
      }

      if (horizonExpectations.length) {
        const horizonContext = await screen.findByRole("group", { name: "Horizon comparison context" });
        for (const text of horizonExpectations) {
          expect(horizonContext).toHaveTextContent(compactPattern(text));
        }
      }

      for (const text of absentTexts) {
        expect(screen.queryByText(text)).not.toBeInTheDocument();
      }
    }
  );

  it("passes a selected benchmark through to summary and details requests", async () => {
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
    await waitFor(() => {
      expect(
        fetchMock.mock.calls.some(([input]) =>
          input.toString().includes("/api/v1/workbench/PF_1001/performance/details")
        )
      ).toBe(true);
    });
    const detailsCall = fetchMock.mock.calls.find(([input]) =>
      input.toString().includes("/api/v1/workbench/PF_1001/performance/details")
    );
    expect(summaryCall?.[0].toString()).toContain("benchmark_code=BMK_GLOBAL_BALANCED_60_40");
    expect(detailsCall?.[0].toString()).toContain("benchmark_code=BMK_GLOBAL_BALANCED_60_40");
    expect(await screen.findByLabelText("Compared To")).toHaveValue("BMK_GLOBAL_BALANCED_60_40");
  });
});
