import { describe, expect, it } from "vitest";

import {
  getPerformanceContributorsPresentation,
  getPerformanceHorizonPresentation,
  getPerformanceSummaryDriverModuleFrame,
} from "../../src/apps/performance/components/performance-summary-driver-helpers";
import type { PerformanceSummaryContributorsSectionProps } from "../../src/apps/performance/components/performance-workspace-types";
import {
  buildAggregateContributionPerformanceScenario,
  buildPartialBenchmarkPerformanceScenario,
  buildSupportedPerformanceScenario,
} from "../fixtures/performance-workspace-fixtures";

function buildContributorProps(
  overrides: Partial<PerformanceSummaryContributorsSectionProps> = {}
): PerformanceSummaryContributorsSectionProps {
  const scenario = buildSupportedPerformanceScenario();
  const workspace = scenario.workspace;
  return {
    workspace,
    capabilities: scenario.capabilities,
    contributorScale: 1.5,
    positivePositionContributors: [
      {
        position_id: "AAPL",
        contribution_pct: 1.5,
        weight_avg_pct: 24,
        total_return_pct: 8,
        local_contribution_pct: 1.1,
        fx_contribution_pct: 0.4,
      },
    ],
    negativePositionContributors: [
      {
        position_id: "TLT",
        contribution_pct: -0.2,
        weight_avg_pct: 8,
        total_return_pct: -2,
        local_contribution_pct: -0.2,
        fx_contribution_pct: 0,
      },
    ],
    topContributors: [
      {
        key_label: "Equity",
        contribution_pct: 3.8,
        weight_avg_pct: 61,
        total_return_pct: 7.4,
        local_contribution_pct: 3.4,
        fx_contribution_pct: 0.4,
        is_other: false,
      },
    ],
    bottomContributors: [
      {
        key_label: "Rates",
        contribution_pct: -0.6,
        weight_avg_pct: 18,
        total_return_pct: -1.9,
        local_contribution_pct: -0.5,
        fx_contribution_pct: -0.1,
        is_other: false,
      },
    ],
    isDetailsPending: false,
    ...overrides,
  };
}

describe("performance summary driver helpers", () => {
  it("builds supported contributor tables for summary mode", () => {
    const presentation = getPerformanceContributorsPresentation(buildContributorProps());

    expect(presentation.mode).toBe("supported");
    if (presentation.mode !== "supported") {
      throw new Error("expected supported presentation");
    }
    expect(presentation.frame).toMatchObject({
      title: "Performance Drivers",
      subtitle: "YTD Contribution Ranking",
    });
    expect(presentation.rankedTableModel.columns.map((column) => column.label)).toEqual([
      "Direction",
      "Instrument",
      "Contribution",
      "Weight",
      "Return",
    ]);
    expect(presentation.rankedTableModel.rows[0]).toMatchObject({
      cells: ["Contributor", "AAPL", "1.50%", "24.00%", "8.00%"],
    });
    expect(presentation.rankedTableModel.rows[1]).toMatchObject({
      cells: ["Detractor", "TLT", "-0.20%", "8.00%", "-2.00%"],
    });
    expect(presentation.tableModel.columns[0]?.label).toBe("Position");
    expect(presentation.tableModel.rows[0]?.cells[0]).toBe("AAPL");
  });

  it("keeps supported ranked contributor cards position-only", () => {
    const presentation = getPerformanceContributorsPresentation(
      buildContributorProps({
        positivePositionContributors: [],
        negativePositionContributors: [],
      })
    );

    expect(presentation.mode).toBe("supported");
    if (presentation.mode !== "supported") {
      throw new Error("expected supported presentation");
    }
    expect(presentation.rankedTableModel.rows[0]?.cells[1]).toBe("AAPL");
    expect(presentation.rankedTableModel.columns.map((column) => column.label)).toEqual([
      "Direction",
      "Instrument",
      "Contribution",
      "Weight",
      "Return",
    ]);
    expect(presentation.tableModel.columns[0]?.label).toBe("Position");
    expect(presentation.tableModel.rows[0]?.cells[0]).toBe("AAPL");
  });

  it("enforces contributor sign rules for the side-by-side tables", () => {
    const presentation = getPerformanceContributorsPresentation(
      buildContributorProps({
        positivePositionContributors: [
          {
            position_id: "CASH",
            contribution_pct: 0,
            weight_avg_pct: 2,
            total_return_pct: 0,
            local_contribution_pct: 0,
            fx_contribution_pct: 0,
          },
          {
            position_id: "MISCLASSIFIED_NEG",
            contribution_pct: -0.05,
            weight_avg_pct: 1,
            total_return_pct: -0.2,
            local_contribution_pct: -0.05,
            fx_contribution_pct: 0,
          },
        ],
        negativePositionContributors: [
          {
            position_id: "REAL_NEG",
            contribution_pct: -0.15,
            weight_avg_pct: 3,
            total_return_pct: -1.1,
            local_contribution_pct: -0.15,
            fx_contribution_pct: 0,
          },
          {
            position_id: "MISCLASSIFIED_POS",
            contribution_pct: 0.12,
            weight_avg_pct: 4,
            total_return_pct: 0.9,
            local_contribution_pct: 0.12,
            fx_contribution_pct: 0,
          },
        ],
      })
    );

    expect(presentation.mode).toBe("supported");
    if (presentation.mode !== "supported") {
      throw new Error("expected supported presentation");
    }

    expect(
      presentation.rankedTableModel.rows
        .filter((row) => row.cells[0] === "Contributor")
        .map((row) => row.cells[1])
    ).toEqual(["CASH"]);
    expect(
      presentation.rankedTableModel.rows
        .filter((row) => row.cells[0] === "Detractor")
        .map((row) => row.cells[1])
    ).toEqual(["REAL NEG"]);
  });

  it("builds a loading contributor presentation while detailed support is pending", () => {
    const scenario = buildAggregateContributionPerformanceScenario();

    const presentation = getPerformanceContributorsPresentation(
      buildContributorProps({
        workspace: scenario.workspace,
        capabilities: scenario.capabilities,
        isDetailsPending: true,
        positivePositionContributors: [],
        negativePositionContributors: [],
      })
    );

    expect(presentation).toMatchObject({
      mode: "loading",
      body: "Loading contribution ranking.",
    });
  });

  it("builds a partial contributor presentation with aggregate rows when position ranking is unavailable", () => {
    const scenario = buildAggregateContributionPerformanceScenario();

    const presentation = getPerformanceContributorsPresentation(
      buildContributorProps({
        workspace: scenario.workspace,
        capabilities: scenario.capabilities,
        positivePositionContributors: [],
        negativePositionContributors: [],
        topContributors: scenario.workspace.contribution?.levels?.[0]?.rows ?? [],
        bottomContributors: [],
      })
    );

    expect(presentation).toMatchObject({
      mode: "partial",
      noticeTitle: "Contributor ranking is partial",
      noticeBody: "Contribution exists, but only aggregate rows are available.",
      hint: "Aggregate contribution remains available even when position-level ranking is absent.",
    });
    if (presentation.mode !== "partial") {
      throw new Error("expected partial contributor presentation");
    }
    expect(presentation.tableModel.rows[0]?.cells[0]).toBe("Equity");
  });

  it("builds a shared summary-module frame for horizon and contributor driver cards", () => {
    expect(
      getPerformanceSummaryDriverModuleFrame({
        kind: "contributors",
        period: "YTD",
      })
    ).toMatchObject({
      title: "Performance Drivers",
      subtitle: "YTD Contribution Ranking",
    });

    expect(
      getPerformanceSummaryDriverModuleFrame({
        kind: "horizons",
      })
    ).toMatchObject({
      title: "Horizon Comparison",
      subtitle: "",
    });
  });

  it("builds honest horizon context labels for supported and unavailable active return states", () => {
    const supportedScenario = buildSupportedPerformanceScenario();
    const partialScenario = buildPartialBenchmarkPerformanceScenario();

    expect(
      getPerformanceHorizonPresentation({
        benchmark: supportedScenario.workspace.benchmark_code ?? undefined,
        benchmarkOptions: supportedScenario.workspace.benchmark_options ?? [],
        detailBasis: "NET",
        period: supportedScenario.workspace.period,
        selectedPeriodRow: {
          period: supportedScenario.workspace.period,
          portfolio_return_pct: supportedScenario.selectedPerformance.portfolio_return_pct,
          benchmark_return_pct: supportedScenario.selectedPerformance.benchmark_return_pct,
          active_return_pct: supportedScenario.selectedPerformance.active_return_pct,
          annualized_return_pct: supportedScenario.selectedPerformance.annualized_return_pct,
        },
      })
    ).toMatchObject({
      frame: {
        title: "Horizon Comparison",
        subtitle: "",
      },
      selectedPeriodLabel: supportedScenario.workspace.period,
      activeReturnLabel: "0.52%",
      benchmarkLabel: "Global Balanced 60/40",
      benchmarkLegendLabel: "Global Balanced 60/40",
      loadingBody: "Loading horizon comparison.",
      emptyBody: "Horizon comparison is unavailable for this mandate.",
    });

    expect(
      getPerformanceHorizonPresentation({
        benchmark: partialScenario.workspace.benchmark_code ?? undefined,
        benchmarkOptions: partialScenario.workspace.benchmark_options ?? [],
        detailBasis: "NET",
        period: partialScenario.workspace.period,
        selectedPeriodRow: {
          period: partialScenario.workspace.period,
          portfolio_return_pct: partialScenario.selectedPerformance.portfolio_return_pct,
          benchmark_return_pct: partialScenario.selectedPerformance.benchmark_return_pct,
          active_return_pct: partialScenario.selectedPerformance.active_return_pct,
          annualized_return_pct: partialScenario.selectedPerformance.annualized_return_pct,
        },
      })
    ).toMatchObject({
      frame: {
        title: "Horizon Comparison",
        subtitle: "",
      },
      selectedPeriodLabel: partialScenario.workspace.period,
      activeReturnLabel: "Unavailable",
      benchmarkLabel: "Global Balanced 60/40",
    });
  });
});
