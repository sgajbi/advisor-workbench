import React from "react";
import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import PerformanceAnalysisContributionSection from "../../src/apps/performance/components/performance-analysis-contribution-section";
import {
  buildAggregateContributionPerformanceScenario,
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
    expect(document.querySelector(".performance-analysis-toolbar")).toBeTruthy();
    expect(document.querySelectorAll(".performance-analysis-level-section").length).toBeGreaterThan(0);
    expect(document.querySelectorAll(".performance-analysis-level-body").length).toBeGreaterThan(0);
    expect(document.querySelectorAll(".performance-analysis-table").length).toBeGreaterThan(0);
    expect(document.querySelector(".performance-analysis-table.analytics-table-frame-dense")).toBeTruthy();
    expect(screen.getByLabelText("Position contribution table")).toBeInTheDocument();
    expect(screen.getByText("Top Positions")).toBeInTheDocument();
    expect(screen.getByText("Position")).toBeInTheDocument();
    expect(screen.getByText("AAPL")).toBeInTheDocument();
    expect(screen.getByLabelText("Asset Class contribution table")).toBeInTheDocument();
    expect(screen.getAllByText("Local").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("FX").length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText("Equity")).toBeInTheDocument();
    expect(screen.getByText("Total")).toBeInTheDocument();
  });

  it("keeps the position return column when upstream emits real returns and no local contribution", () => {
    const workspace = buildWorkspace();
    if (!workspace.contribution) {
      throw new Error("Expected contribution detail in supported workspace fixture");
    }
    workspace.contribution.position_rows = [
      {
        position_id: "PB_SG_GLOBAL_BAL_001:FO_EQ_AAPL_US",
        contribution_pct: 0.29551,
        weight_avg_pct: 7.444525,
        total_return_pct: 4.308425,
        local_contribution_pct: 0,
        fx_contribution_pct: 0.29551,
      },
      {
        position_id: "PB_SG_GLOBAL_BAL_001:FO_EQ_MSFT_US",
        contribution_pct: 0.173727,
        weight_avg_pct: 10.268896,
        total_return_pct: 1.71342,
        local_contribution_pct: 0,
        fx_contribution_pct: 0.173727,
      },
    ];

    render(
      <PerformanceAnalysisContributionSection
        workspace={workspace}
        contributionDimension="asset_class"
        onRequestChange={undefined}
        isUpdating={false}
        isDetailsPending={false}
        capabilities={supportedCapabilities}
      />
    );

    const positionTable = screen.getByLabelText("Position contribution table");
    expect(within(positionTable).getByText("Return")).toBeInTheDocument();
    expect(within(positionTable).queryByText("Local")).not.toBeInTheDocument();
    expect(within(positionTable).getByText("AAPL US")).toBeInTheDocument();
    expect(within(positionTable).getByText("4.31%")).toBeInTheDocument();
    expect(within(positionTable).getAllByText("0.30%")).toHaveLength(2);
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
    expect(
      document.querySelector(".performance-analysis-state-panel-loading .module-state-panel")
    ).toBeTruthy();
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
    expect(
      document.querySelector(".performance-analysis-state-panel-unavailable .module-state-panel")
    ).toBeTruthy();
  });

  it("renders aggregate contribution detail alongside the partial-state banner when only aggregate rows exist", () => {
    const scenario = buildAggregateContributionPerformanceScenario();

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

    expect(screen.getByText("Contribution detail is partial")).toBeInTheDocument();
    expect(
      screen.getByText("Contribution exists, but only aggregate rows are available.")
    ).toBeInTheDocument();
    expect(
      screen.getByText("Aggregate contribution remains available even when position-level ranking is absent.")
    ).toBeInTheDocument();
    expect(screen.getByLabelText("Asset Class contribution table")).toBeInTheDocument();
    expect(screen.getByText("Equity")).toBeInTheDocument();
    expect(screen.getByText("Total")).toBeInTheDocument();
    expect(
      document.querySelector(".performance-analysis-state-panel-partial .module-state-panel")
    ).toBeTruthy();
  });

  it("disables contribution segment options that are outside the backend capability contract", () => {
    render(
      <PerformanceAnalysisContributionSection
        workspace={buildWorkspace()}
        contributionDimension="asset_class"
        onRequestChange={undefined}
        isUpdating={false}
        isDetailsPending={false}
        capabilities={buildPerformanceCapabilities({
          contributionDetail: {
            state: "supported",
            supportedDimensions: ["asset_class", "country"],
          },
        })}
      />
    );

    fireEvent.mouseDown(screen.getByRole("combobox"));
    const options = within(screen.getByRole("listbox")).getAllByRole("option");
    expect(options.find((option) => option.textContent === "Asset Class")).not.toHaveAttribute(
      "aria-disabled"
    );
    expect(options.find((option) => option.textContent === "Country")).not.toHaveAttribute(
      "aria-disabled"
    );
    expect(options.find((option) => option.textContent === "Sector")).toHaveAttribute(
      "aria-disabled",
      "true"
    );
  });
});
