import {
  assertPerformanceCalculationSanity,
  assertRiskCalculationSanity,
} from "../../scripts/live/validation/calculation-sanity.mjs";

function createSummary() {
  return {
    calculationChecks: [],
    panelClassifications: [],
  };
}

function createClassifier(summary: ReturnType<typeof createSummary>) {
  return (panel: string, state: string, owner: string, evidence: Record<string, unknown>) => {
    summary.panelClassifications.push({ panel, state, owner, ...evidence });
  };
}

describe("live validation calculation sanity helpers", () => {
  it("accepts reconciled performance payloads and records governed panel classifications", () => {
    const summary = createSummary();

    assertPerformanceCalculationSanity({
      summary,
      recordPanelClassification: createClassifier(summary),
      performanceSummary: {
        net_performance: {
          portfolio_return_pct: 9.33,
          benchmark_return_pct: 6.52,
          active_return_pct: 2.81,
        },
        overview: {
          market_value_base: 1_500_000,
          cash_weight_pct: 12.4,
          position_count: 18,
        },
        capabilities: {
          evidence: {
            state: "unavailable",
            reason: "gateway contract pending",
          },
        },
      },
      performanceDetails: {
        net_chart: [{}, {}, {}, {}],
        contribution: {
          levels: [
            {
              rows: [{}, {}, {}, {}],
              total_contribution_pct: 9.33,
            },
          ],
        },
        capabilities: {
          attribution_detail: {
            state: "partial",
            fallback_available: true,
          },
        },
        attribution: {
          levels: [
            {
              rows: [],
            },
          ],
        },
      },
    });

    expect(summary.calculationChecks).toHaveLength(1);
    expect(summary.panelClassifications).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ panel: "performance.summary", state: "ready" }),
        expect.objectContaining({
          panel: "performance.analysis.attribution",
          state: "partial",
        }),
        expect.objectContaining({ panel: "performance.evidence", state: "unavailable" }),
      ])
    );
  });

  it("fails performance attribution when governed fallback is missing", () => {
    const summary = createSummary();

    expect(() =>
      assertPerformanceCalculationSanity({
        summary,
        recordPanelClassification: createClassifier(summary),
        performanceSummary: {
          net_performance: {
            portfolio_return_pct: 9.33,
            benchmark_return_pct: 6.52,
            active_return_pct: 2.81,
          },
          overview: {
            market_value_base: 1_500_000,
            cash_weight_pct: 12.4,
            position_count: 18,
          },
        },
        performanceDetails: {
          net_chart: [{}, {}, {}, {}],
          contribution: {
            levels: [
              {
                rows: [{}, {}, {}, {}],
                total_contribution_pct: 9.33,
              },
            ],
          },
          capabilities: {
            attribution_detail: {
              state: "partial",
              fallback_available: false,
            },
          },
          attribution: {
            levels: [{ rows: [] }],
          },
        },
      })
    ).toThrow("Attribution detail is partial without a governed fallback.");
  });

  it("accepts ready risk payloads and records all risk panel classifications", () => {
    const summary = createSummary();

    assertRiskCalculationSanity({
      summary,
      recordPanelClassification: createClassifier(summary),
      riskSummary: {
        payload: {
          periods: [
            {
              metrics: Array.from({ length: 6 }, () => ({ state: "ready" })),
              portfolio_observation_count: 120,
              aligned_benchmark_observation_count: 120,
              benchmark_context: { aligned: true },
            },
          ],
        },
      },
      concentration: {
        payload: {
          portfolio_concentration: { hhi_current: 1356 },
          issuer_concentration: { coverage_ratio_current: 0.99 },
          single_position_concentration: { top_n_cumulative_weight_current: 0.992 },
        },
      },
      drawdown: {
        payload: {
          periods: [
            {
              portfolio_observation_count: 120,
              relative_to_benchmark: { time_under_water_days: 81 },
              underwater_series: Array.from({ length: 60 }, () => ({})),
            },
          ],
        },
      },
      rolling: {
        payload: {
          periods: [
            {
              window_count_emitted: 4,
              window_results: [
                { window_length: 21, metric_summaries: { ROLLING_VOLATILITY: { latest: 0.02 } } },
                { window_length: 63, metric_summaries: { ROLLING_VOLATILITY: { latest: 0.04 } } },
                { window_length: 126, metric_summaries: { ROLLING_VOLATILITY: {} } },
                { window_length: 252, metric_summaries: { ROLLING_VOLATILITY: {} } },
              ],
            },
          ],
        },
      },
      attribution: {
        payload: {
          periods: [
            {
              attribution_sets: [
                {
                  contributors: [{}, {}, {}, {}, {}],
                  residual: 0,
                },
              ],
            },
          ],
        },
      },
    });

    expect(summary.calculationChecks).toHaveLength(1);
    expect(summary.panelClassifications).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ panel: "performance.risk.snapshot", state: "ready" }),
        expect.objectContaining({ panel: "performance.risk.concentration", state: "ready" }),
        expect.objectContaining({ panel: "performance.risk.drawdown", state: "ready" }),
        expect.objectContaining({ panel: "performance.risk.rolling", state: "ready" }),
        expect.objectContaining({
          panel: "performance.risk.historical_attribution",
          state: "ready",
        }),
      ])
    );
  });

  it("fails risk attribution when the residual breaches the governed tolerance", () => {
    const summary = createSummary();

    expect(() =>
      assertRiskCalculationSanity({
        summary,
        recordPanelClassification: createClassifier(summary),
        riskSummary: {
          payload: {
            periods: [
              {
                metrics: Array.from({ length: 6 }, () => ({ state: "ready" })),
                portfolio_observation_count: 120,
                aligned_benchmark_observation_count: 120,
                benchmark_context: { aligned: true },
              },
            ],
          },
        },
        concentration: {
          payload: {
            portfolio_concentration: { hhi_current: 1356 },
            issuer_concentration: { coverage_ratio_current: 0.99 },
            single_position_concentration: { top_n_cumulative_weight_current: 0.992 },
          },
        },
        drawdown: {
          payload: {
            periods: [
              {
                portfolio_observation_count: 120,
                relative_to_benchmark: { time_under_water_days: 81 },
                underwater_series: Array.from({ length: 60 }, () => ({})),
              },
            ],
          },
        },
        rolling: {
          payload: {
            periods: [
              {
                window_count_emitted: 4,
                window_results: [
                  { window_length: 21, metric_summaries: { ROLLING_VOLATILITY: { latest: 0.02 } } },
                  { window_length: 63, metric_summaries: { ROLLING_VOLATILITY: { latest: 0.04 } } },
                  { window_length: 126, metric_summaries: { ROLLING_VOLATILITY: {} } },
                  { window_length: 252, metric_summaries: { ROLLING_VOLATILITY: {} } },
                ],
              },
            ],
          },
        },
        attribution: {
          payload: {
            periods: [
              {
                attribution_sets: [
                  {
                    contributors: [{}, {}, {}, {}, {}],
                    residual: 0.1,
                  },
                ],
              },
            ],
          },
        },
      })
    ).toThrow("Historical risk attribution residual is too high: 0.1.");
  });
});
