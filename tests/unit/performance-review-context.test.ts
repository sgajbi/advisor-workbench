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

  it("accepts source evidence that confirms no date or currency override", () => {
    expect(
      isPerformanceReviewContextCurrent(
        {
          ...BASE_EVIDENCE,
          requested_as_of_date: null,
          requested_reporting_currency: null,
          effective_reporting_currency: "USD",
          reporting_currency_state: "accepted_unverified",
        },
        {},
      ),
    ).toBe(true);
  });

  it.each([
    {
      label: "reporting-currency",
      source: {
        requested_as_of_date: null,
        requested_reporting_currency: "EUR",
        effective_reporting_currency: "EUR",
        reporting_currency_state: "applied" as const,
      },
    },
    {
      label: "valuation-date",
      source: {
        requested_as_of_date: "2026-02-24",
        requested_reporting_currency: null,
        effective_reporting_currency: "USD",
        reporting_currency_state: "accepted_unverified" as const,
      },
    },
  ])("rejects an unsolicited $label override", ({ source }) => {
    expect(
      isPerformanceReviewContextCurrent({ ...BASE_EVIDENCE, ...source }, {}),
    ).toBe(false);
  });

  it("rejects an applied state without a requested currency", () => {
    expect(
      isPerformanceReviewContextCurrent(
        {
          ...BASE_EVIDENCE,
          requested_as_of_date: null,
          requested_reporting_currency: null,
        },
        {},
      ),
    ).toBe(false);
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
