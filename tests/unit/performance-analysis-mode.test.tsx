import React from "react";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import PerformanceAnalysisMode from "../../src/apps/performance/components/performance-analysis-mode";
import {
  buildPerformanceCapabilities,
  buildSupportedPerformanceScenario,
  buildUnavailableContributionPerformanceScenario,
} from "../fixtures/performance-workspace-fixtures";

vi.mock("../../src/apps/performance/components/performance-attribution-trend-panel", () => ({
  default: () => <div data-testid="attribution-trend">Attribution Trend Panel</div>,
}));

vi.mock("../../src/apps/performance/components/performance-analysis-attribution-section", () => ({
  default: () => <div data-testid="attribution-section">Attribution Detail Section</div>,
}));

const supportedCapabilities = buildPerformanceCapabilities();

function buildWorkspace() {
  return buildSupportedPerformanceScenario().workspace;
}

describe("PerformanceAnalysisMode", () => {
  it("renders analysis modules and contribution detail with local and FX columns", () => {
    render(
      <PerformanceAnalysisMode
        workspace={buildWorkspace()}
        period="YTD"
        detailBasis="NET"
        contributionDimension="asset_class"
        attributionDimension="asset_class"
        chartFrequency="monthly"
        benchmark="BMK_1"
        capabilities={supportedCapabilities}
        relativeSegmentRows={[]}
        topAttributionEffectRows={[]}
        attributionEffectScale={0.01}
        isUpdating={false}
        isDetailsPending={false}
      />
    );

    expect(screen.getByTestId("attribution-trend")).toBeInTheDocument();
    expect(screen.getByTestId("attribution-section")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Contribution Detail" })).toBeInTheDocument();
    expect(document.querySelector(".performance-analysis-stage")).toBeTruthy();
    expect(screen.getByLabelText("Asset Class contribution table")).toBeInTheDocument();
    expect(screen.getByText("Local")).toBeInTheDocument();
    expect(screen.getByText("FX")).toBeInTheDocument();
    expect(screen.getByText("Total")).toBeInTheDocument();
    expect(screen.getByText("Equity")).toBeInTheDocument();
  });

  it("shows the contribution loading message when analysis detail is still pending", () => {
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
  });

  it("renders a shared capability notice when contribution detail is unavailable", () => {
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
    expect(screen.getByText("Contribution detail is not available for the current selection.")).toBeInTheDocument();
  });
});
