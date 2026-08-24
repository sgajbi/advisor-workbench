import React from "react";
import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import PerformanceAnalysisAttributionSection from "../../src/apps/performance/components/performance-analysis-attribution-section";
import type { PerformanceAnalysisAttributionSectionProps } from "../../src/apps/performance/components/performance-workspace-types";
import {
  buildPerformanceCapabilities,
  buildPartialAttributionPerformanceScenario,
  buildSupportedPerformanceScenario,
  buildUnavailableAttributionPerformanceScenario,
} from "../fixtures/performance-workspace-fixtures";

const supportedCapabilities = buildPerformanceCapabilities();

function buildProps(
  overrides: Partial<PerformanceAnalysisAttributionSectionProps> = {}
): PerformanceAnalysisAttributionSectionProps {
  const workspace = buildSupportedPerformanceScenario().workspace;
  return {
    workspace,
    attributionDimension: "asset_class",
    onRequestChange: vi.fn(),
    isUpdating: false,
    isDetailsPending: false,
    capabilities: supportedCapabilities,
    ...overrides,
  };
}

describe("PerformanceAnalysisAttributionSection", () => {
  it("renders benchmark-relative attribution detail and effect ranking", () => {
    render(<PerformanceAnalysisAttributionSection {...buildProps()} />);

    expect(screen.getByRole("heading", { name: "Attribution Detail" })).toBeInTheDocument();
    expect(document.querySelector("#performance-attribution.workbench-chart-shell")).toBeTruthy();
    expect(document.querySelector(".performance-analysis-toolbar")).toBeTruthy();
    expect(document.querySelector(".performance-analysis-toolbar-context")).toBeFalsy();
    expect(screen.queryByLabelText("Analysis context")).not.toBeInTheDocument();
    expect(screen.queryByText(/^Versus /i)).not.toBeInTheDocument();
    expect(screen.queryByRole("group", { name: "Attribution detail context" })).not.toBeInTheDocument();
    expect(screen.getByText("View Details")).toBeInTheDocument();
    expect(screen.queryByLabelText("Attribution summary strip")).not.toBeInTheDocument();
    expect(screen.getByRole("note")).toHaveTextContent("Residual immaterial");
    expect(document.querySelector(".performance-analysis-drilldown-workspace")).toBeFalsy();
    expect(document.querySelectorAll(".performance-analysis-drilldown-pane")).toHaveLength(0);
    expect(screen.queryByLabelText("Top Effects panel")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Attribution Detail panel")).not.toBeInTheDocument();
    expect(screen.queryByText("Top Effects")).not.toBeInTheDocument();
    expect(screen.queryByText("Segment Attribution")).not.toBeInTheDocument();
    expect(screen.queryByText("Top Active Effects")).not.toBeInTheDocument();
    expect(document.querySelector(".workbench-ranked-bar-list")).toBeFalsy();
    expect(screen.queryByRole("tab")).not.toBeInTheDocument();
    expect(screen.getByLabelText("Asset Class attribution table")).toBeInTheDocument();
    expect(screen.queryByLabelText("Attribution effect legend")).not.toBeInTheDocument();
    expect(screen.getByText("Active weight")).toBeInTheDocument();
    expect(screen.getByText("Active return")).toBeInTheDocument();
    expect(screen.getByText("Allocation")).toBeInTheDocument();
    expect(screen.getByText("Selection")).toBeInTheDocument();
    expect(screen.getByText("Interaction")).toBeInTheDocument();
    expect(screen.getByText("Total effect")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Attribution Detail methodology and coverage" }));

    const drawer = screen.getByRole("dialog", { name: "Attribution Detail methodology and coverage" });
    expect(drawer).toHaveTextContent("Benchmark Source");
    expect(drawer).toHaveTextContent("Attribution Model");
    expect(drawer).toHaveTextContent("Linking Method");
  });

  it("renders an actionable fallback when attribution detail is unavailable", () => {
    const scenario = buildUnavailableAttributionPerformanceScenario();

    render(
      <PerformanceAnalysisAttributionSection
        {...buildProps({
          workspace: scenario.workspace,
          capabilities: scenario.capabilities,
        })}
      />
    );

    expect(screen.getByText("Attribution detail unavailable")).toBeInTheDocument();
    expect(
      screen.getByText("Attribution detail is not available for the current selection.")
    ).toBeInTheDocument();
    expect(
      document.querySelector(".performance-analysis-state-panel-unavailable .module-state-panel")
    ).toBeTruthy();
  });

  it("renders a partial-state panel when attribution coverage is incomplete", () => {
    const scenario = buildPartialAttributionPerformanceScenario();

    render(
      <PerformanceAnalysisAttributionSection
        {...buildProps({
          workspace: scenario.workspace,
          capabilities: scenario.capabilities,
        })}
      />
    );

    expect(screen.getByText("Attribution detail is partial")).toBeInTheDocument();
    expect(
      screen.getByText("Portfolio-only exposure was found in the attribution set.")
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        "Review source reason codes, residual materiality, and supportability evidence before using attribution in client-facing commentary."
      )
    ).toBeInTheDocument();
    expect(screen.getByRole("note")).toHaveTextContent("Residual under review");
    expect(screen.getByText("1 portfolio-only group")).toBeInTheDocument();
    expect(screen.queryByRole("group", { name: "Attribution detail context" })).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Attribution summary strip")).not.toBeInTheDocument();
    expect(screen.queryByRole("tab")).not.toBeInTheDocument();
    expect(screen.queryByText("Attribution Summary")).not.toBeInTheDocument();
    expect(
      screen.queryByText(
        "Segment rows are unavailable for this selection. Total benchmark-relative effects remain available below."
      )
    ).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Attribution summary metrics")).not.toBeInTheDocument();
    expect(screen.getByLabelText("Asset Class attribution totals")).toBeInTheDocument();
    expect(screen.getByText("Summary total")).toBeInTheDocument();
    expect(screen.getByText("Allocation")).toBeInTheDocument();
    expect(screen.getByText("Selection")).toBeInTheDocument();
    expect(screen.getByText("Interaction")).toBeInTheDocument();
    expect(screen.getByText("Total effect")).toBeInTheDocument();
    expect(screen.queryByLabelText("Asset Class attribution table")).not.toBeInTheDocument();
    expect(screen.getByRole("combobox")).toHaveAttribute("aria-disabled", "true");
    expect(screen.queryByText("Top Active Effects")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Top Effects panel")).not.toBeInTheDocument();
    expect(
      document.querySelector(".performance-analysis-state-panel-partial .module-state-panel")
    ).toBeTruthy();
  });

  it("suppresses summary fallback when the requested attribution segment has a benchmark classification gap", () => {
    const scenario = buildPartialAttributionPerformanceScenario();
    scenario.workspace.partial_failures = [
      {
        source_service: "lotus-performance",
        error_code: "HTTP_422",
        detail:
          "Benchmark component IDX_GLOBAL_BOND_TR missing classification label for sector.",
      },
    ];

    render(
      <PerformanceAnalysisAttributionSection
        {...buildProps({
          workspace: scenario.workspace,
          attributionDimension: "sector",
          capabilities: scenario.capabilities,
        })}
      />
    );

    expect(screen.getByText("Attribution detail is partial")).toBeInTheDocument();
    expect(
      screen.getByText(
        "Sector attribution detail is unavailable because the selected benchmark does not expose complete sector classification for every component."
      )
    ).toBeInTheDocument();
    expect(screen.queryByText("Summary total")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Sector attribution totals")).not.toBeInTheDocument();
  });

  it("renders one combined attribution table with comparison and decomposition columns", () => {
    render(<PerformanceAnalysisAttributionSection {...buildProps()} />);

    const table = screen.getByLabelText("Asset Class attribution table");
    expect(table).toBeInTheDocument();
    expect(within(table).getByText("Portfolio weight")).toBeInTheDocument();
    expect(within(table).getByText("Benchmark weight")).toBeInTheDocument();
    expect(within(table).getByText("Active weight")).toBeInTheDocument();
    expect(within(table).getByText("Portfolio TWR")).toBeInTheDocument();
    expect(within(table).getByText("Benchmark TWR")).toBeInTheDocument();
    expect(within(table).getByText("Active return")).toBeInTheDocument();
    expect(within(table).getByText("Allocation")).toBeInTheDocument();
    expect(within(table).getByText("Selection")).toBeInTheDocument();
    expect(within(table).getByText("Interaction")).toBeInTheDocument();
    expect(within(table).getByText("Total effect")).toBeInTheDocument();
  });

  it("keeps domain-authored effect totals authoritative when detail rows disagree", () => {
    const workspace = buildSupportedPerformanceScenario().workspace;
    const level = workspace.attribution?.levels[0];
    expect(level).toBeDefined();

    level!.rows = [
      {
        ...level!.rows[0],
        allocation_pct: 9.91,
        selection_pct: 9.92,
        interaction_pct: 9.93,
        total_effect_pct: 29.76,
      },
    ];

    render(<PerformanceAnalysisAttributionSection {...buildProps({ workspace })} />);

    const table = screen.getByLabelText("Asset Class attribution table");
    const footer = table.querySelector("tfoot");
    expect(footer).not.toBeNull();
    expect(footer).toHaveTextContent("0.18%");
    expect(footer).toHaveTextContent("0.24%");
    expect(footer).toHaveTextContent("0.03%");
    expect(footer).toHaveTextContent("0.45%");
    expect(footer).not.toHaveTextContent("9.91%");
    expect(footer).not.toHaveTextContent("9.92%");
    expect(footer).not.toHaveTextContent("9.93%");
    expect(footer).not.toHaveTextContent("29.76%");
  });

  it("labels missing source component totals without reconstructing them from detail rows", () => {
    const workspace = buildSupportedPerformanceScenario().workspace;
    const level = workspace.attribution?.levels[0];
    expect(level).toBeDefined();

    level!.allocation_total_pct = null;
    level!.selection_total_pct = null;
    level!.interaction_total_pct = null;

    render(<PerformanceAnalysisAttributionSection {...buildProps({ workspace })} />);

    const table = screen.getByLabelText("Asset Class attribution table");
    const footer = table.querySelector("tfoot");
    expect(footer).not.toBeNull();
    expect(within(footer as HTMLElement).getAllByText("Unavailable")).toHaveLength(3);
    expect(footer).toHaveTextContent("0.45%");
    expect(footer).not.toHaveTextContent("0.18%");
    expect(footer).not.toHaveTextContent("0.24%");
    expect(footer).not.toHaveTextContent("0.03%");
  });

  it("keeps summary-only attribution totals source-backed when components are absent", () => {
    const scenario = buildPartialAttributionPerformanceScenario();
    const level = scenario.workspace.attribution?.levels[0];
    expect(level).toBeDefined();

    level!.allocation_total_pct = null;
    level!.selection_total_pct = null;
    level!.interaction_total_pct = null;

    render(
      <PerformanceAnalysisAttributionSection
        {...buildProps({
          workspace: scenario.workspace,
          capabilities: scenario.capabilities,
        })}
      />
    );

    const table = screen.getByLabelText("Asset Class attribution totals");
    expect(within(table).getAllByText("Unavailable")).toHaveLength(3);
    expect(table).toHaveTextContent("0.45%");
  });

  it("disables attribution segment options that are outside the backend capability contract", () => {
    render(
      <PerformanceAnalysisAttributionSection
        {...buildProps({
          capabilities: buildPerformanceCapabilities({
            attributionDetail: {
              state: "supported",
              supportedDimensions: ["asset_class", "country"],
              supportedFrequencies: ["monthly"],
            },
          }),
        })}
      />
    );

    fireEvent.mouseDown(screen.getByRole("combobox"));
    const options = within(screen.getByRole("listbox")).getAllByRole("option");
    expect(options.find((option) => option.textContent === "Asset Class")).not.toHaveAttribute(
      "aria-disabled"
    );
    expect(options.find((option) => option.textContent === "Country")).not.toHaveAttribute(
      "aria-disabled"
    );
    expect(options.find((option) => option.textContent === "Sector")).toHaveAttribute(
      "aria-disabled",
      "true"
    );
    expect(options.find((option) => option.textContent === "Currency")).toHaveAttribute(
      "aria-disabled",
      "true"
    );
  });
});
