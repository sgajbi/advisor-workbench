import { describe, expect, it } from "vitest";

import {
  isPerformanceRiskSourceCurrent,
  requireCurrentPerformanceRiskSource,
} from "@/apps/performance/performance-risk-source-identity";

const IDENTITY = {
  portfolioId: "PF_1001",
  period: "YTD",
  asOfDate: "2026-02-24",
  benchmark: "BMK_GLOBAL_BALANCED_60_40",
} as const;

const SOURCE = {
  portfolio_id: "PF_1001",
  period: "YTD",
  as_of_date: "2026-02-24",
  benchmark_code: "BMK_GLOBAL_BALANCED_60_40",
  payload: {
    periods: [
      { start_date: "2026-01-01", end_date: "2026-02-24" },
    ],
  },
} as const;

describe("performance risk source identity", () => {
  it("admits evidence only when portfolio, period, date, and requested benchmark match", () => {
    expect(isPerformanceRiskSourceCurrent(SOURCE, IDENTITY)).toBe(true);
  });

  it.each([
    ["portfolio", { portfolio_id: "PF_FOREIGN" }],
    ["period", { period: "1Y" }],
    ["as-of date", { as_of_date: "2026-02-23" }],
    ["benchmark", { benchmark_code: "BMK_OTHER" }],
  ])("rejects %s drift", (_field, patch) => {
    expect(
      isPerformanceRiskSourceCurrent({ ...SOURCE, ...patch }, IDENTITY),
    ).toBe(false);
  });

  it("requires benchmark absence when the review has none assigned", () => {
    expect(
      isPerformanceRiskSourceCurrent(
        { ...SOURCE, benchmark_code: null },
        { ...IDENTITY, benchmark: null },
      ),
    ).toBe(true);
    expect(
      isPerformanceRiskSourceCurrent(SOURCE, { ...IDENTITY, benchmark: null }),
    ).toBe(false);
  });

  it("requires every explicit result to confirm the requested window", () => {
    const identity = {
      ...IDENTITY,
      period: "EXPLICIT",
      reportStartDate: "2025-02-25",
      reportEndDate: "2026-02-24",
    };
    const source = {
      ...SOURCE,
      period: "EXPLICIT",
      payload: {
        periods: [
          {
            start_date: "2025-02-25",
            end_date: "2026-02-24",
          },
        ],
      },
    };

    expect(isPerformanceRiskSourceCurrent(source, identity)).toBe(true);
    expect(
      isPerformanceRiskSourceCurrent(
        {
          ...source,
          payload: {
            periods: [
              {
                start_date: "2025-03-01",
                end_date: "2026-02-24",
              },
            ],
          },
        },
        identity,
      ),
    ).toBe(false);
  });

  it("admits point-in-time concentration for an explicit review using execution context", () => {
    const identity = {
      ...IDENTITY,
      period: "EXPLICIT",
      reportStartDate: "2025-02-25",
      reportEndDate: "2026-02-24",
      windowEvidence: "point_in_time" as const,
    };
    const source = {
      ...SOURCE,
      period: "EXPLICIT",
      payload: {
        execution_context: {
          as_of_date: IDENTITY.asOfDate,
          portfolio_id: IDENTITY.portfolioId,
        },
      },
    };

    expect(isPerformanceRiskSourceCurrent(source, identity)).toBe(true);
    expect(
      isPerformanceRiskSourceCurrent(
        {
          ...source,
          payload: {
            execution_context: {
              as_of_date: "2026-02-23",
              portfolio_id: IDENTITY.portfolioId,
            },
          },
        },
        identity,
      ),
    ).toBe(false);
  });

  it("requires every preset result to end on the admitted valuation date", () => {
    const source = {
      ...SOURCE,
      payload: {
        periods: [
          { start_date: "2026-01-01", end_date: "2026-02-24" },
          { start_date: "2026-02-01", end_date: "2026-02-24" },
        ],
      },
    };

    expect(isPerformanceRiskSourceCurrent(source, IDENTITY)).toBe(true);
    expect(
      isPerformanceRiskSourceCurrent(
        {
          ...source,
          payload: {
            periods: [
              { start_date: "2026-01-01", end_date: "2026-03-27" },
            ],
          },
        },
        IDENTITY,
      ),
    ).toBe(false);
  });

  it.each([
    ["missing", undefined],
    ["empty", { periods: [] }],
    ["malformed", { periods: [{ start_date: "2026-01-01" }] }],
  ])("rejects a ready preset payload with %s period evidence", (_label, payload) => {
    expect(
      isPerformanceRiskSourceCurrent(
        { ...SOURCE, payload },
        IDENTITY,
      ),
    ).toBe(false);
  });

  it.each([
    [
      "drawdown",
      {
        underwater_series: [
          { date: "2025-12-31", drawdown: -0.02 },
          { date: "2026-02-24", drawdown: -0.01 },
        ],
      },
    ],
    [
      "rolling",
      {
        window_results: [
          {
            window_length: 21,
            metric_series: [
              { date: "2026-01-01", metric_values: { volatility: 0.08 } },
              { date: "2026-02-25", metric_values: { volatility: 0.09 } },
            ],
          },
        ],
      },
    ],
  ])("rejects %s observations outside their enclosing source period", (_label, detail) => {
    expect(
      isPerformanceRiskSourceCurrent(
        {
          ...SOURCE,
          payload: {
            periods: [
              {
                start_date: "2026-01-01",
                end_date: "2026-02-24",
                ...detail,
              },
            ],
          },
        },
        IDENTITY,
      ),
    ).toBe(false);
  });

  it("admits nested Risk observations bounded by their source period", () => {
    expect(
      isPerformanceRiskSourceCurrent(
        {
          ...SOURCE,
          payload: {
            periods: [
              {
                start_date: "2026-01-01",
                end_date: "2026-02-24",
                underwater_series: [
                  { date: "2026-01-01", drawdown: 0 },
                  { date: "2026-02-24", drawdown: -0.01 },
                ],
                window_results: [
                  {
                    window_length: 21,
                    metric_series: [
                      { date: "2026-01-21", metric_values: { volatility: 0.08 } },
                    ],
                  },
                ],
              },
            ],
          },
        },
        IDENTITY,
      ),
    ).toBe(true);
  });

  it.each([
    [
      "summary event outside the period",
      {
        summary: {
          max_drawdown_peak_date: "2025-12-31",
          max_drawdown_trough_date: "2026-01-15",
        },
      },
    ],
    [
      "episode with reversed event order",
      {
        episodes: [
          {
            peak_date: "2026-02-10",
            trough_date: "2026-02-01",
            recovery_date: "2026-02-20",
          },
        ],
      },
    ],
    [
      "relative recovery before its trough",
      {
        relative_to_benchmark: {
          max_drawdown_peak_date: "2026-01-10",
          max_drawdown_trough_date: "2026-02-10",
          max_drawdown_recovery_date: "2026-02-01",
        },
      },
    ],
  ])("rejects a drawdown %s", (_label, drawdownEvidence) => {
    expect(
      isPerformanceRiskSourceCurrent(
        {
          ...SOURCE,
          payload: {
            periods: [
              {
                start_date: "2026-01-01",
                end_date: "2026-02-24",
                ...drawdownEvidence,
              },
            ],
          },
        },
        IDENTITY,
      ),
    ).toBe(false);
  });

  it("binds attribution controls and every returned set to the requested decomposition", () => {
    const identity = {
      ...IDENTITY,
      attributionType: "ACTIVE_RISK",
      groupingDimension: "ASSET_CLASS",
    };
    const source = {
      ...SOURCE,
      payload: {
        controls: {
          selected_attribution_type: "ACTIVE_RISK",
          selected_grouping_dimension: "ASSET_CLASS",
        },
        periods: [
          {
            start_date: "2026-01-01",
            end_date: "2026-02-24",
            attribution_sets: [
              {
                attribution_type: "ACTIVE_RISK",
                grouping_dimension: "ASSET_CLASS",
              },
            ],
          },
        ],
      },
    };

    expect(isPerformanceRiskSourceCurrent(source, identity)).toBe(true);
    expect(
      isPerformanceRiskSourceCurrent(
        {
          ...source,
          payload: {
            ...source.payload,
            controls: {
              selected_attribution_type: "TOTAL_RISK",
              selected_grouping_dimension: "SECTOR",
            },
          },
        },
        identity,
      ),
    ).toBe(false);
    expect(
      isPerformanceRiskSourceCurrent(
        {
          ...source,
          payload: {
            ...source.payload,
            periods: [
              {
                start_date: "2026-01-01",
                end_date: "2026-02-24",
                attribution_sets: [
                  {
                    attribution_type: "TOTAL_RISK",
                    grouping_dimension: "SECTOR",
                  },
                ],
              },
            ],
          },
        },
        identity,
      ),
    ).toBe(false);
    expect(
      isPerformanceRiskSourceCurrent(
        {
          ...source,
          payload: {
            ...source.payload,
            periods: source.payload.periods.map((period) => ({
              ...period,
              attribution_sets: [],
            })),
          },
        },
        identity,
      ),
    ).toBe(false);
  });

  it.each([
    [
      "underwater series",
      { includeUnderwaterSeries: true },
      { analysis_context: { include_underwater_series: true } },
      { analysis_context: { include_underwater_series: false } },
    ],
    [
      "underwater-series exclusion",
      { includeUnderwaterSeries: false },
      { analysis_context: { include_underwater_series: false } },
      { analysis_context: { include_underwater_series: true } },
    ],
    [
      "rolling series",
      { includeTimeSeries: true },
      { request_context: { include_time_series: true } },
      { request_context: { include_time_series: false } },
    ],
    [
      "rolling-series exclusion",
      { includeTimeSeries: false },
      { request_context: { include_time_series: false } },
      { request_context: { include_time_series: true } },
    ],
  ])(
    "requires the source to confirm requested %s detail",
    (_label, detailIdentity, matchingPayload, stalePayload) => {
      expect(
        isPerformanceRiskSourceCurrent(
          {
            ...SOURCE,
            payload: { ...SOURCE.payload, ...matchingPayload },
          },
          { ...IDENTITY, ...detailIdentity },
        ),
      ).toBe(true);
      expect(
        isPerformanceRiskSourceCurrent(
          {
            ...SOURCE,
            payload: { ...SOURCE.payload, ...stalePayload },
          },
          { ...IDENTITY, ...detailIdentity },
        ),
      ).toBe(false);
    },
  );

  it("preserves source-declared failure evidence without analytical payloads", () => {
    const sourceUnavailable = {
      ...SOURCE,
      state: "unavailable",
      payload: null,
      correlation_id: "corr-source-unavailable",
    };

    expect(
      requireCurrentPerformanceRiskSource(sourceUnavailable, {
        ...IDENTITY,
        includeUnderwaterSeries: true,
      }),
    ).toBe(sourceUnavailable);
    expect(
      requireCurrentPerformanceRiskSource(
        { ...sourceUnavailable, period: "EXPLICIT" },
        {
          ...IDENTITY,
          period: "EXPLICIT",
          reportStartDate: "2026-01-01",
          reportEndDate: "2026-02-24",
          attributionType: "ACTIVE_RISK",
          groupingDimension: "ASSET_CLASS",
          includeUnderwaterSeries: true,
        },
      ),
    ).toMatchObject({ correlation_id: "corr-source-unavailable" });
    expect(
      isPerformanceRiskSourceCurrent(
        { ...sourceUnavailable, state: "ready" },
        { ...IDENTITY, includeUnderwaterSeries: true },
      ),
    ).toBe(false);
    expect(
      isPerformanceRiskSourceCurrent(
        { ...SOURCE, state: "blocked", payload: { periods: [] } },
        IDENTITY,
      ),
    ).toBe(true);
  });

  it("fails closed before a stale response can be cached or rendered", () => {
    expect(() =>
      requireCurrentPerformanceRiskSource(
        { ...SOURCE, as_of_date: "2026-02-23" },
        IDENTITY,
      ),
    ).toThrow(/does not confirm the requested source identity/i);
  });
});
