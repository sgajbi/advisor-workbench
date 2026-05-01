import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import PerformanceWorkspaceSidePanel from "../../src/apps/performance/components/performance-workspace-side-panel";
import { getPerformanceWorkspaceCapabilities } from "../../src/apps/performance/capabilities";
import { buildSupportedPerformanceScenario } from "../fixtures/performance-workspace-fixtures";

describe("PerformanceWorkspaceSidePanel", () => {
  it("avoids duplicate workflow actions when the primary action already targets risk review", () => {
    const workspace = buildSupportedPerformanceScenario().workspace;

    render(
      <PerformanceWorkspaceSidePanel
        workspace={workspace}
        mode="advisor"
        period="YTD"
        detailBasis="NET"
        chartFrequency="monthly"
        capabilities={getPerformanceWorkspaceCapabilities(workspace)}
        selectedBenchmarkLabel="Private Banking Global Balanced 60/40"
        onModeChange={vi.fn()}
      />
    );

    expect(screen.getByRole("button", { name: "Review Risk Surface" })).toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: "Review Risk Surface" })).toHaveLength(1);
    expect(screen.queryByRole("button", { name: "Open Advisor Brief" })).not.toBeInTheDocument();
  });

  it("routes workflow actions through the configured mode map without repeating the active destination", () => {
    const workspace = buildSupportedPerformanceScenario().workspace;
    const onModeChange = vi.fn();

    render(
      <PerformanceWorkspaceSidePanel
        workspace={workspace}
        mode="analysis"
        period="YTD"
        detailBasis="NET"
        chartFrequency="monthly"
        capabilities={getPerformanceWorkspaceCapabilities(workspace)}
        selectedBenchmarkLabel="Private Banking Global Balanced 60/40"
        onModeChange={onModeChange}
      />
    );

    expect(screen.getByRole("button", { name: "Draft Advisor Brief" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Review Risk Surface" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Open Advisor Brief" })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Draft Advisor Brief" }));
    fireEvent.click(screen.getByRole("button", { name: "Review Risk Surface" }));

    expect(onModeChange).toHaveBeenNthCalledWith(1, "advisor");
    expect(onModeChange).toHaveBeenNthCalledWith(2, "risk");
  });

  it("preserves the active portfolio when returning to the Portfolio workspace", () => {
    const workspace = {
      ...buildSupportedPerformanceScenario().workspace,
      portfolio_id: "PB_SG_GLOBAL_BAL_001",
    };

    render(
      <PerformanceWorkspaceSidePanel
        workspace={workspace}
        mode="summary"
        period="YTD"
        detailBasis="NET"
        chartFrequency="monthly"
        capabilities={getPerformanceWorkspaceCapabilities(workspace)}
        selectedBenchmarkLabel="Private Banking Global Balanced 60/40"
        onModeChange={vi.fn()}
      />
    );

    expect(screen.getByRole("link", { name: "Return to Portfolio" })).toHaveAttribute(
      "href",
      "/portfolio?portfolioId=PB_SG_GLOBAL_BAL_001"
    );
  });
});
