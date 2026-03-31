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

    expect(screen.getByText("Attribution Detail")).toBeInTheDocument();
    expect(document.querySelector("#performance-attribution.workbench-chart-shell")).toBeTruthy();
    expect(document.querySelector(".performance-analysis-toolbar")).toBeTruthy();
    expect(document.querySelector(".performance-analysis-toolbar-context")).toBeTruthy();
    expect(screen.getByText(/Versus Global Balanced 60\/40 • Calculated • Lotus Demo/i)).toBeInTheDocument();
    expect(screen.getByRole("group", { name: "Attribution detail context" })).toBeInTheDocument();
    expect(screen.getByRole("group", { name: "Attribution detail context" })).toHaveTextContent(
      /Benchmark\s*Global Balanced 60\/40\s*•\s*Calculated\s*•\s*Lotus Demo/i
    );
    expect(screen.getByRole("group", { name: "Attribution detail context" })).toHaveTextContent(
      /Source\s*Calculated/i
    );
    expect(screen.getByRole("group", { name: "Attribution detail context" })).toHaveTextContent(
      /Model\s*BF/i
    );
    expect(screen.getByRole("group", { name: "Attribution detail context" })).toHaveTextContent(
      /Linking\s*Carino/i
    );
    expect(screen.getByLabelText("Attribution summary strip")).toBeInTheDocument();
    const reconciliationNote = screen.getByRole("note");
    expect(reconciliationNote).toHaveTextContent("Residual remains after effects");
    expect(reconciliationNote).toHaveTextContent(
      "Active return 0.52% • effects sum 0.50% • residual 0.02%"
    );
    expect(document.querySelector(".performance-analysis-drilldown-workspace")).toBeTruthy();
    expect(document.querySelectorAll(".performance-analysis-drilldown-pane")).toHaveLength(2);
    expect(screen.getByLabelText("Attribution ranked insight panel")).toBeInTheDocument();
    expect(screen.getByLabelText("Attribution detail grid panel")).toBeInTheDocument();
    expect(screen.getByText("Ranked insight")).toBeInTheDocument();
    expect(
      screen.getByText(
        "Prioritize the largest benchmark-relative effects before opening detailed breakdown."
      )
    ).toBeInTheDocument();
    expect(screen.getByText("Relative Segment Panel")).toBeInTheDocument();
    expect(screen.getByText("Total Effect Ranking")).toBeInTheDocument();
    expect(document.querySelector(".workbench-ranked-bar-list")).toBeTruthy();
    expect(screen.getByRole("tab", { name: "Relative context" })).toHaveAttribute(
      "aria-selected",
      "true"
    );
    expect(screen.getByRole("tab", { name: "Effect breakdown" })).toHaveAttribute(
      "aria-selected",
      "false"
    );
    expect(screen.getAllByText(/Global Balanced 60\/40/).length).toBeGreaterThanOrEqual(1);
    expect(screen.queryByLabelText("Asset Class attribution table")).not.toBeInTheDocument();
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
    const reconciliationNote = screen.getByRole("note");
    expect(reconciliationNote).toHaveTextContent("Residual remains after effects");
    expect(reconciliationNote).toHaveTextContent(
      "Active return 0.52% • effects sum 0.50% • residual 0.02%"
    );
    expect(screen.getByRole("group", { name: "Attribution detail context" })).toBeInTheDocument();
    expect(screen.getByLabelText("Attribution summary strip")).toBeInTheDocument();
    expect(screen.queryByText("Summary-only attribution")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Asset Class attribution totals")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("tab", { name: "Effect breakdown" }));
    expect(screen.getByText("Summary-only attribution")).toBeInTheDocument();
    expect(
      screen.getByText(
        "Segment rows are unavailable for this selection. Total benchmark-relative effects remain available below."
      )
    ).toBeInTheDocument();
    expect(screen.getByLabelText("Asset Class attribution totals")).toBeInTheDocument();
    expect(screen.getByText("Summary totals")).toBeInTheDocument();
    expect(screen.queryByLabelText("Asset Class attribution table")).not.toBeInTheDocument();
    expect(screen.getByRole("combobox")).toHaveAttribute("aria-disabled", "true");
    expect(screen.queryByText("Relative Segment Panel")).not.toBeInTheDocument();
    expect(screen.getByText("Total Effect Ranking")).toBeInTheDocument();
    const insightPane = screen.getByLabelText("Attribution ranked insight panel");
    expect(within(insightPane).queryByText("Relative Segment Panel")).not.toBeInTheDocument();
    expect(
      document.querySelector(".performance-analysis-state-panel-partial .module-state-panel")
    ).toBeTruthy();
  });

  it("shows only one attribution detail surface at a time and switches to the effect breakdown grid", () => {
    render(<PerformanceAnalysisAttributionSection {...buildProps()} />);

    expect(screen.getByText("Relative Segment Panel")).toBeInTheDocument();
    expect(screen.queryByLabelText("Asset Class attribution table")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("tab", { name: "Effect breakdown" }));

    expect(screen.getByRole("tab", { name: "Effect breakdown" })).toHaveAttribute(
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
