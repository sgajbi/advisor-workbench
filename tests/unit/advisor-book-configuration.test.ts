import { afterEach, describe, expect, it, vi } from "vitest";

import {
  resolveAdvisorBookAsOfDate,
  resolveAdvisorBookAsOfDateFromSearchParams,
} from "@/features/advisor-book/configuration";

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("advisor-book business-date resolution", () => {
  it("accepts a valid requested calendar date", () => {
    vi.stubEnv("NEXT_PUBLIC_WORKBENCH_ADVISOR_BOOK_AS_OF_DATE", "2026-04-10");

    expect(resolveAdvisorBookAsOfDate("2026-04-11")).toEqual({
      status: "confirmed",
      value: "2026-04-11",
      source: "requested",
    });
  });

  it("fails closed on malformed or impossible requested dates", () => {
    vi.stubEnv("NEXT_PUBLIC_WORKBENCH_ADVISOR_BOOK_AS_OF_DATE", "2026-04-10");

    expect(resolveAdvisorBookAsOfDate("not-a-date")).toEqual({
      status: "not_confirmed",
      reason: "invalid_requested_date",
    });
    expect(resolveAdvisorBookAsOfDate("2026-02-30")).toEqual({
      status: "not_confirmed",
      reason: "invalid_requested_date",
    });
  });

  it("fails closed when the requested business date is repeated", () => {
    vi.stubEnv("NEXT_PUBLIC_WORKBENCH_ADVISOR_BOOK_AS_OF_DATE", "2026-04-10");

    expect(
      resolveAdvisorBookAsOfDateFromSearchParams(
        new URLSearchParams("asOfDate=2026-04-10&asOfDate=2026-04-11"),
      ),
    ).toEqual({
      status: "not_confirmed",
      reason: "ambiguous_requested_date",
    });
  });

  it.each([
    "portfolioId=PB_SG_GLOBAL_BAL_001&portfolioId=PB_OTHER_001&asOfDate=2026-04-10",
    "period=ONE_YEAR&asOfDate=2026-04-10",
    "reportingCurrency=usd&asOfDate=2026-04-10",
  ])("does not salvage a date from invalid review context %s", (query) => {
    vi.stubEnv("NEXT_PUBLIC_WORKBENCH_ADVISOR_BOOK_AS_OF_DATE", "2026-04-10");

    expect(
      resolveAdvisorBookAsOfDateFromSearchParams(new URLSearchParams(query)),
    ).toEqual({
      status: "not_confirmed",
      reason: "invalid_review_context",
    });
  });

  it("uses only an explicit valid development configuration when no date is requested", () => {
    vi.stubEnv("WORKBENCH_BUILD_ENVIRONMENT", "dev");
    vi.stubEnv("NEXT_PUBLIC_WORKBENCH_ADVISOR_BOOK_AS_OF_DATE", "2026-04-10");

    expect(resolveAdvisorBookAsOfDate(null)).toEqual({
      status: "confirmed",
      value: "2026-04-10",
      source: "development_configured",
    });
  });

  it("uses the explicit fixture in the governed test environment outside Next build", () => {
    vi.stubEnv("WORKBENCH_BUILD_ENVIRONMENT", "");
    vi.stubEnv("NEXT_PUBLIC_WORKBENCH_ADVISOR_BOOK_AS_OF_DATE", "2026-04-10");

    expect(resolveAdvisorBookAsOfDate(null)).toEqual({
      status: "confirmed",
      value: "2026-04-10",
      source: "development_configured",
    });
  });

  it.each(["uat", "production"])(
    "rejects a configured development date in the %s environment",
    (environment) => {
      vi.stubEnv("WORKBENCH_BUILD_ENVIRONMENT", environment);
      vi.stubEnv("NEXT_PUBLIC_WORKBENCH_ADVISOR_BOOK_AS_OF_DATE", "2026-04-10");

      expect(resolveAdvisorBookAsOfDate(null)).toEqual({
        status: "not_confirmed",
        reason: "development_date_not_allowed",
      });
    },
  );

  it("rejects a development date when the build environment is unconfigured", () => {
    vi.stubEnv("WORKBENCH_BUILD_ENVIRONMENT", "unconfigured");
    vi.stubEnv("NEXT_PUBLIC_WORKBENCH_ADVISOR_BOOK_AS_OF_DATE", "2026-04-10");

    expect(resolveAdvisorBookAsOfDate(null)).toEqual({
      status: "not_confirmed",
      reason: "development_date_not_allowed",
    });
  });

  it("does not invent a date when development configuration is absent or invalid", () => {
    vi.stubEnv("NEXT_PUBLIC_WORKBENCH_ADVISOR_BOOK_AS_OF_DATE", "");
    expect(resolveAdvisorBookAsOfDate(null)).toEqual({
      status: "not_confirmed",
      reason: "date_not_configured",
    });

    vi.stubEnv("NEXT_PUBLIC_WORKBENCH_ADVISOR_BOOK_AS_OF_DATE", "2026-04-31");
    expect(resolveAdvisorBookAsOfDate(null)).toEqual({
      status: "not_confirmed",
      reason: "invalid_development_configuration",
    });
  });
});
