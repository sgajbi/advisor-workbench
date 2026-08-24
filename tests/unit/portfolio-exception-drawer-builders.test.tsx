import { describe, expect, it } from "vitest";

import { buildExceptionDrawer } from "../../src/apps/portfolio/components/portfolio-exception-drawer-builders";
import {
  buildPortfolioWorkspace,
  buildPortfolioWorkspaceContext,
} from "../fixtures/portfolio-workspace-component-fixtures";

const PRICING_EXCEPTION = {
  key: "pricing",
  title: "Pricing evidence needs attention",
  detail: "Review missing prices before client use.",
  tone: "warn",
  href: "/positions",
} as const;

describe("portfolio exception drawer builders", () => {
  it("uses the source valuation date when it matches the review date", () => {
    const drawer = buildExceptionDrawer(
      PRICING_EXCEPTION,
      buildPortfolioWorkspace(),
      buildPortfolioWorkspaceContext(),
    );

    expect(drawer.summaryItems).toContainEqual({
      label: "Valuation date",
      value: "12 May 2026",
    });
    expect(drawer.summaryItems).not.toContainEqual(
      expect.objectContaining({ label: "Review date" }),
    );
  });

  it("distinguishes retained evidence from the requested review date", () => {
    const drawer = buildExceptionDrawer(
      PRICING_EXCEPTION,
      buildPortfolioWorkspace({ as_of_date: "2026-04-10" }),
      buildPortfolioWorkspaceContext({ selectedAsOfDate: "2026-04-01" }),
    );

    expect(drawer.summaryItems).toContainEqual({
      label: "Valuation date",
      value: "10 Apr 2026",
    });
    expect(drawer.summaryItems).toContainEqual({
      label: "Review date",
      value: "01 Apr 2026",
    });
    expect(drawer.summaryItems).not.toContainEqual(
      expect.objectContaining({ label: "As of" }),
    );
  });
});
