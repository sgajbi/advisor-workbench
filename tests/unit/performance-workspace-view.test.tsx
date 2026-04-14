import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import PerformanceWorkspaceView from "../../src/apps/performance/components/performance-workspace-view";
import {
  buildNormalizedControlsPerformanceScenario,
  buildSupportedPerformanceScenario,
  buildUnavailableAttributionPerformanceScenario,
  buildUnavailableEvidencePerformanceScenario,
} from "../fixtures/performance-workspace-fixtures";
import type { PerformanceWorkspaceMode } from "../../src/apps/performance/performance-workspace-modes";

vi.mock("next/dynamic", () => ({
  default: (loader: () => Promise<unknown>) => {
    const React = require("react");
    return function MockDynamicComponent(props: Record<string, unknown>) {
      const [Component, setComponent] = React.useState(
        null as React.ComponentType<Record<string, unknown>> | null
      );
      React.useEffect(() => {
        loader().then((mod: unknown) => {
          const resolved =
            typeof mod === "function"
              ? (mod as React.ComponentType<Record<string, unknown>>)
              : (mod as { default?: React.ComponentType<Record<string, unknown>> }).default;
          setComponent(() => resolved ?? null);
        });
      }, []);
      return Component ? React.createElement(Component, props) : null;
    };
  },
}));

const summaryModeMock = vi.fn((_: unknown) => <div>Summary Mode Panel</div>);
const analysisModeMock = vi.fn((_: unknown) => <div>Analysis Mode Panel</div>);
const riskModeMock = vi.fn((_: unknown) => <div>Risk Mode Panel</div>);
const evidenceModeMock = vi.fn((_: unknown) => <div>Evidence Mode Panel</div>);

vi.mock("../../src/apps/performance/components/performance-summary-mode", () => ({
  default: (props: unknown) => summaryModeMock(props),
}));

vi.mock("../../src/apps/performance/components/performance-analysis-mode", () => ({
  default: (props: unknown) => analysisModeMock(props),
}));

vi.mock("../../src/apps/performance/components/performance-risk-mode", () => ({
  default: (props: unknown) => riskModeMock(props),
}));

vi.mock("../../src/apps/performance/components/performance-evidence-mode", () => ({
  default: (props: unknown) => evidenceModeMock(props),
}));

describe("PerformanceWorkspaceView", () => {
  function renderWorkspaceView({
    mode = "summary",
    workspace = buildSupportedPerformanceScenario().workspace,
    isDetailsPending = false,
  }: {
    mode?: PerformanceWorkspaceMode;
    workspace?: ReturnType<typeof buildSupportedPerformanceScenario>["workspace"];
    isDetailsPending?: boolean;
  }) {
    function Harness() {
      const [selectedMode, setSelectedMode] = React.useState<PerformanceWorkspaceMode>(mode);

      return (
        <PerformanceWorkspaceView
          workspace={workspace}
          mode={selectedMode}
          period="YTD"
          detailBasis="NET"
          contributionDimension="asset_class"
          attributionDimension="asset_class"
          chartFrequency="monthly"
          onModeChange={setSelectedMode}
          isDetailsPending={isDetailsPending}
        />
      );
    }

    return render(<Harness />);
  }

  it("keeps summary mode as the only mounted mode on initial render", async () => {
    const scenario = buildSupportedPerformanceScenario();

    renderWorkspaceView({ workspace: scenario.workspace });

    expect(screen.getByRole("button", { name: "Performance Overview" })).toHaveAttribute(
      "aria-pressed",
      "true"
    );

    await waitFor(() => {
      expect(screen.getByText("Summary Mode Panel")).toBeInTheDocument();
    });

    expect(summaryModeMock).toHaveBeenCalledTimes(1);
    expect(analysisModeMock).not.toHaveBeenCalled();
    expect(riskModeMock).not.toHaveBeenCalled();
    expect(evidenceModeMock).not.toHaveBeenCalled();
    expect(document.querySelector(".workbench-deferred-placeholder")).toBeFalsy();
    expect(screen.queryByText("Analysis Mode Panel")).not.toBeInTheDocument();
    expect(screen.queryByText("Evidence Mode Panel")).not.toBeInTheDocument();
  });

  it("passes contract-backed evidence capability into evidence mode from the shared scenario", async () => {
    const scenario = buildUnavailableEvidencePerformanceScenario();

    renderWorkspaceView({ workspace: scenario.workspace });

    expect(screen.getByRole("button", { name: /^Evidence/i })).toBeDisabled();
    expect(screen.queryByRole("group", { name: "Performance mode readiness" })).not.toBeInTheDocument();
  });

  it("disables unavailable evidence mode instead of mounting a dead panel", async () => {
    const scenario = buildUnavailableEvidencePerformanceScenario();

    renderWorkspaceView({ workspace: scenario.workspace });

    fireEvent.click(screen.getByRole("button", { name: "Performance Overview" }));
    expect(screen.getByRole("button", { name: /^Evidence/i })).toBeDisabled();
    expect(screen.queryByText("Evidence Mode Panel")).not.toBeInTheDocument();
    expect(evidenceModeMock).not.toHaveBeenCalled();
  });

  it("keeps analysis available when there is at least partial analytical coverage", async () => {
    const scenario = buildSupportedPerformanceScenario();

    renderWorkspaceView({ workspace: scenario.workspace });

    expect(screen.getByRole("button", { name: /^Performance Analysis/i })).not.toBeDisabled();
    fireEvent.click(screen.getByRole("button", { name: /^Performance Analysis/i }));
    await waitFor(() => {
      expect(screen.getByText("Analysis Mode Panel")).toBeInTheDocument();
    });
  });

  it("keeps analysis navigable while detail availability is still hydrating", async () => {
    const scenario = buildUnavailableAttributionPerformanceScenario();

    renderWorkspaceView({ workspace: scenario.workspace, isDetailsPending: true });

    const analysisButton = screen.getByRole("button", { name: /^Performance Analysis/i });
    expect(analysisButton).not.toBeDisabled();
    expect(analysisButton).toHaveAttribute("title", "Analysis availability is loading.");
    expect(screen.getByText("Loading")).toBeInTheDocument();

    fireEvent.click(analysisButton);
    await waitFor(() => {
      expect(screen.getByText("Analysis Mode Panel")).toBeInTheDocument();
    });
  });

  it("shows a backend-backed control normalization notice when unsupported deep-link controls were adjusted", async () => {
    const scenario = buildNormalizedControlsPerformanceScenario();

    renderWorkspaceView({ workspace: scenario.workspace });

    const normalizationNotice = screen.getByRole("status", {
      name: "Performance control normalization",
    });
    expect(normalizationNotice).toHaveTextContent("Selection adjusted");
    expect(normalizationNotice).toHaveTextContent("frequency reset to Monthly");
    expect(normalizationNotice).toHaveTextContent(
      "contribution view reset to Asset Class"
    );
    expect(normalizationNotice).toHaveTextContent(
      "attribution view reset to Asset Class"
    );
  });

  it("switches between summary, analysis, risk, and evidence modes", async () => {
    const scenario = buildSupportedPerformanceScenario();

    renderWorkspaceView({ workspace: scenario.workspace });

    expect(document.querySelector(".main-with-side-rail-layout.workstation-shell-both")).toBeTruthy();
    expect(document.querySelector(".workstation-shell-rail.performance-rail-shell")).toBeTruthy();
    expect(document.querySelector(".workstation-shell-main")).toBeTruthy();
    expect(document.querySelector(".workstation-shell-side.performance-side")).toBeTruthy();
    expect(document.querySelector(".workspace-layout")).toBeFalsy();
    expect(document.querySelector(".lotus-workstation-header")).toBeFalsy();
    expect(document.querySelector(".workbench-page-frame.performance-page-frame")).toBeTruthy();
    expect(document.querySelector(".workbench-page-frame-header.workbench-page-header")).toBeTruthy();
    expect(document.querySelector(".workbench-page-frame-body.performance-page-frame-body")).toBeTruthy();
    expect(document.querySelector(".workbench-section-stack.performance-page-sections")).toBeTruthy();
    expect(screen.getByText("Quick Views")).toBeInTheDocument();
    expect(screen.getByText("Client Context")).toBeInTheDocument();
    const railSections = Array.from(
      document.querySelectorAll(".performance-workspace-rail .performance-rail-section-label")
    ).map((node) => node.textContent?.trim());
    expect(railSections.slice(0, 3)).toEqual(["Client Context", "Performance", "Quick Views"]);
    expect(
      screen.queryByText(
        "Review benchmark-aware outcome, horizon comparisons, and contributor leadership in one governed performance surface before moving into deeper analysis."
      )
    ).not.toBeInTheDocument();
    expect(screen.queryByText("Current review horizon")).not.toBeInTheDocument();
    expect(screen.queryByText("Supportability")).not.toBeInTheDocument();
    expect(
      screen.queryByText(
        "Move between summary, diagnostics, advisory narrative, and risk review without losing context."
      )
    ).not.toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Performance" })).toBeInTheDocument();
    expect(document.querySelector(".workbench-page-header-subtitle")).toBeFalsy();
    expect(document.querySelector(".workbench-page-header-actions .workbench-segmented-control"))
      .toBeFalsy();
    expect(screen.queryByRole("group", { name: "Performance mode readiness" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Performance Overview" })).toHaveAttribute(
      "aria-pressed",
      "true"
    );
    await waitFor(() => {
      expect(screen.getByText("Summary Mode Panel")).toBeInTheDocument();
    });
    expect(summaryModeMock).toHaveBeenCalled();
    expect(summaryModeMock.mock.calls.at(-1)?.[0]).toMatchObject({
      workspace: scenario.workspace,
      selectedBenchmarkCode: scenario.workspace.benchmark_code,
    });
    expect(screen.queryByText("Analysis Mode Panel")).not.toBeInTheDocument();
    expect(screen.queryByText("Risk Mode Panel")).not.toBeInTheDocument();
    expect(screen.queryByText("Evidence Mode Panel")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /^Performance Analysis/i }));
    expect(screen.getByText("Loading analysis summary")).toBeInTheDocument();
    expect(screen.getByText("Loading attribution trend")).toBeInTheDocument();
    expect(screen.getByText("Loading attribution detail")).toBeInTheDocument();
    expect(screen.getByText("Loading contribution detail")).toBeInTheDocument();
    expect(document.querySelector(".workbench-deferred-placeholder")).toBeTruthy();
    expect(screen.queryByText("Analysis Mode Panel")).not.toBeInTheDocument();
    await waitFor(() => {
      expect(screen.getByText("Analysis Mode Panel")).toBeInTheDocument();
    });
    expect(analysisModeMock).toHaveBeenCalled();
    expect(analysisModeMock.mock.calls.at(-1)?.[0]).toMatchObject({
      workspace: scenario.workspace,
      chartFrequency: "monthly",
      contributionDimension: "asset_class",
      attributionDimension: "asset_class",
    });
    expect(screen.queryByText("Summary Mode Panel")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /^Risk Review/i }));
    await waitFor(() => {
      expect(screen.getByText("Risk Mode Panel")).toBeInTheDocument();
    });
    expect(screen.getAllByRole("heading", { name: "Risk" }).length).toBeGreaterThanOrEqual(1);
    expect(document.querySelector(".workbench-page-header-subtitle")).toBeFalsy();
    expect(riskModeMock).toHaveBeenCalled();
    expect(riskModeMock.mock.calls.at(-1)?.[0]).toMatchObject({
      workspace: scenario.workspace,
      chartFrequency: "monthly",
      contributionDimension: "asset_class",
      attributionDimension: "asset_class",
    });
    expect(screen.queryByText("Analysis Mode Panel")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /^Evidence/i }));
    expect(screen.getByRole("button", { name: /^Evidence/i })).toBeDisabled();
    expect(screen.queryByText("Evidence Mode Panel")).not.toBeInTheDocument();
    expect(evidenceModeMock).not.toHaveBeenCalled();
    expect(screen.getByText("Risk Mode Panel")).toBeInTheDocument();
  });
});
