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

vi.mock("../../src/apps/performance/components/performance-relative-segment-panel", () => ({
  default: () => <div>Relative Segment Panel</div>,
}));

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
    relativeSegmentRows: [
      {
        key_label: "Equity",
        portfolio_weight_avg_pct: 61,
        benchmark_weight_avg_pct: 58,
        portfolio_return_pct: 7.4,
        benchmark_return_pct: 6.8,
        allocation_pct: 0.18,
        selection_pct: 0.24,
        interaction_pct: 0.03,
        total_effect_pct: 0.45,
        active_weight_pct: 3,
        active_return_pct: 0.6,
      },
    ],
    topAttributionEffectRows: [
      {
        key_label: "Equity",
        portfolio_weight_avg_pct: 61,
        benchmark_weight_avg_pct: 58,
        portfolio_return_pct: 7.4,
        benchmark_return_pct: 6.8,
        allocation_pct: 0.18,
        selection_pct: 0.24,
        interaction_pct: 0.03,
        total_effect_pct: 0.45,
      },
    ],
    attributionEffectScale: 0.45,
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
    expect(screen.getByRole("group", { name: "Attribution detail context" })).toBeInTheDocument();
    expect(screen.getByRole("group", { name: "Attribution detail context" })).toHaveTextContent(
      /Benchmark\s*Global Balanced 60\/40\s*•\s*USD/i
    );
    expect(screen.getByRole("group", { name: "Attribution detail context" })).toHaveTextContent(
      /Benchmark Source\s*Calculated/i
    );
    expect(screen.getByRole("group", { name: "Attribution detail context" })).toHaveTextContent(
      /Attribution Model\s*Brinson-Fachler/i
    );
    expect(screen.getByRole("group", { name: "Attribution detail context" })).toHaveTextContent(
      /Linking Method\s*Carino/i
    );
    expect(screen.getByLabelText("Attribution summary strip")).toBeInTheDocument();
    expect(screen.queryByRole("note")).not.toBeInTheDocument();
    expect(document.querySelector(".performance-analysis-drilldown-workspace")).toBeFalsy();
    expect(document.querySelectorAll(".performance-analysis-drilldown-pane")).toHaveLength(0);
    expect(screen.queryByLabelText("Top Effects panel")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Attribution Detail panel")).not.toBeInTheDocument();
    expect(screen.queryByText("Top Effects")).not.toBeInTheDocument();
    expect(screen.getByText("Segment Attribution")).toBeInTheDocument();
    expect(
      screen.getByText("Benchmark-relative segment context and Brinson effect breakdown.")
    ).toBeInTheDocument();
    expect(screen.getByText("Relative Segment Panel")).toBeInTheDocument();
    expect(screen.queryByText("Top Active Effects")).not.toBeInTheDocument();
    expect(document.querySelector(".workbench-ranked-bar-list")).toBeFalsy();
    expect(screen.getByRole("tab", { name: "Relative Segment Context" })).toHaveAttribute(
      "aria-selected",
      "true"
    );
    expect(screen.getByRole("tab", { name: "Effect Breakdown" })).toHaveAttribute(
      "aria-selected",
      "false"
    );
    expect(screen.getAllByText(/Global Balanced 60\/40/).length).toBeGreaterThanOrEqual(1);
    expect(screen.queryByLabelText("Asset Class attribution table")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Attribution effect legend")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("tab", { name: "Effect Breakdown" }));

    expect(screen.getByRole("tab", { name: "Effect Breakdown" })).toHaveAttribute(
      "aria-selected",
      "true"
    );
    expect(screen.getByLabelText("Attribution effect legend")).toBeInTheDocument();
  });

  it("renders an actionable fallback when attribution detail is unavailable", () => {
    const scenario = buildUnavailableAttributionPerformanceScenario();

    render(
      <PerformanceAnalysisAttributionSection
        {...buildProps({
          workspace: scenario.workspace,
          capabilities: scenario.capabilities,
          relativeSegmentRows: [],
          topAttributionEffectRows: [],
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
          relativeSegmentRows: [],
          topAttributionEffectRows: [],
        })}
      />
    );

    expect(screen.getByText("Attribution detail is partial")).toBeInTheDocument();
    expect(
      screen.getByText(
        "Benchmark-relative attribution is available only at summary level for the current selection."
      )
    ).toBeInTheDocument();
    expect(
      screen.getByText("Summary-level attribution remains available even when segment rows are absent.")
    ).toBeInTheDocument();
    expect(screen.queryByRole("note")).not.toBeInTheDocument();
    expect(screen.getByRole("group", { name: "Attribution detail context" })).toBeInTheDocument();
    expect(screen.getByLabelText("Attribution summary strip")).toBeInTheDocument();
    expect(screen.queryByText("Attribution Summary")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Asset Class attribution totals")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("tab", { name: "Effect Breakdown" }));
    expect(screen.getByText("Attribution Summary")).toBeInTheDocument();
    expect(
      screen.getByText(
        "Segment rows are unavailable for this selection. Total benchmark-relative effects remain available below."
      )
    ).toBeInTheDocument();
    expect(screen.getByLabelText("Asset Class attribution totals")).toBeInTheDocument();
    expect(screen.getByText("Summary Total")).toBeInTheDocument();
    expect(screen.queryByLabelText("Asset Class attribution table")).not.toBeInTheDocument();
    expect(screen.getByRole("combobox")).toHaveAttribute("aria-disabled", "true");
    expect(screen.queryByText("Relative Segment Panel")).not.toBeInTheDocument();
    expect(screen.queryByText("Top Active Effects")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Top Effects panel")).not.toBeInTheDocument();
    expect(
      document.querySelector(".performance-analysis-state-panel-partial .module-state-panel")
    ).toBeTruthy();
  });

  it("shows only one attribution detail surface at a time and switches to the effect breakdown grid", () => {
    render(<PerformanceAnalysisAttributionSection {...buildProps()} />);

    expect(screen.getByText("Relative Segment Panel")).toBeInTheDocument();
    expect(screen.queryByLabelText("Asset Class attribution table")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("tab", { name: "Effect Breakdown" }));

    expect(screen.getByRole("tab", { name: "Effect Breakdown" })).toHaveAttribute(
      "aria-selected",
      "true"
    );
    expect(screen.queryByText("Relative Segment Panel")).not.toBeInTheDocument();
    expect(screen.getByLabelText("Asset Class attribution table")).toBeInTheDocument();
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
