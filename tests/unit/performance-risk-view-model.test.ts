import { describe, expect, it } from "vitest";

import { buildPerformanceRiskViewModel } from "../../src/apps/performance/risk-workspace-view-model";
import { buildBenchmarkUnassignedPerformanceScenario, buildSupportedPerformanceScenario } from "../fixtures/performance-workspace-fixtures";

describe("buildPerformanceRiskViewModel", () => {
  it("builds a stateful contract-shaped risk view model with supportability evidence", () => {
    const scenario = buildSupportedPerformanceScenario();

    const viewModel = buildPerformanceRiskViewModel({
      workspace: scenario.workspace,
      period: "YTD",
      detailBasis: "NET",
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
      "portfolio_returns",
      "benchmark_returns",
      "risk_free_series",
      "portfolio_positions",
      "issuer_enrichment",
    ]);
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
    });

    expect(viewModel.state).toBe("partial");
    expect(
      viewModel.supportability.find((item) => item.key === "benchmark_returns")
    ).toMatchObject({
      state: "unavailable",
      reason: "Benchmark-relative risk requires benchmark context.",
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
});
