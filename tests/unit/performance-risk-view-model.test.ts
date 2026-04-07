import { describe, expect, it } from "vitest";

import {
  buildFixtureRiskConcentration,
  buildFixtureRiskDrawdown,
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
      riskDrawdown: buildFixtureRiskDrawdown(scenario.workspace, "YTD", "NET"),
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
    expect(viewModel.concentrationMetrics.map((metric) => metric.label)).toEqual([
      "HHI",
      "Top Position",
      "Top Issuer",
      "Issuer Coverage",
    ]);
    expect(viewModel.supportability.map((item) => item.key)).toEqual([
      "summary:portfolio_returns",
      "summary:benchmark_returns",
      "summary:risk_free_series",
      "concentration:portfolio_positions",
      "concentration:issuer_enrichment",
      "drawdown:portfolio_returns",
      "drawdown:benchmark_relative_drawdown",
      "drawdown:underwater_series",
    ]);
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
    expect(viewModel.provenance).toContainEqual({
      label: "Input Mode",
      value: "Stateful only",
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
      riskDrawdown: buildFixtureRiskDrawdown(scenario.workspace, "YTD", "NET", {
        includeBenchmarkRelative: false,
      }),
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
    expect(viewModel.concentrationMetrics).toEqual([]);
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
    });

    expect(viewModel.underwaterDetailState).toBe("ready");
    expect(viewModel.underwaterSeries).toHaveLength(3);
    expect(viewModel.underwaterSeries[0]).toMatchObject({
      date: "20 Jan 2026",
      drawdown: "-5.21%",
    });
  });
});
