import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import RiskDrawdownPanel from "../../src/apps/performance/components/risk/risk-drawdown-panel";
import {
  buildFixtureRiskDrawdown,
  buildPerformanceRiskViewModel,
} from "../../src/apps/performance/risk-workspace-view-model";
import {
  buildBenchmarkUnassignedPerformanceScenario,
  buildSupportedPerformanceScenario,
} from "../fixtures/performance-workspace-fixtures";

function buildRiskViewModel({
  benchmarkUnassigned = false,
  includeEpisodes = true,
}: {
  benchmarkUnassigned?: boolean;
  includeEpisodes?: boolean;
} = {}) {
  const scenario = benchmarkUnassigned
    ? buildBenchmarkUnassignedPerformanceScenario()
    : buildSupportedPerformanceScenario();
  const drawdown = buildFixtureRiskDrawdown(scenario.workspace, "YTD", "NET", {
    includeBenchmarkRelative: !benchmarkUnassigned,
  });

  if (!includeEpisodes) {
    const period = drawdown.payload?.periods[0];
    if (period) {
      period.episodes = [];
    }
  }

  return buildPerformanceRiskViewModel({
    workspace: scenario.workspace,
    period: "YTD",
    detailBasis: "NET",
    riskDrawdown: drawdown,
  });
}

describe("RiskDrawdownPanel", () => {
  it("prioritizes front-office drawdown interpretation ahead of episode detail", () => {
    const viewModel = buildRiskViewModel();
    const { container } = render(
      <RiskDrawdownPanel
        viewModel={viewModel}
        underwaterExpanded={false}
        onToggleUnderwater={() => {}}
      />
    );
    const businessReading = screen.getByLabelText("Drawdown business reading");

    expect(screen.getByRole("heading", { name: "Drawdown" })).toBeInTheDocument();
    expect(
      within(businessReading).getByText(
        /Drawdown was elevated, benchmark-relative review is relevant, and the book is still underwater\./
      )
    ).toBeInTheDocument();
    expect(
      within(businessReading).getByText(
        /Next review: inspect the worst episode and confirm whether the remaining underwater path needs action\./
      )
    ).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Supporting risk measures" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Episode review" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Context and methodology" })).toBeInTheDocument();

    const headlineLabels = Array.from(
      container.querySelectorAll(
        ".performance-risk-drawdown-headline-grid .workbench-summary-metric-label"
      )
    ).map((node) => node.textContent?.trim());
    expect(headlineLabels).toEqual([
      "Max Drawdown",
      "Relative Max Drawdown",
      "Time Under Water",
      "Recovery Status",
    ]);

    const supportingSection = screen
      .getByRole("heading", { name: "Supporting risk measures" })
      .closest(".performance-risk-detail-section");
    expect(supportingSection).toBeTruthy();
    expect(within(supportingSection as HTMLElement).getByText("Ulcer Index")).toBeInTheDocument();
    expect(
      within(supportingSection as HTMLElement).getByText(
        "Shows how persistent and painful the underwater path was, not just how deep it got."
      )
    ).toBeInTheDocument();

    expect(screen.getByText("2 drawdown episodes to review")).toBeInTheDocument();
    expect(
      screen.getByText(/The worst retained episode reached -12\.45% from 12 Jan 2026 to 03 Feb 2026/)
    ).toBeInTheDocument();
    expect(screen.getByLabelText("Risk drawdown episode table")).toBeInTheDocument();
    expect(screen.queryByLabelText("Risk underwater series table")).not.toBeInTheDocument();
  });

  it("qualifies benchmark-relative interpretation when benchmark context is unavailable", () => {
    const viewModel = buildRiskViewModel({ benchmarkUnassigned: true });
    render(
      <RiskDrawdownPanel
        viewModel={viewModel}
        underwaterExpanded={false}
        onToggleUnderwater={() => {}}
      />
    );
    const businessReading = screen.getByLabelText("Drawdown business reading");
    const headlineMetrics = screen.getByLabelText("Risk drawdown headline metrics");

    expect(
      within(businessReading).getByText(
        /Drawdown was elevated, benchmark-relative review is unavailable, and the book is still underwater\./
      )
    ).toBeInTheDocument();
    expect(within(headlineMetrics).getByText("N/A")).toBeInTheDocument();
    expect(
      within(headlineMetrics).getByText("Benchmark-relative drawdown requires benchmark context.")
    ).toBeInTheDocument();
    expect(
      screen.getByText("Relative drawdown is not active for this selection.")
    ).toBeInTheDocument();
  });

  it("renders a controlled interpretation block when no retained episodes exist", () => {
    const viewModel = buildRiskViewModel({ includeEpisodes: false });
    render(
      <RiskDrawdownPanel
        viewModel={viewModel}
        underwaterExpanded={false}
        onToggleUnderwater={() => {}}
      />
    );

    expect(screen.getByText("No retained drawdown episodes")).toBeInTheDocument();
    expect(
      screen.getByText(
        "The portfolio did experience a loss path, but no episode met the retained episode policy for this window."
      )
    ).toBeInTheDocument();
    expect(screen.queryByLabelText("Risk drawdown episode table")).not.toBeInTheDocument();
    expect(screen.queryByText("No drawdown episodes to review")).not.toBeInTheDocument();
  });
});
