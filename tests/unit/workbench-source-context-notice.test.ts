import { describe, expect, it } from "vitest";

import { buildWorkbenchSourceContextNotice } from "@/design-system";

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
