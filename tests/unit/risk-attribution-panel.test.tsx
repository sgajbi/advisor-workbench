import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import RiskAttributionPanel from "../../src/apps/performance/components/risk/risk-attribution-panel";
import {
  buildFixtureRiskAttribution,
  buildPerformanceRiskViewModel,
} from "../../src/apps/performance/risk-workspace-view-model";
import { buildSupportedPerformanceScenario } from "../fixtures/performance-workspace-fixtures";

function buildRiskViewModel() {
  const scenario = buildSupportedPerformanceScenario();

  return buildPerformanceRiskViewModel({
    workspace: scenario.workspace,
    period: "YTD",
    detailBasis: "NET",
    riskAttribution: buildFixtureRiskAttribution(scenario.workspace, "YTD", "NET"),
  });
}

describe("RiskAttributionPanel", () => {
  it("uses the compact secondary-panel review contract for attribution", () => {
    const viewModel = buildRiskViewModel();
    const onSelectAttribution = vi.fn();
    const { container } = render(
      <RiskAttributionPanel viewModel={viewModel} onSelectAttribution={onSelectAttribution} />
    );

    expect(screen.getByRole("heading", { name: "Historical Risk Attribution" })).toBeInTheDocument();
    expect(screen.queryByLabelText("Historical risk attribution business reading")).not.toBeInTheDocument();
    expect(
      screen.queryByText(/Private Credit is the largest visible contributor/i)
    ).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Risk attribution highlights")).not.toBeInTheDocument();
    expect(screen.getByLabelText("Risk attribution detail")).toBeInTheDocument();
    expect(container.querySelector(".performance-risk-detail-section-compact")).toBeTruthy();
    expect(container.querySelector(".performance-risk-analytical-table-compact")).toBeTruthy();
    expect(container.querySelector(".performance-risk-attribution-detail-table")).toBeTruthy();
    expect(container.querySelectorAll(".performance-risk-share-bar")).not.toHaveLength(0);
    expect(container.querySelector(".performance-risk-attribution-toolbar")).toBeTruthy();
    expect(container.querySelectorAll(".performance-risk-compact-segmented-control")).toHaveLength(2);
    expect(screen.queryByText("Attribution reconciliation")).not.toBeInTheDocument();
    expect(screen.queryByText("Current decomposition lens for contributor review.")).not.toBeInTheDocument();
    expect(screen.queryByText("Largest visible component effect at 5.83%.")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Historical Risk Attribution methodology and coverage" })).toBeInTheDocument();
  });

  it("keeps reconciled sum and evidence posture in the methodology drawer instead of the main panel", () => {
    const viewModel = buildRiskViewModel();

    render(<RiskAttributionPanel viewModel={viewModel} onSelectAttribution={vi.fn()} />);

    expect(screen.queryByText("Reconciled sum")).not.toBeInTheDocument();
    expect(screen.queryByText("Evidence posture")).not.toBeInTheDocument();

    fireEvent.click(
      screen.getByRole("button", { name: "Historical Risk Attribution methodology and coverage" })
    );

    const dialog = screen.getByRole("dialog", {
      name: "Historical Risk Attribution methodology and coverage",
    });

    expect(within(dialog).getByText("Reconciled sum")).toBeInTheDocument();
    expect(within(dialog).getByText("Evidence posture")).toBeInTheDocument();
  });
});
