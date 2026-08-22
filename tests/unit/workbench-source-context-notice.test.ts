import { describe, expect, it } from "vitest";

import {
  buildWorkbenchSourceContextNotice,
  buildWorkbenchUnsupportedReviewContextNotice,
} from "@/design-system";

describe("Workbench source context notice", () => {
  it("explains source date and currency differences in business language", () => {
    expect(
      buildWorkbenchSourceContextNotice({
        title: "Mandate source context",
        subject: "Mandate management",
        requestedAsOfDate: "2026-06-30",
        requestedReportingCurrency: "SGD",
        sourceAsOfDate: "2026-05-13",
        sourceCurrency: "USD",
      }),
    ).toEqual({
      title: "Mandate source context",
      body: "Mandate management uses the source valuation date 13 May 2026; the advisor review date 30 Jun 2026 remains available when you return to other workspaces. Mandate management is presented in source base currency USD; reporting-currency restatement to SGD is not supported by this contract.",
    });
  });

  it("supports another workspace without duplicating source comparison logic", () => {
    expect(
      buildWorkbenchSourceContextNotice({
        title: "Performance source context",
        subject: "Performance",
        requestedReportingCurrency: "EUR",
        sourceCurrency: "USD",
      }),
    ).toEqual({
      title: "Performance source context",
      body: "Performance is presented in source base currency USD; reporting-currency restatement to EUR is not supported by this contract.",
    });
  });

  it("stays absent when the source confirms the carried context", () => {
    expect(
      buildWorkbenchSourceContextNotice({
        title: "Mandate source context",
        subject: "Mandate management",
        requestedAsOfDate: "2026-05-13",
        requestedReportingCurrency: "USD",
        sourceAsOfDate: "2026-05-13",
        sourceCurrency: "USD",
      }),
    ).toBeNull();
  });
});

describe("Workbench unsupported review-context notice", () => {
  it("explains every carried selector that does not filter a source worklist", () => {
    expect(
      buildWorkbenchUnsupportedReviewContextNotice({
        title: "Proposal worklist scope",
        subject: "Proposal lifecycle evidence",
        destination: "proposal worklist",
        requestedAsOfDate: "2026-04-10",
        requestedPeriod: "YTD",
        requestedReportingCurrency: "SGD",
      }),
    ).toEqual({
      title: "Proposal worklist scope",
      body: "Proposal lifecycle evidence reflects current source state. The carried advisor review date 10 Apr 2026, review period YTD, and reporting currency SGD remain available across the wider review, but they do not filter this proposal worklist.",
    });
  });

  it("uses singular business grammar and stays absent without carried selectors", () => {
    expect(
      buildWorkbenchUnsupportedReviewContextNotice({
        title: "Queue scope",
        subject: "Queue evidence",
        destination: "queue",
        requestedPeriod: "30D",
      }),
    ).toEqual({
      title: "Queue scope",
      body: "Queue evidence reflects current source state. The carried review period 30D remains available across the wider review, but it does not filter this queue.",
    });
    expect(
      buildWorkbenchUnsupportedReviewContextNotice({
        title: "Queue scope",
        subject: "Queue evidence",
        destination: "queue",
      }),
    ).toBeNull();
  });
});
