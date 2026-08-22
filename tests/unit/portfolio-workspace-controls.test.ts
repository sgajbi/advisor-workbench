import { describe, expect, it } from "vitest";

import { applyPortfolioControlPatch } from "@/apps/portfolio/portfolio-workspace-controls";
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
