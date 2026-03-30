import React from "react";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import PerformanceAnalysisContributionSection from "../../src/apps/performance/components/performance-analysis-contribution-section";
import {
  buildPerformanceCapabilities,
  buildSupportedPerformanceScenario,
  buildUnavailableContributionPerformanceScenario,
} from "../fixtures/performance-workspace-fixtures";

const supportedCapabilities = buildPerformanceCapabilities();

function buildWorkspace() {
  return buildSupportedPerformanceScenario().workspace;
}

describe("PerformanceAnalysisContributionSection", () => {
  it("renders contract-backed contribution detail with local and FX columns", () => {
    render(
      <PerformanceAnalysisContributionSection
        workspace={buildWorkspace()}
        contributionDimension="asset_class"
        onRequestChange={undefined}
        isUpdating={false}
        isDetailsPending={false}
        capabilities={supportedCapabilities}
      />
    );

    expect(screen.getByRole("heading", { name: "Contribution Detail" })).toBeInTheDocument();
    expect(document.querySelector("#performance-drivers.workbench-data-grid-frame")).toBeTruthy();
    expect(screen.getByLabelText("Asset Class contribution table")).toBeInTheDocument();
    expect(screen.getByText("Local")).toBeInTheDocument();
    expect(screen.getByText("FX")).toBeInTheDocument();
    expect(screen.getByText("Equity")).toBeInTheDocument();
    expect(screen.getByText("Total")).toBeInTheDocument();
  });

  it("renders a loading state when contribution detail is pending", () => {
    const scenario = buildUnavailableContributionPerformanceScenario();

    render(
      <PerformanceAnalysisContributionSection
        workspace={scenario.workspace}
        contributionDimension="asset_class"
        onRequestChange={undefined}
        isUpdating={false}
        isDetailsPending
        capabilities={scenario.capabilities}
      />
    );

    expect(
      screen.getByText("Loading contribution detail for the selected segment and horizon.")
    ).toBeInTheDocument();
  });

  it("renders a shared capability notice when contribution detail is unavailable", () => {
    const scenario = buildUnavailableContributionPerformanceScenario();

    render(
      <PerformanceAnalysisContributionSection
        workspace={scenario.workspace}
        contributionDimension="asset_class"
        onRequestChange={undefined}
        isUpdating={false}
        isDetailsPending={false}
        capabilities={scenario.capabilities}
      />
    );

    expect(screen.getByText("Contribution detail unavailable")).toBeInTheDocument();
    expect(
      screen.getByText("Contribution detail is not available for the current selection.")
    ).toBeInTheDocument();
  });
});
