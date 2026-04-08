import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import RiskConcentrationPanel from "../../src/apps/performance/components/risk/risk-concentration-panel";
import {
  buildFixtureRiskConcentration,
  buildPerformanceRiskViewModel,
} from "../../src/apps/performance/risk-workspace-view-model";
import { buildSupportedPerformanceScenario } from "../fixtures/performance-workspace-fixtures";

function buildRiskViewModel() {
  const scenario = buildSupportedPerformanceScenario();

  return buildPerformanceRiskViewModel({
    workspace: scenario.workspace,
    period: "YTD",
    detailBasis: "NET",
    riskConcentration: buildFixtureRiskConcentration(scenario.workspace, "YTD"),
  });
}

describe("RiskConcentrationPanel", () => {
  it("uses compact shared metric cards for concentration first-read indicators", () => {
    const viewModel = buildRiskViewModel();
    const { container } = render(<RiskConcentrationPanel viewModel={viewModel} />);

    expect(screen.getByRole("heading", { name: "Concentration" })).toBeInTheDocument();
    expect(screen.queryByLabelText("Risk concentration executive summary")).not.toBeInTheDocument();
    expect(screen.getByLabelText("Risk concentration headline metrics")).toBeInTheDocument();
    expect(screen.getByLabelText("Risk concentration scale detail")).toBeInTheDocument();
    expect(
      container.querySelectorAll(
        ".performance-risk-concentration-indicator-grid .performance-risk-metric-card-compact"
      )
    ).toHaveLength(5);
    expect(screen.queryByText("Position-level concentration across the live book")).not.toBeInTheDocument();
    expect(
      screen.getAllByRole("button", {
        name: "Portfolio Concentration Index: Herfindahl-Hirschman Index for the current portfolio. Higher values indicate exposure concentrated in fewer holdings.",
      }).length
    ).toBeGreaterThan(0);
    const scaleSection = screen
      .getByRole("heading", { name: "Concentration scale" })
      .closest(".performance-risk-detail-section");
    expect(scaleSection).toHaveClass("performance-risk-detail-section-compact");
    expect(
      container.querySelectorAll(".performance-risk-concentration-scale-card")
    ).toHaveLength(2);
    expect(screen.queryByText(/Position-level concentration is/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Issuer-level concentration remains/i)).not.toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Driver analysis" })).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Risk concentration driver analysis")).not.toBeInTheDocument();
  });

  it("keeps concentration methodology behind the on-demand panel", () => {
    const viewModel = buildRiskViewModel();
    render(<RiskConcentrationPanel viewModel={viewModel} />);

    fireEvent.click(screen.getByRole("button", { name: "Concentration methodology and coverage" }));

    const dialog = screen.getByRole("dialog", {
      name: "Concentration methodology and coverage",
    });

    expect(within(dialog).getByText("Issuer Coverage")).toBeInTheDocument();
    expect(within(dialog).getByText("Grouping Level")).toBeInTheDocument();
    expect(within(dialog).getByText("Reporting Currency")).toBeInTheDocument();
  });
});
