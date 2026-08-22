import { describe, expect, it } from "vitest";

import { buildManageSourceContextNotice } from "@/features/workbench/manage-source-context";

describe("Manage source context", () => {
  it("explains source date and currency differences in business language", () => {
    expect(
      buildManageSourceContextNotice({
        reviewContext: {
          portfolioId: "PB_SG_GLOBAL_BAL_001",
          asOfDate: "2026-06-30",
          reportingCurrency: "SGD",
        },
        sourceAsOfDate: "2026-05-13",
        sourceCurrency: "USD",
      }),
    ).toEqual({
      title: "Mandate source context",
      body: "Mandate management uses the source valuation date 13 May 2026; the advisor review date 30 Jun 2026 remains available when you return to other workspaces. Mandate management is presented in source base currency USD; reporting-currency restatement to SGD is not supported by this contract.",
    });
  });

  it("stays absent when Manage confirms the carried source context", () => {
    expect(
      buildManageSourceContextNotice({
        reviewContext: {
          portfolioId: "PB_SG_GLOBAL_BAL_001",
          asOfDate: "2026-05-13",
          reportingCurrency: "USD",
        },
        sourceAsOfDate: "2026-05-13",
        sourceCurrency: "USD",
      }),
    ).toBeNull();
  });
});
