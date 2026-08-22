import { afterEach, describe, expect, it, vi } from "vitest";

import { resolveAdvisorBookAsOfDate } from "@/features/advisor-book/configuration";

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

  it("uses only an explicit valid development configuration when no date is requested", () => {
    vi.stubEnv("NEXT_PUBLIC_WORKBENCH_ADVISOR_BOOK_AS_OF_DATE", "2026-04-10");

    expect(resolveAdvisorBookAsOfDate(null)).toEqual({
      status: "confirmed",
      value: "2026-04-10",
      source: "development_configured",
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
