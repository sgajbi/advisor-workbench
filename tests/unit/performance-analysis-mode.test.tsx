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
        relativeSegmentRows={[]}
        topAttributionEffectRows={[]}
        attributionEffectScale={0.01}
        isUpdating={false}
        isDetailsPending={false}
      />
    );

    expect(screen.getByTestId("attribution-trend")).toBeInTheDocument();
    expect(screen.getByTestId("attribution-section")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Performance Drivers" })).toBeInTheDocument();
    expect(screen.getByLabelText("Contribution detail summary strip")).toBeInTheDocument();
    expect(document.querySelector(".performance-analysis-stage")).toBeTruthy();
    expect(screen.getByLabelText("Position contribution table")).toBeInTheDocument();
    expect(
      screen.getByRole("complementary", { name: "Top / Bottom Contributors panel" })
    ).toBeInTheDocument();
    expect(screen.getByRole("region", { name: "Contribution Detail panel" })).toBeInTheDocument();
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
        relativeSegmentRows={[]}
        topAttributionEffectRows={[]}
        attributionEffectScale={0.01}
        isUpdating={false}
        isDetailsPending
      />
    );

    expect(
      screen.getByText("Loading contribution detail for the selected segment and horizon.")
    ).toBeInTheDocument();
    expect(
      document.querySelector(".performance-analysis-state-panel-loading .module-state-panel")
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
        relativeSegmentRows={[]}
        topAttributionEffectRows={[]}
        attributionEffectScale={0.01}
        isUpdating={false}
        isDetailsPending={false}
      />
    );

    expect(screen.getByText("Contribution detail unavailable")).toBeInTheDocument();
    expect(
      screen.getByText("Contribution detail is not available for the current selection.")
    ).toBeInTheDocument();
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
        relativeSegmentRows={[]}
        topAttributionEffectRows={[]}
        attributionEffectScale={0.01}
        isUpdating={false}
        isDetailsPending={false}
      />
    );

    expect(screen.getByText("Contribution detail is partial")).toBeInTheDocument();
    expect(
      screen.getByText("Contribution exists, but only aggregate rows are available.")
    ).toBeInTheDocument();
    expect(
      screen.getByText("Aggregate contribution remains available even when position-level ranking is absent.")
    ).toBeInTheDocument();
    expect(screen.getAllByText("Position ranking unavailable").length).toBeGreaterThanOrEqual(1);
    expect(
      screen.getByText(
        "Open Segment Contribution to inspect grouped contribution for the selected segment."
      )
    ).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Segment Contribution (1)" })).toBeInTheDocument();
    expect(screen.getByText("Equity")).toBeInTheDocument();
    expect(
      document.querySelector(".performance-analysis-state-panel-partial .module-state-panel")
    ).toBeTruthy();
  });
});
