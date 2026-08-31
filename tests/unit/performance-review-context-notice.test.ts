import { describe, expect, it } from "vitest";

import { buildPerformanceReviewContextNotice } from "@/apps/performance/performance-review-context-notice";
import { buildPerformanceWorkspaceSummary } from "../fixtures/performance-workspace-fixtures";

describe("performance review context notice", () => {
  it("stays absent when the source proves the selected date and applied currency", () => {
    const source = {
      ...buildPerformanceWorkspaceSummary(),
      requested_as_of_date: "2026-02-24",
      effective_as_of_date: "2026-02-24",
      requested_reporting_currency: "SGD",
      effective_reporting_currency: "SGD",
      reporting_currency_state: "applied",
    } as const;

    expect(
      buildPerformanceReviewContextNotice({
        requestedAsOfDate: "2026-02-24",
        requestedReportingCurrency: "SGD",
        source,
      }),
    ).toBeNull();
  });

  it("states that unverified restatement remains in base currency", () => {
    const source = {
      ...buildPerformanceWorkspaceSummary(),
      requested_reporting_currency: "SGD",
      effective_reporting_currency: "SGD",
      reporting_currency_state: "accepted_unverified",
    } as const;

    expect(
      buildPerformanceReviewContextNotice({
        requestedReportingCurrency: "SGD",
        source,
      }),
    ).toEqual({
      title: "Performance source context",
      body: "Performance remains in portfolio base currency USD because restatement to SGD has not been verified by the calculation source.",
    });
  });

  it("combines a source-date difference with unavailable currency evidence", () => {
    const source = {
      ...buildPerformanceWorkspaceSummary(),
      requested_as_of_date: "2026-02-23",
      effective_as_of_date: "2026-02-24",
      requested_reporting_currency: "EUR",
      effective_reporting_currency: "USD",
      reporting_currency_state: "unavailable",
    } as const;

    const notice = buildPerformanceReviewContextNotice({
      requestedAsOfDate: "2026-02-23",
      requestedReportingCurrency: "EUR",
      source,
    });

    expect(notice?.body).toContain("source valuation date 24 Feb 2026");
    expect(notice?.body).toContain(
      "Performance remains in portfolio base currency USD because restatement evidence for EUR is unavailable.",
    );
  });
});
