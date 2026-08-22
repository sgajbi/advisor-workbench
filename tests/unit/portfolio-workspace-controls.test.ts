import { describe, expect, it } from "vitest";

import {
  applyPortfolioControlPatch,
  buildPortfolioReviewHref,
  isPortfolioReviewResponseCurrent,
  resolvePortfolioReviewControls,
} from "@/apps/portfolio/portfolio-workspace-controls";
import type { PortfolioWorkspace } from "@/apps/portfolio/types";
import type { PortfolioWorkspaceControls } from "@/apps/portfolio/view-model";

const CONTROLS: PortfolioWorkspaceControls = {
  asOfDate: "2026-08-21",
  reportingCurrency: "SGD",
  viewMode: "detailed",
  timeWindow: "YTD",
  customStartDate: "2026-01-01",
  customEndDate: "2026-08-21",
  columnMode: "expanded",
  hideEmptyModules: true,
  focusExceptions: true,
};

describe("portfolio workspace control patch", () => {
  it.each([
    { asOfDate: "2026-08-20" },
    { reportingCurrency: "USD" },
    { hideEmptyModules: false },
    { focusExceptions: false },
  ] satisfies Array<Partial<PortfolioWorkspaceControls>>)(
    "preserves the advisor's detailed workspace for unrelated patch %o",
    (patch) => {
      expect(applyPortfolioControlPatch(CONTROLS, patch)).toMatchObject({
        ...patch,
        viewMode: "detailed",
        columnMode: "expanded",
      });
    },
  );

  it("changes detail and density only when explicitly requested", () => {
    expect(
      applyPortfolioControlPatch(CONTROLS, {
        viewMode: "summary",
        columnMode: "essential",
      }),
    ).toMatchObject({ viewMode: "summary", columnMode: "essential" });
  });

  it("clears a custom range when the advisor selects a governed period", () => {
    expect(applyPortfolioControlPatch(CONTROLS, { timeWindow: "1Y" })).toEqual({
      ...CONTROLS,
      timeWindow: "1Y",
      customStartDate: "",
      customEndDate: "",
    });
  });

  it("keeps an explicitly supplied date range with its period patch", () => {
    expect(
      applyPortfolioControlPatch(CONTROLS, {
        timeWindow: "1Y",
        customStartDate: "2025-08-22",
        customEndDate: "2026-08-21",
      }),
    ).toMatchObject({
      timeWindow: "1Y",
      customStartDate: "2025-08-22",
      customEndDate: "2026-08-21",
      viewMode: "detailed",
      columnMode: "expanded",
    });
  });
});

describe("portfolio review-context controls", () => {
  const workspace = {
    as_of_date: "2026-08-21",
    portfolio: { base_currency: "USD" },
    control_capabilities: {
      historical_snapshots: {
        state: "supported",
        reason: "available",
        earliest_available_as_of_date: "2026-01-01",
        latest_available_as_of_date: "2026-08-21",
      },
      reporting_currency_restatement: {
        state: "supported",
        reason: "available",
        effective_reporting_currency: "USD",
        supported_currencies: ["USD", "SGD"],
      },
    },
  } as PortfolioWorkspace;

  it("hydrates only source-supported portfolio controls", () => {
    expect(
      resolvePortfolioReviewControls(workspace, {
        asOfDate: "2026-06-30",
        period: "YTD",
        reportingCurrency: "SGD",
      }),
    ).toMatchObject({
      status: "valid",
      controls: {
        asOfDate: "2026-06-30",
        timeWindow: "YTD",
        reportingCurrency: "SGD",
      },
    });
  });

  it("accepts source defaults even when optional controls are not supported", () => {
    const unsupportedWorkspace = {
      ...workspace,
      control_capabilities: undefined,
    } as PortfolioWorkspace;

    expect(
      resolvePortfolioReviewControls(unsupportedWorkspace, {
        asOfDate: "2026-08-21",
        reportingCurrency: "USD",
        period: "30D",
      }),
    ).toMatchObject({ status: "valid" });
  });

  it("fails the complete consumer context when controls exceed source support", () => {
    expect(
      resolvePortfolioReviewControls(workspace, {
        asOfDate: "2025-12-31",
        period: "5Y",
        reportingCurrency: "EUR",
      }),
    ).toEqual({
      status: "invalid",
      issues: [
        "unsupported_period",
        "unsupported_as_of_date",
        "unsupported_reporting_currency",
      ],
    });
  });

  it.each([
    [null, false],
    [{}, false],
    [{ as_of_date: "2026-08-20" }, false],
    [{ as_of_date: "2026-08-21" }, true],
  ] as const)(
    "admits only source evidence for the requested valuation date: %o",
    (response, expected) => {
      expect(isPortfolioReviewResponseCurrent(response, CONTROLS)).toBe(
        expected,
      );
    },
  );
});

describe("portfolio review navigation", () => {
  it("commits controls through the governed context while preserving page state", () => {
    expect(
      buildPortfolioReviewHref({
        pathname: "/portfolio",
        searchParams: new URLSearchParams(
          "portfolioId=STALE&period=30D&mode=exceptions&selectedRecordId=SG000001",
        ),
        portfolioId: "PB_SG_GLOBAL_BAL_001",
        controls: CONTROLS,
      }),
    ).toBe(
      "/portfolio?portfolioId=PB_SG_GLOBAL_BAL_001&asOfDate=2026-08-21&period=YTD&reportingCurrency=SGD&selectedRecordId=SG000001&mode=exceptions",
    );
  });

  it("refuses to salvage an ambiguous current address", () => {
    expect(() =>
      buildPortfolioReviewHref({
        pathname: "/portfolio",
        searchParams: new URLSearchParams(
          "portfolioId=PB_ONE&portfolioId=PB_TWO",
        ),
        portfolioId: "PB_SG_GLOBAL_BAL_001",
        controls: CONTROLS,
      }),
    ).toThrowError("Cannot navigate with invalid review context.");
  });
});
