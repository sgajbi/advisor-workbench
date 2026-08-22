import { describe, expect, it } from "vitest";

import {
  buildReviewContextHref,
  parseReviewContext,
  REVIEW_PERIODS,
  serializeReviewContext,
  type ReviewContext,
  type ReviewContextField,
} from "@/shell/review-context";

const COMPLETE_CONTEXT = {
  portfolioId: "PB_SG_GLOBAL_BAL_001",
  asOfDate: "2026-08-21",
  period: "YTD",
  reportingCurrency: "SGD",
  selectedRecordId: "SG000001",
  batchId: "batch:2026-08-21:001",
} as const satisfies ReviewContext;

describe("governed review context", () => {
  it("treats an absent review context as valid but unconfirmed", () => {
    expect(parseReviewContext(new URLSearchParams())).toEqual({
      status: "valid",
      context: {},
    });
  });

  it("parses every governed field without altering source identity", () => {
    const result = parseReviewContext(
      new URLSearchParams(serializeReviewContext(COMPLETE_CONTEXT)),
    );

    expect(result).toEqual({ status: "valid", context: COMPLETE_CONTEXT });
  });

  it("accepts server route search-param records through the same authority", () => {
    expect(
      parseReviewContext({
        portfolioId: "PB_SG_GLOBAL_BAL_001",
        asOfDate: "2026-08-21",
        period: "30D",
      }),
    ).toEqual({
      status: "valid",
      context: {
        portfolioId: "PB_SG_GLOBAL_BAL_001",
        asOfDate: "2026-08-21",
        period: "30D",
      },
    });
  });

  it("ignores page-local query parameters rather than claiming their meaning", () => {
    expect(
      parseReviewContext(
        new URLSearchParams(
          "portfolioId=PB_SG_GLOBAL_BAL_001&mode=risk-review&sort=market-value",
        ),
      ),
    ).toEqual({
      status: "valid",
      context: { portfolioId: "PB_SG_GLOBAL_BAL_001" },
    });
  });

  it.each<ReviewContextField>([
    "portfolioId",
    "asOfDate",
    "period",
    "reportingCurrency",
    "selectedRecordId",
    "batchId",
  ])("rejects repeated %s values as ambiguous", (field) => {
    const searchParams = new URLSearchParams();
    searchParams.append(field, "first");
    searchParams.append(field, "second");

    expect(parseReviewContext(searchParams)).toEqual({
      status: "invalid",
      issues: [{ field, code: "ambiguous" }],
    });
  });

  it("reports every invalid governed field without exposing a partial context", () => {
    const searchParams = new URLSearchParams({
      portfolioId: " PB_SG_GLOBAL_BAL_001",
      asOfDate: "2026-02-29",
      period: "ONE_YEAR",
      reportingCurrency: "usd",
      selectedRecordId: "",
      batchId: "batch\u0000id",
    });

    expect(parseReviewContext(searchParams)).toEqual({
      status: "invalid",
      issues: [
        { field: "portfolioId", code: "invalid" },
        { field: "asOfDate", code: "invalid" },
        { field: "period", code: "invalid" },
        { field: "reportingCurrency", code: "invalid" },
        { field: "selectedRecordId", code: "invalid" },
        { field: "batchId", code: "invalid" },
      ],
    });
  });

  it.each(["2026-08-21T00:00:00Z", "2026-04-31", "21-08-2026"])(
    "does not reinterpret %s as a business date",
    (asOfDate) => {
      expect(parseReviewContext(new URLSearchParams({ asOfDate }))).toEqual({
        status: "invalid",
        issues: [{ field: "asOfDate", code: "invalid" }],
      });
    },
  );

  it.each(REVIEW_PERIODS)("accepts governed period %s", (period) => {
    expect(parseReviewContext(new URLSearchParams({ period }))).toEqual({
      status: "valid",
      context: { period },
    });
  });

  it("serializes in stable business-context order and never duplicates keys", () => {
    const searchParams = serializeReviewContext({
      batchId: COMPLETE_CONTEXT.batchId,
      reportingCurrency: COMPLETE_CONTEXT.reportingCurrency,
      portfolioId: COMPLETE_CONTEXT.portfolioId,
      selectedRecordId: COMPLETE_CONTEXT.selectedRecordId,
      period: COMPLETE_CONTEXT.period,
      asOfDate: COMPLETE_CONTEXT.asOfDate,
    });

    expect(searchParams.toString()).toBe(
      "portfolioId=PB_SG_GLOBAL_BAL_001&asOfDate=2026-08-21&period=YTD&reportingCurrency=SGD&selectedRecordId=SG000001&batchId=batch%3A2026-08-21%3A001",
    );
    for (const field of Object.keys(COMPLETE_CONTEXT)) {
      expect(searchParams.getAll(field)).toHaveLength(1);
    }
  });

  it("omits unconfirmed optional fields", () => {
    expect(
      serializeReviewContext({ portfolioId: "PB_SG_GLOBAL_BAL_001" }).toString(),
    ).toBe("portfolioId=PB_SG_GLOBAL_BAL_001");
  });

  it("round-trips a complete typed context", () => {
    expect(parseReviewContext(serializeReviewContext(COMPLETE_CONTEXT))).toEqual({
      status: "valid",
      context: COMPLETE_CONTEXT,
    });
  });

  it("refuses to serialize invalid programmatic context", () => {
    expect(() =>
      serializeReviewContext({ reportingCurrency: "US Dollar" }),
    ).toThrowError("Invalid review-context value for reportingCurrency.");
  });

  it("composes governed context before page-local destination state", () => {
    expect(
      buildReviewContextHref("/performance?mode=risk", {
        portfolioId: "PB_SG_GLOBAL_BAL_001",
        asOfDate: "2026-08-21",
        period: "YTD",
        reportingCurrency: "SGD",
      }),
    ).toBe(
      "/performance?portfolioId=PB_SG_GLOBAL_BAL_001&asOfDate=2026-08-21&period=YTD&reportingCurrency=SGD&mode=risk",
    );
  });

  it("replaces stale or repeated governed destination values exactly once", () => {
    const href =
      "/positions?portfolioId=STALE&portfolioId=STALE_AGAIN&period=30D&instrumentType=BOND";

    expect(
      buildReviewContextHref(href, {
        portfolioId: "PB_SG_GLOBAL_BAL_001",
        period: "1Y",
      }),
    ).toBe(
      "/positions?portfolioId=PB_SG_GLOBAL_BAL_001&period=1Y&instrumentType=BOND",
    );
  });

  it("preserves page-local multiplicity and fragments", () => {
    expect(
      buildReviewContextHref(
        "/transactions?status=BOOKED&status=PENDING#activity",
        { portfolioId: "PB_SG_GLOBAL_BAL_001" },
      ),
    ).toBe(
      "/transactions?portfolioId=PB_SG_GLOBAL_BAL_001&status=BOOKED&status=PENDING#activity",
    );
  });

  it("does not add an empty query marker when context is unconfirmed", () => {
    expect(buildReviewContextHref("/portfolio", {})).toBe("/portfolio");
  });

  it.each([
    "performance",
    "https://bank.example/performance",
    "//bank.example/performance",
  ])("rejects non-local destination %s", (href) => {
    expect(() => buildReviewContextHref(href, COMPLETE_CONTEXT)).toThrowError(
      "Review-context destinations must be local absolute paths.",
    );
  });
});
