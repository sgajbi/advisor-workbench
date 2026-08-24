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
        capabilities={getPerformanceWorkspaceCapabilities(workspace)}
        onModeChange={vi.fn()}
      />
    );

    expect(screen.getByRole("button", { name: "Review risk" })).toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: "Review risk" })).toHaveLength(1);
    expect(screen.queryByRole("button", { name: "Open adviser brief" })).not.toBeInTheDocument();
  });

  it("routes workflow actions through the configured mode map without repeating the active destination", () => {
    const workspace = buildSupportedPerformanceScenario().workspace;
    const onModeChange = vi.fn();

    render(
      <PerformanceWorkspaceSidePanel
        workspace={workspace}
        mode="analysis"
        capabilities={getPerformanceWorkspaceCapabilities(workspace)}
        onModeChange={onModeChange}
      />
    );

    expect(screen.getByRole("button", { name: "Draft adviser brief" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Review risk" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Open adviser brief" })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Draft adviser brief" }));
    fireEvent.click(screen.getByRole("button", { name: "Review risk" }));

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
        capabilities={getPerformanceWorkspaceCapabilities(workspace)}
        onModeChange={vi.fn()}
      />
    );

    expect(screen.getByRole("link", { name: "Return to Portfolio" })).toHaveAttribute(
      "href",
      "/portfolio?portfolioId=PB_SG_GLOBAL_BAL_001"
    );
  });
});
