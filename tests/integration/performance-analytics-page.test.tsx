import React from "react";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import PerformanceAnalyticsPage from "../../src/apps/performance/performance-analytics-page";
import {
  buildAggregateContributionPerformanceScenario,
  buildBenchmarkUnassignedPerformanceScenario,
  buildCombinedPartialPerformanceScenario,
  buildPartialBenchmarkPerformanceScenario,
  buildUnavailableAttributionPerformanceScenario,
  type PerformancePresentationScenario,
} from "../fixtures/performance-workspace-fixtures";
import {
  installPerformancePageFetchMock,
  installPerformancePageFetchScenario,
} from "../fixtures/performance-workspace-server-fixtures";

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    replace: vi.fn(),
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
  absentTexts?: string[];
};

describe("PerformanceAnalyticsPage", () => {
  afterEach(() => {
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
    expect(screen.getByLabelText("Executive return strip")).toBeInTheDocument();
    expect(screen.getByLabelText("Trust and completeness strip")).toBeInTheDocument();
  });

  it("renders performance content inside the workstation shell main region", async () => {
    installPerformancePageFetchMock();

    render(await PerformanceAnalyticsPage({ searchParams: Promise.resolve({}) }));

    const mainShell = document.querySelector(".workstation-shell-main");
    expect(mainShell).toBeTruthy();
    expect(await screen.findByRole("heading", { name: "DEMO_ADV_USD_001" })).toBeInTheDocument();
    await waitFor(() => {
      expect(mainShell).toContainElement(screen.getByText("Horizon comparison"));
      expect(screen.getByRole("img", { name: "Net Return Path chart" })).toBeInTheDocument();
      expect(mainShell?.querySelector(".performance-mini-legend.workbench-summary-toolbar")).toBeTruthy();
      expect(screen.getByLabelText("Horizon comparison context")).toHaveTextContent(
        "Active return 0.51%"
      );
    });
    expect(mainShell?.querySelector(".performance-summary-stage")).toBeTruthy();
    expect(mainShell?.querySelector(".performance-chart-stage.workbench-summary-card")).toBeTruthy();
    expect(mainShell?.querySelectorAll(".workbench-summary-region")).toHaveLength(2);
    expect(mainShell?.querySelector(".performance-chart-summary-band.workbench-summary-metric-strip")).toBeTruthy();
    expect(mainShell?.querySelector(".performance-detail-grid")).toBeTruthy();
  });

  it("shows summary modules by default and hides analysis modules", async () => {
    installPerformancePageFetchMock();

    render(await PerformanceAnalyticsPage({ searchParams: Promise.resolve({}) }));

    expect(document.querySelector(".workstation-shell-main")).toBeTruthy();
    expect(await screen.findByRole("heading", { name: "DEMO_ADV_USD_001" })).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.getByRole("img", { name: "Net Return Path chart" })).toBeInTheDocument();
    });
    expect(document.querySelector(".performance-summary-stage")).toBeTruthy();
    const executiveStrip = screen.getByLabelText("Executive return strip");
    expect(within(executiveStrip).getByText("Portfolio Return")).toBeInTheDocument();
    expect(within(executiveStrip).getByText("Benchmark Return")).toBeInTheDocument();
    expect(within(executiveStrip).getByText("Active Return")).toBeInTheDocument();
    expect(within(executiveStrip).getByText("Basis")).toBeInTheDocument();
    expect(within(executiveStrip).getByText("Period")).toBeInTheDocument();
    expect(within(executiveStrip).getByText("Benchmark")).toBeInTheDocument();
    expect(screen.getByText("Assigned")).toBeInTheDocument();
    expect(screen.getAllByText("Ready").length).toBeGreaterThanOrEqual(2);
    expect(await screen.findByText("Horizon comparison")).toBeInTheDocument();
    expect(screen.getByText("Top contributors and detractors")).toBeInTheDocument();
    expect(document.querySelectorAll(".performance-summary-module-card").length).toBeGreaterThanOrEqual(3);
    const contributorsModule = screen
      .getByText("Top contributors and detractors")
      .closest(".performance-summary-module-card");
    expect(contributorsModule).toBeTruthy();
    expect(
      contributorsModule?.querySelectorAll(".workbench-summary-visual-card").length
    ).toBe(2);
    expect(document.querySelector(".workbench-summary-visual-heading")).toBeTruthy();
    expect(document.querySelector(".workbench-summary-visual-label")).toBeTruthy();
    expect(document.querySelector(".workbench-summary-visual-value")).toBeTruthy();
    expect(document.querySelector(".workbench-summary-visual-meta")).toBeTruthy();
    expect(document.querySelector(".performance-summary-kpi-card .workbench-summary-metric-label")).toBeTruthy();
    expect(document.querySelector(".performance-summary-kpi-card .workbench-summary-metric-value")).toBeTruthy();
    expect(screen.queryByText("Attribution Over Time")).not.toBeInTheDocument();
    expect(screen.queryByText("Attribution Detail")).not.toBeInTheDocument();
    expect(screen.queryByText("Contribution Detail")).not.toBeInTheDocument();
    expect(screen.queryByText("Evidence and Calculation Context")).not.toBeInTheDocument();
  });

  it("renders a compact benchmark-unassigned state intentionally in summary mode", async () => {
    installPerformancePageFetchScenario(buildBenchmarkUnassignedPerformanceScenario());

    render(await PerformanceAnalyticsPage({ searchParams: Promise.resolve({}) }));

    expect((await screen.findAllByText("Unassigned")).length).toBeGreaterThanOrEqual(2);
    expect(screen.getByText("Assign a benchmark to enable relative analytics.")).toBeInTheDocument();
    expect(screen.getAllByText("Unavailable").length).toBeGreaterThanOrEqual(2);
    expect(screen.queryByText("N/A")).not.toBeInTheDocument();
  });

  it("keeps first paint focused on the executive and trust strips before deferred summary modules mount", async () => {
    installPerformancePageFetchMock();

    render(await PerformanceAnalyticsPage({ searchParams: Promise.resolve({}) }));

    expect(await screen.findByRole("tab", { name: "Summary" })).toBeInTheDocument();
    expect(screen.getByLabelText("Executive return strip")).toBeInTheDocument();
    expect(screen.getByLabelText("Trust and completeness strip")).toBeInTheDocument();
    expect(screen.queryByRole("img", { name: "Net Return Path chart" })).not.toBeInTheDocument();
    expect(screen.queryByText("Horizon comparison")).not.toBeInTheDocument();
    expect(screen.queryByText("Top contributors and detractors")).not.toBeInTheDocument();
    expect(screen.queryByText("Attribution Detail")).not.toBeInTheDocument();
    expect(screen.queryByText("Evidence unavailable")).not.toBeInTheDocument();
  });

  it("shows analysis modules and hides summary-only modules when analysis mode is selected", async () => {
    installPerformancePageFetchMock();

    render(await PerformanceAnalyticsPage({ searchParams: Promise.resolve({}) }));

    fireEvent.click(await screen.findByRole("tab", { name: "Analysis" }));

    expect(await screen.findByText("Attribution Over Time")).toBeInTheDocument();
    expect(screen.getByText("Attribution Detail")).toBeInTheDocument();
    expect(screen.getByText("Contribution Detail")).toBeInTheDocument();
    expect(screen.getByText("Relative Segment Matrix")).toBeInTheDocument();
    expect(screen.queryByText("Top contributors and detractors")).not.toBeInTheDocument();
    expect(screen.queryByRole("img", { name: "Net Return Path chart" })).not.toBeInTheDocument();
    expect(screen.queryByText("Horizon comparison")).not.toBeInTheDocument();

    const attributionTable = screen.getByLabelText("Asset Class attribution table");
    expect(within(attributionTable).getAllByText("—")).toHaveLength(2);
    const attributionLegend = screen.getByLabelText("Attribution effect legend");
    expect(within(attributionLegend).getByText("Allocation")).toBeInTheDocument();
    expect(within(attributionLegend).getByText("Selection")).toBeInTheDocument();
    expect(within(attributionLegend).getByText("Interaction")).toBeInTheDocument();
  });

  it("renders an evidence placeholder when evidence mode is selected", async () => {
    installPerformancePageFetchMock();

    render(await PerformanceAnalyticsPage({ searchParams: Promise.resolve({}) }));

    fireEvent.click(await screen.findByRole("tab", { name: "Evidence" }));

    expect(await screen.findByText("Evidence unavailable")).toBeInTheDocument();
    expect(
      screen.getByText(
        /execution status, lineage artifacts, and calculation evidence are not exposed by the current backend contract/i
      )
    ).toBeInTheDocument();
    expect(
      screen.getByText(/not exposed by the current gateway contract/i)
    ).toBeInTheDocument();
    expect(screen.queryByText("Top contributors and detractors")).not.toBeInTheDocument();
    expect(screen.queryByText("Attribution Detail")).not.toBeInTheDocument();
  });

  it("renders compact unavailable summary states when benchmark and return series are missing", async () => {
    installPerformancePageFetchScenario(buildBenchmarkUnassignedPerformanceScenario());

    render(await PerformanceAnalyticsPage({ searchParams: Promise.resolve({}) }));

    expect(await screen.findByRole("tab", { name: "Summary" })).toBeInTheDocument();
    expect(screen.getAllByText("Unassigned").length).toBeGreaterThanOrEqual(2);
    expect(
      screen.getByText("Assign a benchmark to enable relative analytics.")
    ).toBeInTheDocument();
    expect(screen.getAllByText("Unavailable").length).toBeGreaterThanOrEqual(3);
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
    expect(
      within(trustStrip).getByText("Attribution detail is not available for the current selection.")
    ).toBeInTheDocument();
    expect(within(trustStrip).getByText("Evidence")).toBeInTheDocument();
    expect(within(trustStrip).getByText("Pending")).toBeInTheDocument();
  });

  it("renders partial benchmark trust and chart context when a benchmark is assigned but relative returns are incomplete", async () => {
    installPerformancePageFetchScenario(buildPartialBenchmarkPerformanceScenario());

    render(await PerformanceAnalyticsPage({ searchParams: Promise.resolve({}) }));

    expect(await screen.findByRole("tab", { name: "Summary" })).toBeInTheDocument();
    expect(screen.getByText("Partial")).toBeInTheDocument();
    expect(
      screen.getAllByText("A benchmark is assigned, but benchmark-relative returns are incomplete.")
    ).toHaveLength(2);
    expect(await screen.findByRole("group", { name: "Return path context" })).toHaveTextContent(
      "Compared against Global Balanced 60/40"
    );
    expect(screen.getByRole("group", { name: "Return path context" })).toHaveTextContent(
      "Active return Unavailable"
    );
    expect(screen.getByRole("group", { name: "Return path context" })).toHaveTextContent(
      "Relative context Partial"
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
    expect(await screen.findByText("Top contributors and detractors")).toBeInTheDocument();
    expect(screen.getByText("Contributor ranking is partial")).toBeInTheDocument();
    expect(
      screen.getByText("Contribution exists, but only aggregate rows are available.")
    ).toBeInTheDocument();
    expect(screen.queryByText("AAPL")).not.toBeInTheDocument();
  });

  it.each<PerformanceSummaryScenario>([
    {
      name: "benchmark-unassigned and return-series-unavailable",
      scenario: buildBenchmarkUnassignedPerformanceScenario(),
      executiveExpectations: ["Unassigned"],
      trustExpectations: [
        "No benchmark is assigned to this mandate.",
        "Published return observations are not available for the selected horizon.",
        "Unavailable",
      ],
      deferredExpectations: ["Return series unavailable"],
      absentTexts: ["Relative context Partial"],
    },
    {
      name: "assigned benchmark with partial relative comparison",
      scenario: buildPartialBenchmarkPerformanceScenario(),
      executiveExpectations: ["Global Balanced 60/40"],
      trustExpectations: [
        "Partial",
        "A benchmark is assigned, but benchmark-relative returns are incomplete.",
      ],
      contextExpectations: ["Relative context Partial", "Compared against Global Balanced 60/40"],
      absentTexts: ["Benchmark unassigned"],
    },
    {
      name: "aggregate-only contribution ranking",
      scenario: buildAggregateContributionPerformanceScenario(),
      executiveExpectations: ["Global Balanced 60/40"],
      trustExpectations: [],
      deferredExpectations: ["Contributor ranking is partial"],
      absentTexts: ["AAPL"],
    },
    {
      name: "combined benchmark, attribution, and contributor support gaps",
      scenario: buildCombinedPartialPerformanceScenario(),
      executiveExpectations: ["Global Balanced 60/40"],
      trustExpectations: [
        "Partial",
        "Unavailable",
        "A benchmark is assigned, but benchmark-relative returns are incomplete.",
        "Attribution detail is not available for the current selection.",
      ],
      deferredExpectations: ["Contributor ranking is partial"],
      contextExpectations: ["Relative context Partial", "Active return Unavailable"],
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
      absentTexts = [],
    }) => {
      installPerformancePageFetchScenario(scenario);

      render(await PerformanceAnalyticsPage({ searchParams: Promise.resolve({}) }));

      expect(await screen.findByRole("tab", { name: "Summary" })).toBeInTheDocument();

      const executiveStrip = screen.getByLabelText("Executive return strip");
      const trustStrip = screen.getByLabelText("Trust and completeness strip");

      for (const text of executiveExpectations) {
        expect(within(executiveStrip).queryAllByText(text).length).toBeGreaterThan(0);
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
          expect(returnPathContext).toHaveTextContent(text);
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
