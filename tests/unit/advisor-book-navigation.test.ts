import { describe, expect, it } from "vitest";

import { buildPortfolioContextHref } from "@/features/advisor-book/navigation";

describe("advisor-book context navigation", () => {
  it("preserves the current business task and non-portfolio filters", () => {
    expect(
      buildPortfolioContextHref({
        pathname: "/performance",
        searchParams: new URLSearchParams("mode=risk&portfolioId=OLD&period=YTD"),
        portfolioId: "PB SG 002",
      }),
    ).toBe("/performance?mode=risk&period=YTD&portfolioId=PB+SG+002");
  });

  it("replaces a manage workspace path without retaining stale portfolio query context", () => {
    expect(
      buildPortfolioContextHref({
        pathname: "/workbench/OLD",
        searchParams: new URLSearchParams("mode=exceptions&portfolioId=OLD"),
        portfolioId: "PB/NEW",
      }),
    ).toBe("/workbench/PB%2FNEW?mode=exceptions");
  });

  it("opens portfolio review when selecting from the book landing", () => {
    expect(
      buildPortfolioContextHref({
        pathname: "/book",
        searchParams: new URLSearchParams("asOfDate=2026-04-10&clientId=CIF_001&offset=25"),
        portfolioId: "PB_001",
      }),
    ).toBe("/portfolio?asOfDate=2026-04-10&portfolioId=PB_001");
  });
});
