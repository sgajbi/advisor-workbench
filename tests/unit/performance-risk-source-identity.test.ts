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
  });

  it.each([
    [
      "underwater series",
      { includeUnderwaterSeries: true },
      { analysis_context: { include_underwater_series: true } },
      { analysis_context: { include_underwater_series: false } },
    ],
    [
      "rolling series",
      { includeTimeSeries: true },
      { request_context: { include_time_series: true } },
      { request_context: { include_time_series: false } },
    ],
  ])(
    "requires the source to confirm requested %s detail",
    (_label, detailIdentity, matchingPayload, stalePayload) => {
      expect(
        isPerformanceRiskSourceCurrent(
          { ...SOURCE, payload: matchingPayload },
          { ...IDENTITY, ...detailIdentity },
        ),
      ).toBe(true);
      expect(
        isPerformanceRiskSourceCurrent(
          { ...SOURCE, payload: stalePayload },
          { ...IDENTITY, ...detailIdentity },
        ),
      ).toBe(false);
    },
  );

  it("fails closed before a stale response can be cached or rendered", () => {
    expect(() =>
      requireCurrentPerformanceRiskSource(
        { ...SOURCE, as_of_date: "2026-02-23" },
        IDENTITY,
      ),
    ).toThrow(/does not confirm the requested source identity/i);
  });
});
