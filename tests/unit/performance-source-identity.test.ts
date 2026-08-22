import { describe, expect, it } from "vitest";

import type {
  WorkbenchPerformanceWorkspaceDetails,
  WorkbenchPerformanceWorkspaceSummary,
} from "../../src/features/workbench/types";

import {
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
    asOfDate: "2026-02-24",
    period: "YTD",
    reportingCurrency: "USD",
  };

  it("accepts summary and detail payloads that confirm the complete requested identity", () => {
    expect(
      isPerformanceSummarySourceCurrent(buildPerformanceWorkspaceSummary(), identity),
    ).toBe(true);
    expect(
      isPerformanceDetailsSourceCurrent(buildPerformanceWorkspaceDetails(), identity),
    ).toBe(true);
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
    ["valuation date", (summary) => ({ ...summary, as_of_date: "2026-02-23" })],
    [
      "reporting currency",
      (summary) => ({
        ...summary,
        portfolio: { ...summary.portfolio, base_currency: "EUR" },
      }),
    ],
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
    ["valuation date", { as_of_date: "2026-02-23" }],
    ["period", { period: "3Y" }],
  ])("rejects analytical detail with stale %s identity", (_name, overrides) => {
    expect(
      isPerformanceDetailsSourceCurrent(
        { ...buildPerformanceWorkspaceDetails(), ...overrides },
        identity,
      ),
    ).toBe(false);
  });
});
