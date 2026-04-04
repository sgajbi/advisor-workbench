import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import PerformanceAdvisorBriefMode from "../../src/apps/performance/components/performance-advisor-brief-mode";
import { getPerformanceWorkspaceCapabilities } from "../../src/apps/performance/capabilities";
import { buildSupportedPerformanceScenario } from "../fixtures/performance-workspace-fixtures";

describe("PerformanceAdvisorBriefMode", () => {
  it("renders a source-grounded preview with supportability, metrics, and AI contract metadata", () => {
    const workspace = buildSupportedPerformanceScenario().workspace;
    const onSelectMode = vi.fn();

    render(
      <PerformanceAdvisorBriefMode
        workspace={workspace}
        capabilities={getPerformanceWorkspaceCapabilities(workspace)}
        period={workspace.period}
        detailBasis="NET"
        contributionDimension="asset_class"
        attributionDimension="asset_class"
        chartFrequency="monthly"
        benchmark={workspace.benchmark_code ?? undefined}
        onRequestChange={vi.fn()}
        isUpdating={false}
        isDetailsPending={false}
        onSelectMode={onSelectMode}
      />
    );

    expect(
      screen.getByRole("heading", { name: "Performance Advisor Brief" })
    ).toBeInTheDocument();
    expect(screen.getByLabelText("Advisor brief toolbar")).toHaveTextContent("Source-grounded");
    expect(screen.getByLabelText("Advisor brief supportability")).toHaveTextContent(
      "Advisor Brief: Preview Ready"
    );
    expect(screen.getByLabelText("Client Talking Points")).toHaveTextContent(
      "Portfolio delivered 5.42% versus benchmark 4.91%."
    );
    expect(screen.getByLabelText("Risks and Exceptions")).toHaveTextContent(
      "No material supportability exceptions are flagged"
    );
    expect(screen.getByLabelText("Source Metrics")).toHaveTextContent("Portfolio Return");
    expect(screen.getByText("Brief provenance")).toBeInTheDocument();
    expect(screen.queryByText("foundation.explain.v1")).not.toBeInTheDocument();
    expect(screen.queryByText("EXPLANATION_ONLY")).not.toBeInTheDocument();

    fireEvent.click(
      within(screen.getByLabelText("Recommended Actions")).getByRole("button", {
        name: /Review Contribution/,
      })
    );

    expect(onSelectMode).toHaveBeenCalledWith("analysis");
  });

  it("opens Summary when a source metric card is selected", () => {
    const workspace = buildSupportedPerformanceScenario().workspace;
    const onSelectMode = vi.fn();

    render(
      <PerformanceAdvisorBriefMode
        workspace={workspace}
        capabilities={getPerformanceWorkspaceCapabilities(workspace)}
        period={workspace.period}
        detailBasis="NET"
        contributionDimension="asset_class"
        attributionDimension="asset_class"
        chartFrequency="monthly"
        benchmark={workspace.benchmark_code ?? undefined}
        onRequestChange={vi.fn()}
        isUpdating={false}
        isDetailsPending={false}
        onSelectMode={onSelectMode}
      />
    );

    fireEvent.click(
      within(screen.getByLabelText("Source Metrics")).getByRole("button", {
        name: /Active Return/,
      })
    );

    expect(onSelectMode).toHaveBeenCalledWith("summary");
  });
});
