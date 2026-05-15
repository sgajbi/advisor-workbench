import { describe, expect, it } from "vitest";

import {
  buildFixtureRiskAttribution,
  buildFixtureRiskConcentration,
  buildFixtureRiskDrawdown,
  buildFixtureRiskRolling,
  buildFixtureRiskSummary,
  buildPerformanceRiskViewModel,
} from "../../src/apps/performance/risk-workspace-view-model";
import { buildBenchmarkUnassignedPerformanceScenario, buildSupportedPerformanceScenario } from "../fixtures/performance-workspace-fixtures";

describe("buildPerformanceRiskViewModel", () => {
  it("builds a stateful contract-shaped risk view model with supportability evidence", () => {
    const scenario = buildSupportedPerformanceScenario();

    const viewModel = buildPerformanceRiskViewModel({
      workspace: scenario.workspace,
      period: "YTD",
      detailBasis: "NET",
      riskSummary: buildFixtureRiskSummary(scenario.workspace, "YTD", "NET"),
      riskConcentration: buildFixtureRiskConcentration(scenario.workspace, "YTD"),
      riskAttribution: buildFixtureRiskAttribution(scenario.workspace, "YTD", "NET"),
      riskDrawdown: buildFixtureRiskDrawdown(scenario.workspace, "YTD", "NET"),
      riskRolling: buildFixtureRiskRolling(scenario.workspace, "YTD", "NET"),
    });

    expect(viewModel.state).toBe("partial");
    expect(viewModel.title).toBe("Risk");
    expect(viewModel.workspaceOverview).toEqual([
      expect.objectContaining({ label: "Risk posture", value: "Contained" }),
      expect.objectContaining({ label: "Drawdown posture", value: "Underwater" }),
      expect.objectContaining({ label: "Concentration posture", value: "Partial" }),
      expect.objectContaining({ label: "Evidence posture", value: "Partial" }),
    ]);
    expect(viewModel.snapshotHeadlineMetrics.map((metric) => metric.label)).toEqual([
      "Volatility",
      "Sharpe",
      "Beta",
      "Tracking Error",
    ]);
    expect(viewModel.snapshotSupportingMetrics.map((metric) => metric.label)).toEqual([
      "Information Ratio",
      "Sortino",
      "Value at Risk",
    ]);
    expect(viewModel.snapshotContextRows[0]).toMatchObject({
      label: "Portfolio observations",
    });
    expect(viewModel.concentrationIndicators.map((metric) => metric.label)).toEqual([
      "Portfolio Concentration Index",
      "Issuer Concentration Index",
      "Largest Position Weight",
      "Largest Issuer Weight",
      "Top 10 Weight",
    ]);
    expect(viewModel.concentrationScales[0]).toMatchObject({
      label: "Portfolio Concentration Index",
      interpretationBand: "Moderate",
    });
    expect(viewModel.concentrationContextRows).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          label: "Top Position Methodology",
          value: "TOP_POSITION_WEIGHT",
          support:
            "Gateway and Workbench render returned top-position weights and drivers without recalculating them.",
        }),
        expect.objectContaining({
          label: "Top Position Driver",
          value: "PIMCO GIS Income Fund",
          support:
            "Current PIMCO GIS Income Fund 18.40%; proposed PIMCO GIS Income Fund 18.40%; source delta 0.00%.",
        }),
        expect.objectContaining({
          label: "Issuer Coverage",
        }),
      ])
    );
    expect(viewModel.supportability.map((item) => item.key)).toEqual([
      "summary:portfolio_returns",
      "summary:benchmark_returns",
      "summary:risk_free_series",
      "concentration:portfolio_positions",
      "concentration:issuer_enrichment",
      "concentration:issuer_grouping",
      "concentration:valuation_basis",
      "attribution:portfolio_returns",
      "attribution:exposure_history",
      "attribution:benchmark_exposure_context",
      "drawdown:portfolio_returns",
      "drawdown:benchmark_relative_drawdown",
      "drawdown:underwater_series",
      "rolling:portfolio_returns",
      "rolling:benchmark_returns",
      "rolling:risk_free_series",
      "rolling:rolling_time_series",
    ]);
    expect(viewModel.drawdownHeadlineMetrics.map((metric) => metric.label)).toEqual([
      "Max Drawdown",
      "Relative Max Drawdown",
      "Time Under Water",
      "Recovery Status",
    ]);
    expect(viewModel.drawdownSupportingMetrics.map((metric) => metric.label)).toEqual([
      "Ulcer Index",
    ]);
    expect(viewModel.drawdownEpisodeInterpretation).toBeNull();
    expect(viewModel.drawdownContextRows[0]).toMatchObject({
      label: "Portfolio observations",
    });
    expect(viewModel.drawdownEpisodes[0]).toMatchObject({
      episode: "DD_0001",
      depth: "-12.45%",
      status: "Open",
    });
    expect(viewModel.rollingWindows[0]).toMatchObject({
      label: "21D",
      horizonLabel: "Short window",
    });
    expect(viewModel.rollingContextRows[0]).toMatchObject({
      label: "Window set",
    });
    expect(
      viewModel.supportability.find((item) => item.key === "rolling:risk_free_series")
    ).toMatchObject({
      state: "partial",
      reason:
        "Rolling Sharpe is omitted or marked unavailable when the risk-free curve cannot be sourced.",
    });
    expect(viewModel.rollingContextRows).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          label: "Benchmark-relative review",
          value: "Qualified",
        }),
      ])
    );
    expect(viewModel.rollingWindows[0]?.headlineMetrics.map((metric) => metric.label)).toContain(
      "Volatility"
    );
    expect(viewModel.rollingWindows[0]?.headlineMetrics[0]).toMatchObject({
      label: "Volatility",
      support: "Above typical but still in range",
    });
    expect(viewModel.rollingWindows[0]?.selectedWindowSummary).toMatchObject({
      title: "21D selected-window review",
    });
    expect(viewModel.rollingWindows[0]?.selectedWindowSummary.body).toContain(
      "Current volatility is 11.32%, above the recent typical."
    );
    expect(viewModel.rollingWindows[0]?.detailRowInterpretations[0]).toMatchObject({
      metric: "Volatility",
      interpretation: "Current reading is above typical but still in range.",
    });
    expect(viewModel.attributionControls?.selectedAttributionType).toBe("TOTAL_RISK");
    expect(viewModel.attributionMethodologyRows[0]).toMatchObject({
      label: "Reconciled sum",
    });
    expect(viewModel.attributionRows[0]).toMatchObject({
      group: "Technology",
    });
  });

  it("does not imply benchmark-relative risk is ready when benchmark context is absent", () => {
    const scenario = buildBenchmarkUnassignedPerformanceScenario();

    const viewModel = buildPerformanceRiskViewModel({
      workspace: scenario.workspace,
      period: "YTD",
      detailBasis: "NET",
      riskSummary: buildFixtureRiskSummary(scenario.workspace, "YTD", "NET"),
      riskConcentration: buildFixtureRiskConcentration(scenario.workspace, "YTD"),
      riskAttribution: buildFixtureRiskAttribution(scenario.workspace, "YTD", "NET", {
        attributionType: "ACTIVE_RISK",
        groupingDimension: "SECTOR",
      }),
      riskDrawdown: buildFixtureRiskDrawdown(scenario.workspace, "YTD", "NET", {
        includeBenchmarkRelative: false,
      }),
      riskRolling: buildFixtureRiskRolling(scenario.workspace, "YTD", "NET"),
    });

    expect(viewModel.state).toBe("partial");
    expect(
      viewModel.supportability.find((item) => item.key === "summary:benchmark_returns")
    ).toMatchObject({
      state: "unavailable",
      reason: "Benchmark-relative risk requires benchmark context.",
    });
    expect(viewModel.drawdownRelativeMetric).toMatchObject({
      value: "N/A",
      support: "Benchmark-relative drawdown requires benchmark context.",
    });
    expect(viewModel.snapshotHeadlineMetrics.find((metric) => metric.key === "BETA")).toMatchObject({
      value: "N/A",
      support: "Benchmark-relative risk requires benchmark context.",
      state: "unavailable",
    });
    expect(viewModel.rollingContextRows).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          label: "Benchmark-relative review",
          value: "Qualified",
        }),
      ])
    );
    expect(viewModel.attributionControls?.attributionTypes[1]).toMatchObject({
      key: "ACTIVE_RISK",
      disabled: true,
    });
  });

  it("returns a loading state without fabricated metrics while details are pending", () => {
    const scenario = buildSupportedPerformanceScenario();

    const viewModel = buildPerformanceRiskViewModel({
      workspace: scenario.workspace,
      period: "YTD",
      detailBasis: "NET",
      isDetailsPending: true,
    });

    expect(viewModel.state).toBe("loading");
    expect(viewModel.workspaceOverview).toEqual([]);
    expect(viewModel.snapshotHeadlineMetrics).toEqual([]);
    expect(viewModel.snapshotSupportingMetrics).toEqual([]);
    expect(viewModel.concentrationIndicators).toEqual([]);
    expect(viewModel.rollingWindows).toEqual([]);
    expect(viewModel.supportability).toEqual([
      expect.objectContaining({ key: "risk_bff", state: "partial" }),
    ]);
  });

  it("only surfaces underwater series after detail-on-demand fetch returns", () => {
    const scenario = buildSupportedPerformanceScenario();

    const viewModel = buildPerformanceRiskViewModel({
      workspace: scenario.workspace,
      period: "YTD",
      detailBasis: "NET",
      riskSummary: buildFixtureRiskSummary(scenario.workspace, "YTD", "NET"),
      riskConcentration: buildFixtureRiskConcentration(scenario.workspace, "YTD"),
      riskDrawdown: buildFixtureRiskDrawdown(scenario.workspace, "YTD", "NET"),
      riskDrawdownDetail: buildFixtureRiskDrawdown(scenario.workspace, "YTD", "NET", {
        includeUnderwaterSeries: true,
      }),
      riskRolling: buildFixtureRiskRolling(scenario.workspace, "YTD", "NET"),
    });

    expect(viewModel.underwaterDetailState).toBe("ready");
    expect(viewModel.underwaterSeries).toHaveLength(3);
    expect(viewModel.underwaterSeries[0]).toMatchObject({
      date: "20 Jan 2026",
      drawdown: "-5.21%",
    });
  });

  it("only surfaces rolling series after detail-on-demand fetch returns", () => {
    const scenario = buildSupportedPerformanceScenario();

    const viewModel = buildPerformanceRiskViewModel({
      workspace: scenario.workspace,
      period: "YTD",
      detailBasis: "NET",
      riskSummary: buildFixtureRiskSummary(scenario.workspace, "YTD", "NET"),
      riskConcentration: buildFixtureRiskConcentration(scenario.workspace, "YTD"),
      riskAttribution: buildFixtureRiskAttribution(scenario.workspace, "YTD", "NET", {
        attributionType: "ACTIVE_RISK",
        groupingDimension: "ISSUER",
      }),
      riskDrawdown: buildFixtureRiskDrawdown(scenario.workspace, "YTD", "NET"),
      riskRolling: buildFixtureRiskRolling(scenario.workspace, "YTD", "NET"),
      riskRollingDetail: buildFixtureRiskRolling(scenario.workspace, "YTD", "NET", {
        includeTimeSeries: true,
      }),
    });

    expect(viewModel.rollingDetailState).toBe("ready");
    expect(viewModel.rollingWindows[0]?.seriesRows).toHaveLength(3);
    expect(viewModel.rollingWindows[0]?.seriesRows[0]).toMatchObject({
      date: "15 Mar 2026",
    });
    expect(viewModel.rollingWindows[0]?.seriesRows[0]?.values.ROLLING_VOLATILITY).toMatch(
      /%$/
    );
    expect(viewModel.attributionState).toBe("blocked");
  });

  it("normalizes attribution percentages when upstream returns already-scaled percentage values", () => {
    const scenario = buildSupportedPerformanceScenario();
    const attribution = buildFixtureRiskAttribution(scenario.workspace, "YTD", "NET");

    attribution.payload?.periods[0]?.attribution_sets[0]?.contributors.splice(0, 1, {
      ...(attribution.payload?.periods[0]?.attribution_sets[0]?.contributors[0] ?? {
        group_key: "cash",
        group_label: "Cash",
        weight_average: 0.0002,
        marginal_contribution: 83.5946,
        component_contribution: 0.0184,
        percent_contribution: 0.1956,
      }),
      marginal_contribution: 83.5946,
      component_contribution: 0.0184,
      percent_contribution: 0.1956,
    });

    const viewModel = buildPerformanceRiskViewModel({
      workspace: scenario.workspace,
      period: "YTD",
      detailBasis: "NET",
      riskSummary: buildFixtureRiskSummary(scenario.workspace, "YTD", "NET"),
      riskConcentration: buildFixtureRiskConcentration(scenario.workspace, "YTD"),
      riskAttribution: attribution,
      riskDrawdown: buildFixtureRiskDrawdown(scenario.workspace, "YTD", "NET"),
      riskRolling: buildFixtureRiskRolling(scenario.workspace, "YTD", "NET"),
    });

    expect(viewModel.attributionRows[0]).toMatchObject({
      marginalContribution: "83.59%",
      componentContribution: "1.84%",
      contributionShare: "19.56%",
    });
  });
});
