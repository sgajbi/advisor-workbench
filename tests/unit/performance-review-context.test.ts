import { describe, expect, it } from "vitest";

import {
  arePerformanceReviewContextsCoherent,
  getPerformanceDisplayCurrency,
  isPerformanceReviewContextCurrent,
} from "@/apps/performance/performance-review-context";
import type { WorkbenchPerformanceReviewContextEvidence } from "@/features/workbench/types";

const BASE_EVIDENCE: WorkbenchPerformanceReviewContextEvidence & {
  as_of_date: string;
} = {
  as_of_date: "2026-02-24",
  requested_as_of_date: "2026-02-24",
  effective_as_of_date: "2026-02-24",
  requested_reporting_currency: "SGD",
  effective_reporting_currency: "SGD",
  reporting_currency_state: "applied",
};

describe("performance review context", () => {
  it("accepts exact source-confirmed date and applied reporting currency", () => {
    expect(
      isPerformanceReviewContextCurrent(BASE_EVIDENCE, {
        asOfDate: "2026-02-24",
        reportingCurrency: "sgd",
      }),
    ).toBe(true);
    expect(getPerformanceDisplayCurrency(BASE_EVIDENCE, "USD")).toBe("SGD");
  });

  it.each([
    { requested_as_of_date: "2026-02-23" },
    { effective_as_of_date: "2026-02-23" },
    { requested_reporting_currency: "EUR" },
    { effective_reporting_currency: "USD" },
  ])("rejects mismatched applied evidence: %o", (override) => {
    expect(
      isPerformanceReviewContextCurrent(
        { ...BASE_EVIDENCE, ...override },
        { asOfDate: "2026-02-24", reportingCurrency: "SGD" },
      ),
    ).toBe(false);
  });

  it.each(["accepted_unverified", "rejected", "unavailable"] as const)(
    "keeps %s evidence in base currency rather than implying restatement",
    (reportingCurrencyState) => {
      const evidence = {
        ...BASE_EVIDENCE,
        effective_reporting_currency:
          reportingCurrencyState === "accepted_unverified" ? "SGD" : "USD",
        reporting_currency_state: reportingCurrencyState,
      };

      expect(
        isPerformanceReviewContextCurrent(evidence, {
          asOfDate: "2026-02-24",
          reportingCurrency: "SGD",
        }),
      ).toBe(true);
      expect(getPerformanceDisplayCurrency(evidence, "USD")).toBe("USD");
    },
  );

  it("rejects a summary/detail pair with different effective context", () => {
    expect(
      arePerformanceReviewContextsCoherent(BASE_EVIDENCE, {
        ...BASE_EVIDENCE,
        effective_reporting_currency: "USD",
        reporting_currency_state: "unavailable",
      }),
    ).toBe(false);
  });
});
