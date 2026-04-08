import { render, screen } from "@testing-library/react";
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
    expect(screen.getByLabelText("Historical risk attribution business reading")).toBeInTheDocument();
    expect(screen.getByLabelText("Risk attribution highlights")).toBeInTheDocument();
    expect(screen.getByLabelText("Risk attribution detail")).toBeInTheDocument();
    expect(container.querySelector(".performance-risk-detail-section-compact")).toBeTruthy();
    expect(container.querySelector(".performance-risk-analytical-table-compact")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Historical Risk Attribution methodology and coverage" })).toBeInTheDocument();
  });
});
