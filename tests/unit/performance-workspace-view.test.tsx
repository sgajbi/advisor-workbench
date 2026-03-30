import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import PerformanceWorkspaceView from "../../src/apps/performance/components/performance-workspace-view";
import {
  buildSupportedPerformanceScenario,
  buildUnavailableEvidencePerformanceScenario,
} from "../fixtures/performance-workspace-fixtures";

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
const evidenceModeMock = vi.fn((_: unknown) => <div>Evidence Mode Panel</div>);

vi.mock("../../src/apps/performance/components/performance-summary-mode", () => ({
  default: (props: unknown) => summaryModeMock(props),
}));

vi.mock("../../src/apps/performance/components/performance-analysis-mode", () => ({
  default: (props: unknown) => analysisModeMock(props),
}));

vi.mock("../../src/apps/performance/components/performance-evidence-mode", () => ({
  default: (props: unknown) => evidenceModeMock(props),
}));

describe("PerformanceWorkspaceView", () => {
  it("passes contract-backed evidence capability into evidence mode from the shared scenario", async () => {
    const scenario = buildUnavailableEvidencePerformanceScenario();

    render(
      <PerformanceWorkspaceView
        workspace={scenario.workspace}
        period="YTD"
        detailBasis="NET"
        contributionDimension="asset_class"
        attributionDimension="asset_class"
        chartFrequency="monthly"
      />
    );

    fireEvent.click(screen.getByRole("tab", { name: "Evidence" }));
    await waitFor(() => {
      expect(screen.getByText("Evidence Mode Panel")).toBeInTheDocument();
    });

    expect(evidenceModeMock).toHaveBeenCalled();
    expect(evidenceModeMock.mock.calls.at(-1)?.[0]).toMatchObject({
      capability: {
        state: "unavailable",
      },
    });
  });

  it("switches between summary, analysis, and evidence modes", async () => {
    const scenario = buildSupportedPerformanceScenario();

    render(
      <PerformanceWorkspaceView
        workspace={scenario.workspace}
        period="YTD"
        detailBasis="NET"
        contributionDimension="asset_class"
        attributionDimension="asset_class"
        chartFrequency="monthly"
      />
    );

    expect(document.querySelector(".workstation-shell-main-only")).toBeTruthy();
    expect(document.querySelector(".workstation-shell-main")).toBeTruthy();
    expect(document.querySelector(".workspace-layout")).toBeFalsy();
    expect(document.querySelector(".lotus-workstation-header")).toBeFalsy();
    expect(document.querySelector(".workbench-page-frame.performance-page-frame")).toBeTruthy();
    expect(document.querySelector(".workbench-page-frame-header.workbench-page-header")).toBeTruthy();
    expect(document.querySelector(".workbench-page-frame-body.performance-page-frame-body")).toBeTruthy();
    expect(document.querySelector(".workbench-section-stack.performance-page-sections")).toBeTruthy();
    expect(screen.getByRole("heading", { name: "Performance Workbench" })).toBeInTheDocument();
    expect(
      screen.getByText(
        "Benchmark-aware portfolio performance, attribution, and contribution analysis"
      )
    ).toBeInTheDocument();
    expect(document.querySelector(".workbench-page-header-actions .workbench-segmented-control"))
      .toBeTruthy();
    expect(screen.getByRole("tablist", { name: "Performance workspace mode" })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Summary" })).toHaveClass(
      "workbench-segmented-control-button-active"
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
    expect(screen.queryByText("Evidence Mode Panel")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("tab", { name: "Analysis" }));
    expect(screen.getByText("Loading analysis")).toBeInTheDocument();
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

    fireEvent.click(screen.getByRole("tab", { name: "Evidence" }));
    expect(screen.queryByText("Evidence Mode Panel")).not.toBeInTheDocument();
    await waitFor(() => {
      expect(screen.getByText("Evidence Mode Panel")).toBeInTheDocument();
    });
    expect(evidenceModeMock).toHaveBeenCalled();
    expect(evidenceModeMock.mock.calls.at(-1)?.[0]).toMatchObject({
      capability: {
        state: "unavailable",
      },
    });
    expect(screen.queryByText("Analysis Mode Panel")).not.toBeInTheDocument();
  });
});
