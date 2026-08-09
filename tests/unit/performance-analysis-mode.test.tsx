import React from "react";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import PerformanceAnalysisMode from "../../src/apps/performance/components/performance-analysis-mode";
import {
  buildAggregateContributionPerformanceScenario,
  buildSupportedPerformanceScenario,
  buildUnavailableContributionPerformanceScenario,
} from "../fixtures/performance-workspace-fixtures";

vi.mock("../../src/apps/performance/components/performance-attribution-trend-panel", () => ({
  default: () => <div data-testid="attribution-trend">Attribution Trend Panel</div>,
}));

vi.mock("../../src/apps/performance/components/performance-analysis-attribution-section", () => ({
  default: () => <div data-testid="attribution-section">Attribution Detail Section</div>,
}));

describe("PerformanceAnalysisMode", () => {
  it("renders supported analysis modules from the shared supported scenario", () => {
    const scenario = buildSupportedPerformanceScenario();

    render(
      <PerformanceAnalysisMode
        workspace={scenario.workspace}
        period="YTD"
        detailBasis="NET"
        contributionDimension="asset_class"
        attributionDimension="asset_class"
        chartFrequency="monthly"
        benchmark="BMK_1"
        capabilities={scenario.capabilities}
        isUpdating={false}
        isDetailsPending={false}
      />
    );

    expect(screen.getByTestId("attribution-trend")).toBeInTheDocument();
    expect(screen.getByTestId("attribution-section")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Performance Drivers" })).toBeInTheDocument();
    expect(screen.queryByLabelText("Contribution detail summary strip")).not.toBeInTheDocument();
    expect(screen.queryByText("Contribution Breakdown")).not.toBeInTheDocument();
    expect(document.querySelector(".performance-analysis-stage")).toBeTruthy();
    expect(screen.getByLabelText("Position contribution table")).toBeInTheDocument();
    expect(
      screen.queryByRole("complementary", { name: "Top / Bottom Contributors panel" })
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("region", { name: "Contribution Detail panel" })
    ).not.toBeInTheDocument();
    expect(screen.getAllByText("Local").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("FX").length).toBeGreaterThanOrEqual(1);
    expect(screen.getByRole("cell", { name: "AAPL" })).toBeInTheDocument();
  });

  it("shows the shared loading state when analysis detail is still pending", () => {
    const scenario = buildUnavailableContributionPerformanceScenario();

    render(
      <PerformanceAnalysisMode
        workspace={scenario.workspace}
        period="YTD"
        detailBasis="NET"
        contributionDimension="asset_class"
        attributionDimension="asset_class"
        chartFrequency="monthly"
        benchmark="BMK_1"
        capabilities={{
          ...scenario.capabilities,
          attributionDetail: {
            state: "unavailable",
            reason: "Attribution detail is not available for the current selection.",
          },
        }}
        isUpdating={false}
        isDetailsPending
      />
    );

    expect(
      screen.getByText("Loading contribution detail for the selected segment and horizon.")
    ).toBeInTheDocument();
    expect(
      document.querySelector(".performance-analysis-state-panel-loading .workbench-loading-state")
    ).toBeTruthy();
  });

  it("renders shared unavailable analysis state from the contribution scenario", () => {
    const scenario = buildUnavailableContributionPerformanceScenario();

    render(
      <PerformanceAnalysisMode
        workspace={scenario.workspace}
        period="YTD"
        detailBasis="NET"
        contributionDimension="asset_class"
        attributionDimension="asset_class"
        chartFrequency="monthly"
        benchmark="BMK_1"
        capabilities={{
          ...scenario.capabilities,
          attributionDetail: {
            state: "supported",
          },
        }}
        isUpdating={false}
        isDetailsPending={false}
      />
    );

    expect(screen.getByText("Contribution detail unavailable")).toBeInTheDocument();
    expect(
      screen.getAllByText("Contribution detail is not available for the current selection.").length
    ).toBeGreaterThanOrEqual(1);
    expect(
      document.querySelector(".performance-analysis-state-panel-unavailable .module-state-panel")
    ).toBeTruthy();
  });

  it("renders partial contribution state from the aggregate-only scenario", () => {
    const scenario = buildAggregateContributionPerformanceScenario();

    render(
      <PerformanceAnalysisMode
        workspace={scenario.workspace}
        period="YTD"
        detailBasis="NET"
        contributionDimension="asset_class"
        attributionDimension="asset_class"
        chartFrequency="monthly"
        benchmark="BMK_1"
        capabilities={scenario.capabilities}
        isUpdating={false}
        isDetailsPending={false}
      />
    );

    expect(screen.getByText("Contribution detail is partial")).toBeInTheDocument();
    expect(
      screen.getAllByText("Contribution exists, but only aggregate rows are available.").length
    ).toBeGreaterThanOrEqual(1);
    expect(
      screen.getByText("Aggregate contribution remains available even when position-level ranking is absent.")
    ).toBeInTheDocument();
    expect(screen.getByText("Position ranking unavailable")).not.toBeVisible();
    expect(
      screen.getByText(
        "Open Segment Contribution to inspect grouped contribution for the selected segment."
      )
    ).not.toBeVisible();
    expect(screen.getByRole("tab", { name: "Segment Summary (1)" })).toHaveAttribute(
      "aria-selected",
      "true"
    );
    expect(screen.getAllByText("Equity").length).toBeGreaterThanOrEqual(1);
    expect(
      document.querySelector(".performance-analysis-state-panel-partial .module-state-panel")
    ).toBeTruthy();
  });
});
