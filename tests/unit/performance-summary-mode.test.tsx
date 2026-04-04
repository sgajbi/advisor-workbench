import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import PerformanceSummaryMode from "../../src/apps/performance/components/performance-summary-mode";
import { buildSupportedPerformanceScenario } from "../fixtures/performance-workspace-fixtures";

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

const { chartPanelMock } = vi.hoisted(() => ({
  chartPanelMock: vi.fn(({ title, id }: { title: string; id?: string }) => (
    <div data-testid="chart-panel">
      {title}
      {id ? `:${id}` : ""}
    </div>
  )),
}));

vi.mock("../../src/apps/performance/components/performance-chart-panel", () => ({
  default: chartPanelMock,
}));

vi.mock("../../src/apps/performance/components/performance-multi-horizon-panel", () => ({
  default: ({
    portfolioId,
    period,
    detailBasis,
    benchmark,
  }: {
    portfolioId: string;
    period: string;
    detailBasis: string;
    benchmark?: string;
  }) => (
    <div data-testid="multi-horizon-panel">
      {portfolioId}:{period}:{detailBasis}:{benchmark ?? "none"}
    </div>
  ),
}));

vi.mock("../../src/apps/performance/components/performance-summary-header-section", () => ({
  default: ({ selectedBenchmarkLabel }: { selectedBenchmarkLabel?: string | null }) => (
    <div data-testid="summary-header">
      <div>Trust and completeness strip</div>
      <div>{selectedBenchmarkLabel ?? "no benchmark"}</div>
    </div>
  ),
}));

vi.mock("../../src/apps/performance/components/performance-summary-contributors-section", () => ({
  default: ({
    positivePositionContributors,
    negativePositionContributors,
  }: {
    positivePositionContributors: Array<{ position_id: string }>;
    negativePositionContributors: Array<{ position_id: string }>;
  }) => (
    <div data-testid="contributors-section">
      {positivePositionContributors.map((row) => row.position_id).join(",")}|
      {negativePositionContributors.map((row) => row.position_id).join(",")}
    </div>
  ),
}));

describe("PerformanceSummaryMode", () => {
  it("wires deferred summary modules for the selected basis and contributor inputs", async () => {
    const scenario = buildSupportedPerformanceScenario();

    render(
      <PerformanceSummaryMode
        workspace={scenario.workspace}
        period="YTD"
        detailBasis="GROSS"
        contributionDimension="asset_class"
        attributionDimension="asset_class"
        chartFrequency="monthly"
        benchmark="BMK_OVERRIDE"
        capabilities={scenario.capabilities}
        selectedBenchmarkCode={scenario.selectedBenchmarkCode}
        selectedBenchmarkLabel={scenario.selectedBenchmarkLabel}
        selectedPerformance={scenario.workspace.gross_performance}
        primaryDriver={null}
        hasMoneyWeightedReturn={false}
        suspiciousMoneyWeightedReturn={false}
        contributorScale={1}
        positivePositionContributors={[
          {
            position_id: "AAPL",
            contribution_pct: 1.5,
            weight_avg_pct: 24,
            total_return_pct: 8,
            local_contribution_pct: 1.1,
            fx_contribution_pct: 0.4,
          },
        ]}
        negativePositionContributors={[
          {
            position_id: "TLT",
            contribution_pct: -0.2,
            weight_avg_pct: 8,
            total_return_pct: -2,
            local_contribution_pct: -0.2,
            fx_contribution_pct: 0,
          },
        ]}
        topContributors={[
          {
            key_label: "Equity",
            contribution_pct: 3.8,
            weight_avg_pct: 61,
            total_return_pct: 7.4,
            local_contribution_pct: 3.4,
            fx_contribution_pct: 0.4,
            is_other: false,
          },
        ]}
        bottomContributors={[
          {
            key_label: "Rates",
            contribution_pct: -0.6,
            weight_avg_pct: 18,
            total_return_pct: -1.9,
            local_contribution_pct: -0.5,
            fx_contribution_pct: -0.1,
            is_other: false,
          },
        ]}
        isUpdating={false}
        isDetailsPending={false}
      />
    );

    expect(document.querySelectorAll(".workbench-summary-region")).toHaveLength(2);
    expect(screen.getByTestId("summary-header")).toHaveTextContent(
      scenario.selectedBenchmarkLabel ?? "no benchmark"
    );
    expect(screen.getByText("Trust and completeness strip")).toBeInTheDocument();
    expect(
      screen
        .getByTestId("summary-header")
        .compareDocumentPosition(screen.getByTestId("chart-panel")) &
        Node.DOCUMENT_POSITION_FOLLOWING
    ).toBeTruthy();
    expect(screen.queryByText("Analysis Mode Panel")).not.toBeInTheDocument();
    expect(screen.queryByText("Evidence Mode Panel")).not.toBeInTheDocument();
    expect(screen.getByTestId("chart-panel")).toHaveTextContent(
      "Gross Return Path:performance-trend"
    );
    expect(screen.queryByTestId("multi-horizon-panel")).not.toBeInTheDocument();
    expect(screen.queryByTestId("contributors-section")).not.toBeInTheDocument();
    expect(screen.queryByText("Horizon Comparison")).not.toBeInTheDocument();
    expect(screen.queryByText("Performance Drivers")).not.toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByTestId("multi-horizon-panel")).toHaveTextContent(
        `${scenario.workspace.portfolio_id}:YTD:GROSS:${scenario.selectedBenchmarkCode}`
      );
      expect(screen.getByTestId("contributors-section")).toHaveTextContent("AAPL|TLT");
    });

    expect(screen.queryByText("Horizon Comparison")).not.toBeInTheDocument();
    expect(screen.queryByText("Performance Drivers")).not.toBeInTheDocument();
    expect(chartPanelMock).toHaveBeenCalledTimes(1);
    expect(chartPanelMock).toHaveBeenCalledWith(
      expect.objectContaining({
        moneyWeightedReturn: scenario.workspace.money_weighted_return,
      }),
      undefined
    );
  });
});
