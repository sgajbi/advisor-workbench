import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

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
        onViewUnderwater={() => {}}
      />
    );
    expect(screen.getByRole("heading", { name: "Drawdown" })).toBeInTheDocument();
    expect(screen.queryByLabelText("Drawdown business reading")).not.toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Episode review" })).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Drawdown methodology and coverage" })
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "View underwater path" })).toBeInTheDocument();

    const headlineLabels = Array.from(
      container.querySelectorAll(".performance-risk-drawdown-headline-grid .ui-text-label")
    ).map((node) => node.textContent?.trim());
    expect(headlineLabels).toEqual([
      "Max Drawdown",
      "Relative Max Drawdown",
      "Time Under Water",
      "Recovery Status",
      "Ulcer Index",
    ]);
    expect(screen.queryByRole("heading", { name: "Supporting risk measures" })).not.toBeInTheDocument();
    expect(
      screen.queryByText("Shows how persistent and painful the underwater path was, not just how deep it got.")
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole("button", {
        name: "Ulcer Index: Path-sensitive drawdown measure that reflects both drawdown depth and time spent underwater.",
      })
    ).toBeInTheDocument();

    const episodeSection = screen
      .getByRole("heading", { name: "Episode review" })
      .closest(".performance-risk-detail-section");
    expect(episodeSection).toHaveClass("performance-risk-detail-section-compact");
    expect(
      (episodeSection as HTMLElement).querySelector(".performance-risk-note-card-compact")
    ).toBeNull();
    expect(
      (episodeSection as HTMLElement).querySelector(".performance-risk-analytical-table-compact")
    ).toBeTruthy();
    expect(screen.getByLabelText("Risk drawdown episode table")).toBeInTheDocument();
    expect(screen.queryByLabelText("Risk underwater series table")).not.toBeInTheDocument();
  });

  it("qualifies benchmark-relative interpretation when benchmark context is unavailable", () => {
    const viewModel = buildRiskViewModel({ benchmarkUnassigned: true });
    render(
      <RiskDrawdownPanel
        viewModel={viewModel}
        onViewUnderwater={() => {}}
      />
    );
    const headlineMetrics = screen.getByLabelText("Risk drawdown headline metrics");

    expect(screen.queryByLabelText("Drawdown business reading")).not.toBeInTheDocument();
    expect(within(headlineMetrics).getByText("N/A")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Drawdown methodology and coverage" }));

    const dialog = screen.getByRole("dialog", { name: "Drawdown methodology and coverage" });
    expect(within(dialog).getByText("Relative drawdown is not active for this selection.")).toBeInTheDocument();
  });

  it("renders a controlled interpretation block when no retained episodes exist", () => {
    const viewModel = buildRiskViewModel({ includeEpisodes: false });
    render(
      <RiskDrawdownPanel
        viewModel={viewModel}
        onViewUnderwater={() => {}}
      />
    );

    expect(screen.getByText("No retained drawdown episodes")).toBeInTheDocument();
    expect(
      screen.getByText(
        "The portfolio did experience a loss path, but no episode met the retained episode policy for this window."
      )
    ).toBeInTheDocument();
    const episodeSection = screen
      .getByRole("heading", { name: "Episode review" })
      .closest(".performance-risk-detail-section");
    expect(episodeSection).toHaveClass("performance-risk-detail-section-compact");
    expect(
      (episodeSection as HTMLElement).querySelector(".performance-risk-note-card-compact")
    ).toBeTruthy();
    expect(screen.queryByLabelText("Risk drawdown episode table")).not.toBeInTheDocument();
    expect(screen.queryByText("No drawdown episodes to review")).not.toBeInTheDocument();
  });

  it("exposes underwater path as a drill-down action instead of inline expansion", () => {
    const viewModel = buildRiskViewModel();
    const onViewUnderwater = vi.fn();

    render(
      <RiskDrawdownPanel viewModel={viewModel} onViewUnderwater={onViewUnderwater} />
    );

    fireEvent.click(screen.getByRole("button", { name: "View underwater path" }));

    expect(onViewUnderwater).toHaveBeenCalledTimes(1);
    expect(screen.queryByLabelText("Risk underwater series table")).not.toBeInTheDocument();
  });
});
