import { describe, expect, it } from "vitest";

import type {
  WorkbenchPerformanceWorkspaceDetails,
  WorkbenchPerformanceWorkspaceSummary,
} from "../../src/features/workbench/types";

import {
  doPerformanceSummaryAndDetailsShareReviewContext,
  isPerformanceAnalyticalSourceCurrent,
  isPerformanceDetailsSourceCurrent,
  isPerformanceSummarySourceCurrent,
} from "../../src/apps/performance/performance-source-identity";
import {
  buildPerformanceWorkspaceDetails,
  buildPerformanceWorkspaceSummary,
} from "../fixtures/performance-workspace-fixtures";

describe("performance source identity", () => {
  const identity = {
    portfolioId: "PF_1001",
    period: "YTD",
  };

  it("accepts summary and detail payloads that confirm supported request identity", () => {
    expect(
      isPerformanceSummarySourceCurrent(buildPerformanceWorkspaceSummary(), identity),
    ).toBe(true);
    expect(
      isPerformanceDetailsSourceCurrent(buildPerformanceWorkspaceDetails(), identity),
    ).toBe(true);
  });

  it("requires exact source bounds for an explicit request window", () => {
    const explicitIdentity = {
      portfolioId: "PF_1001",
      period: "EXPLICIT",
      reportStartDate: "2026-01-01",
      reportEndDate: "2026-02-24",
    };
    const summary = {
      ...buildPerformanceWorkspaceSummary(),
      period: "EXPLICIT",
      report_start_date: explicitIdentity.reportStartDate,
      report_end_date: explicitIdentity.reportEndDate,
    };
    const details = {
      ...buildPerformanceWorkspaceDetails(),
      period: "EXPLICIT",
      report_start_date: explicitIdentity.reportStartDate,
      report_end_date: explicitIdentity.reportEndDate,
    };

    expect(isPerformanceSummarySourceCurrent(summary, explicitIdentity)).toBe(true);
    expect(isPerformanceDetailsSourceCurrent(details, explicitIdentity)).toBe(true);
    expect(
      isPerformanceSummarySourceCurrent(
        { ...summary, report_start_date: "2025-12-01" },
        explicitIdentity,
      ),
    ).toBe(false);
    expect(
      isPerformanceDetailsSourceCurrent(
        { ...details, report_end_date: "2026-02-23" },
        explicitIdentity,
      ),
    ).toBe(false);
  });

  it("fails closed when an explicit identity omits either requested bound", () => {
    const summary = { ...buildPerformanceWorkspaceSummary(), period: "EXPLICIT" };
    const details = { ...buildPerformanceWorkspaceDetails(), period: "EXPLICIT" };

    expect(
      isPerformanceSummarySourceCurrent(summary, {
        portfolioId: "PF_1001",
        period: "EXPLICIT",
      }),
    ).toBe(false);
    expect(
      isPerformanceDetailsSourceCurrent(details, {
        portfolioId: "PF_1001",
        period: "EXPLICIT",
        reportStartDate: "2026-01-01",
      }),
    ).toBe(false);
  });

  it.each<[
    string,
    (summary: WorkbenchPerformanceWorkspaceSummary) => WorkbenchPerformanceWorkspaceSummary,
  ]>([
    ["top-level portfolio", (summary) => ({ ...summary, portfolio_id: "PF_OTHER" })],
    [
      "nested portfolio",
      (summary) => ({
        ...summary,
        portfolio: { ...summary.portfolio, portfolio_id: "PF_OTHER" },
      }),
    ],
    ["period", (summary) => ({ ...summary, period: "3Y" })],
  ])("rejects a summary with stale %s identity", (_name, buildStaleSummary) => {
    expect(
      isPerformanceSummarySourceCurrent(
        buildStaleSummary(buildPerformanceWorkspaceSummary()),
        identity,
      ),
    ).toBe(false);
  });

  it.each<[
    string,
    Partial<WorkbenchPerformanceWorkspaceDetails>,
  ]>([
    ["portfolio", { portfolio_id: "PF_OTHER" }],
    ["period", { period: "3Y" }],
  ])("rejects analytical detail with stale %s identity", (_name, overrides) => {
    expect(
      isPerformanceDetailsSourceCurrent(
        { ...buildPerformanceWorkspaceDetails(), ...overrides },
        identity,
      ),
    ).toBe(false);
  });

  it("requires the source to echo the requested valuation date and currency", () => {
    const summary = buildPerformanceWorkspaceSummary();
    const details = buildPerformanceWorkspaceDetails();
    const reviewIdentity = {
      ...identity,
      asOfDate: "2026-02-24",
      reportingCurrency: "USD",
    };

    expect(
      isPerformanceSummarySourceCurrent(
        {
          ...summary,
          requested_as_of_date: "2026-02-23",
        },
        reviewIdentity,
      ),
    ).toBe(false);
    expect(
      isPerformanceDetailsSourceCurrent(
        { ...details, requested_reporting_currency: "EUR" },
        reviewIdentity,
      ),
    ).toBe(false);
  });

  it.each([
    [
      "return-path window",
      (details: WorkbenchPerformanceWorkspaceDetails) => ({
        ...details,
        net_chart: details.net_chart.map((point, index) =>
          index === 0 ? { ...point, period_end: "2026-03-31" } : point,
        ),
      }),
    ],
    [
      "return-path frequency",
      (details: WorkbenchPerformanceWorkspaceDetails) => ({
        ...details,
        gross_chart: details.gross_chart.map((point, index) =>
          index === 0 ? { ...point, frequency: "weekly" } : point,
        ),
      }),
    ],
  ])("rejects detail evidence with a stale %s", (_name, buildStaleDetails) => {
    expect(
      isPerformanceDetailsSourceCurrent(
        buildStaleDetails(buildPerformanceWorkspaceDetails()),
        identity,
      ),
    ).toBe(false);
  });

  it("binds a historical preset period to the source-confirmed valuation date", () => {
    const summary = buildPerformanceWorkspaceSummary();
    const details = buildPerformanceWorkspaceDetails();
    const historicalIdentity = {
      ...identity,
      asOfDate: "2026-02-24",
    };

    expect(
      isPerformanceSummarySourceCurrent(
        { ...summary, requested_as_of_date: "2026-02-24" },
        historicalIdentity,
      ),
    ).toBe(true);
    expect(
      isPerformanceSummarySourceCurrent(
        {
          ...summary,
          requested_as_of_date: "2026-02-24",
          report_end_date: "2026-03-31",
        },
        historicalIdentity,
      ),
    ).toBe(false);
    expect(
      isPerformanceDetailsSourceCurrent(
        {
          ...details,
          requested_as_of_date: "2026-02-24",
          report_end_date: "2026-03-31",
        },
        historicalIdentity,
      ),
    ).toBe(false);
  });

  it("binds a current preset period to the source-confirmed valuation date", () => {
    const summary = buildPerformanceWorkspaceSummary();
    const details = buildPerformanceWorkspaceDetails();

    expect(isPerformanceSummarySourceCurrent(summary, identity)).toBe(true);
    expect(isPerformanceDetailsSourceCurrent(details, identity)).toBe(true);
    expect(
      isPerformanceSummarySourceCurrent(
        { ...summary, report_end_date: "2026-03-31" },
        identity,
      ),
    ).toBe(false);
    expect(
      isPerformanceDetailsSourceCurrent(
        { ...details, report_end_date: "2026-03-31" },
        identity,
      ),
    ).toBe(false);
  });

  it.each([
    ["portfolio", { portfolio_id: "PF_OTHER" }],
    ["period", { period: "1Y" }],
    ["basis", { detail_basis: "GROSS" }],
    ["contribution dimension", { contribution_dimension: "issuer" }],
    ["attribution dimension", { attribution_dimension: "issuer" }],
    ["frequency", { chart_frequency: "daily" }],
    ["benchmark", { benchmark_code: "BMK_OTHER" }],
  ])("rejects analytical evidence with a different %s", (_name, overrides) => {
    const source = {
      ...buildPerformanceWorkspaceSummary(),
      attribution_dimension: "asset_class",
      ...overrides,
    };

    expect(
      isPerformanceAnalyticalSourceCurrent(source, {
        portfolioId: "PF_1001",
        period: "YTD",
        detailBasis: "NET",
        contributionDimension: "asset_class",
        attributionDimension: "asset_class",
        chartFrequency: "monthly",
        benchmark: "BMK_GLOBAL_BALANCED_60_40",
      }),
    ).toBe(false);
  });

  it("accepts explicit source-declared normalization but not an unexplained mismatch", () => {
    const source = {
      ...buildPerformanceWorkspaceSummary(),
      attribution_dimension: "asset_class",
    };
    const identity = {
      portfolioId: "PF_1001",
      period: "YTD",
      detailBasis: "NET",
      attributionDimension: "issuer",
      chartFrequency: "weekly",
      benchmark: "BMK_GLOBAL_BALANCED_60_40",
    };

    expect(
      isPerformanceAnalyticalSourceCurrent(
        {
          ...source,
          requested_attribution_dimension_supported: false,
          requested_chart_frequency_supported: false,
        },
        identity,
      ),
    ).toBe(true);
    expect(isPerformanceAnalyticalSourceCurrent(source, identity)).toBe(false);
  });

  it.each([
    ["basis", { detail_basis: "GROSS" }],
    ["frequency", { chart_frequency: "daily" }],
    ["benchmark", { benchmark_code: "BMK_OTHER" }],
  ])(
    "rejects primary summary evidence with a different %s",
    (_name, overrides) => {
      const requestedIdentity = {
        portfolioId: "PF_1001",
        period: "YTD",
        detailBasis: "NET",
        contributionDimension: "asset_class",
        attributionDimension: "asset_class",
        chartFrequency: "monthly",
        benchmark: "BMK_GLOBAL_BALANCED_60_40",
      };

      expect(
        isPerformanceSummarySourceCurrent(
          { ...buildPerformanceWorkspaceSummary(), ...overrides },
          requestedIdentity,
        ),
      ).toBe(false);
    },
  );

  it.each([
    ["basis", { detail_basis: "GROSS" }],
    ["contribution dimension", { contribution_dimension: "issuer" }],
    ["attribution dimension", { attribution_dimension: "issuer" }],
    ["frequency", { chart_frequency: "daily" }],
    ["benchmark", { benchmark_code: "BMK_OTHER" }],
  ])(
    "rejects primary detail evidence with a different %s",
    (_name, overrides) => {
      expect(
        isPerformanceDetailsSourceCurrent(
          { ...buildPerformanceWorkspaceDetails(), ...overrides },
          {
            portfolioId: "PF_1001",
            period: "YTD",
            detailBasis: "NET",
            contributionDimension: "asset_class",
            attributionDimension: "asset_class",
            chartFrequency: "monthly",
            benchmark: "BMK_GLOBAL_BALANCED_60_40",
          },
        ),
      ).toBe(false);
    },
  );

  it("rejects primary detail evidence that omits its contribution dimension", () => {
    expect(
      isPerformanceDetailsSourceCurrent(
        {
          ...buildPerformanceWorkspaceDetails(),
          contribution_dimension: "",
        },
        {
          portfolioId: "PF_1001",
          contributionDimension: "asset_class",
        },
      ),
    ).toBe(false);
  });

  it("admits declared primary normalization without adopting undeclared drift", () => {
    const requestedIdentity = {
      portfolioId: "PF_1001",
      period: "YTD",
      contributionDimension: "issuer",
      attributionDimension: "issuer",
      chartFrequency: "weekly",
    };
    const declaredSummaryNormalization = {
      chart_frequency: "monthly",
      requested_chart_frequency_supported: false,
    };
    const declaredDetailNormalization = {
      contribution_dimension: "asset_class",
      attribution_dimension: "asset_class",
      chart_frequency: "monthly",
      requested_contribution_dimension_supported: false,
      requested_attribution_dimension_supported: false,
      requested_chart_frequency_supported: false,
    };

    expect(
      isPerformanceSummarySourceCurrent(
        {
          ...buildPerformanceWorkspaceSummary(),
          ...declaredSummaryNormalization,
        },
        requestedIdentity,
      ),
    ).toBe(true);
    expect(
      isPerformanceDetailsSourceCurrent(
        {
          ...buildPerformanceWorkspaceDetails(),
          ...declaredDetailNormalization,
        },
        requestedIdentity,
      ),
    ).toBe(true);
    expect(
      isPerformanceSummarySourceCurrent(
        {
          ...buildPerformanceWorkspaceSummary(),
          ...declaredSummaryNormalization,
          requested_chart_frequency_supported: true,
        },
        requestedIdentity,
      ),
    ).toBe(false);
  });

  it("requires summary and detail to share one effective review context", () => {
    expect(
      doPerformanceSummaryAndDetailsShareReviewContext(
        buildPerformanceWorkspaceSummary(),
        buildPerformanceWorkspaceDetails(),
      ),
    ).toBe(true);
    expect(
      doPerformanceSummaryAndDetailsShareReviewContext(
        buildPerformanceWorkspaceSummary(),
        {
          ...buildPerformanceWorkspaceDetails(),
          reporting_currency_state: "unavailable",
        },
      ),
    ).toBe(false);
  });
});
