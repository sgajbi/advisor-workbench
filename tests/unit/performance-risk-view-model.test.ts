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
    expect(viewModel.title).toBe("Stateful Risk");
    expect(viewModel.snapshotMetrics.map((metric) => metric.label)).toEqual([
      "Volatility",
      "Sharpe",
      "Sortino",
      "Beta",
      "Tracking Error",
      "Information Ratio",
      "Value at Risk",
    ]);
    expect(viewModel.concentrationIndicators.map((metric) => metric.label)).toEqual([
      "Portfolio Concentration Index",
      "Issuer Concentration Index",
      "Largest Position Weight",
      "Largest Issuer Weight",
      "Top 10 Weight",
    ]);
    expect(viewModel.concentrationExecutiveSummary).toMatchObject({
      heading: "Business reading",
      postureLabel: "Partial Coverage",
    });
    expect(viewModel.concentrationDriverAnalysis[0]).toMatchObject({
      title: "Largest current exposures",
    });
    expect(viewModel.concentrationScales[0]).toMatchObject({
      label: "Portfolio Concentration Index",
      interpretationBand: "Moderate",
    });
    expect(viewModel.concentrationContextRows[0]).toMatchObject({
      label: "Issuer Coverage",
    });
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
    expect(viewModel.concentrationDiagnosticRows[0]).toMatchObject({
      measure: "Portfolio Concentration Index",
      currentReading: "1,260",
    });
    expect(viewModel.drawdownHeadlineMetrics.map((metric) => metric.label)).toEqual([
      "Max Drawdown",
      "Time Under Water",
      "Ulcer Index",
      "DaR 95",
      "CDaR 95",
    ]);
    expect(viewModel.drawdownEpisodes[0]).toMatchObject({
      episode: "DD_0001",
      depth: "-12.45%",
      status: "Open",
    });
    expect(viewModel.rollingWindows[0]).toMatchObject({
      label: "21D",
    });
    expect(viewModel.rollingWindows[0]?.headlineMetrics.map((metric) => metric.label)).toContain(
      "Volatility"
    );
    expect(viewModel.attributionControls?.selectedAttributionType).toBe("TOTAL_RISK");
    expect(viewModel.attributionRows[0]).toMatchObject({
      group: "Technology",
    });
    expect(viewModel.rollingQualityFlags).toContain(
      "metric:ROLLING_BETA:benchmark_variance_zero"
    );
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
    expect(viewModel.snapshotMetrics).toEqual([]);
    expect(viewModel.concentrationIndicators).toEqual([]);
    expect(viewModel.concentrationExecutiveSummary).toBeNull();
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
    expect(viewModel.attributionTotals).toBeNull();
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
