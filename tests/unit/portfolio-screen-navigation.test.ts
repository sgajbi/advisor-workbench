import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { getPortfolioRecordScreenCopy } from "../../src/apps/portfolio/portfolio-record-screen-view-model";
import {
  buildPortfolioScreenHref,
  buildPortfolioScreenNavigationItems,
  buildPortfolioScreenNavigationModel,
} from "../../src/apps/portfolio/portfolio-screen-navigation";
import { PORTFOLIO_SCREEN_LABELS } from "../../src/apps/portfolio/portfolio-terminology";
import { REPORT_CENTRE_TITLE } from "../../src/features/report-ordering/report-ordering-terminology";

describe("portfolio screen navigation", () => {
  it("builds encoded portfolio-scoped routes for every Workbench screen", () => {
    const items = buildPortfolioScreenNavigationItems({ portfolioId: "PB SG/001" });

    expect(items.map((item) => item.key)).toEqual([
      "portfolio",
      "allocation",
      "positions",
      "transactions",
      "income",
      "cashflow",
      "performance",
      "risk",
      "proposal",
      "advisory",
      "reports",
      "manage",
    ]);
    expect(items.find((item) => item.key === "allocation")?.href).toBe(
      "/allocation?portfolioId=PB+SG%2F001"
    );
    expect(items.find((item) => item.key === "positions")?.href).toBe(
      "/positions?portfolioId=PB+SG%2F001"
    );
    expect(items.find((item) => item.key === "income")?.href).toBe(
      "/income?portfolioId=PB+SG%2F001"
    );
    expect(items.find((item) => item.key === "risk")?.href).toBe(
      "/performance?portfolioId=PB+SG%2F001&mode=risk"
    );
    expect(items.find((item) => item.key === "advisory")?.href).toBe(
      "/recommendations?portfolioId=PB+SG%2F001"
    );
    expect(items.find((item) => item.key === "reports")?.href).toBe(
      "/reports?portfolioId=PB+SG%2F001"
    );
    expect(items.find((item) => item.key === "manage")?.href).toBe(
      "/workbench/PB%20SG%2F001?portfolioId=PB+SG%2F001",
    );
  });

  it("preserves existing query strings when appending portfolio context", () => {
    expect(
      buildPortfolioScreenHref("/performance?mode=risk", {
        portfolioId: "PB_1",
      }),
    ).toBe(
      "/performance?portfolioId=PB_1&mode=risk",
    );
  });

  it("carries review context while clearing route-scoped record identity", () => {
    const items = buildPortfolioScreenNavigationItems({
      portfolioId: "PB_SG_GLOBAL_BAL_001",
      asOfDate: "2026-08-21",
      period: "YTD",
      reportingCurrency: "SGD",
      selectedRecordId: "SG000001",
      batchId: "rbch_1",
    });

    expect(items.find((item) => item.key === "positions")?.href).toBe(
      "/positions?portfolioId=PB_SG_GLOBAL_BAL_001&asOfDate=2026-08-21&period=YTD&reportingCurrency=SGD",
    );
    expect(items.find((item) => item.key === "risk")?.href).toBe(
      "/performance?portfolioId=PB_SG_GLOBAL_BAL_001&asOfDate=2026-08-21&period=YTD&reportingCurrency=SGD&mode=risk",
    );
    expect(items.map((item) => item.href).join(" ")).not.toContain("batchId");
  });

  it("projects periods through each rail destination's declared policy", () => {
    const items = buildPortfolioScreenNavigationItems({
      portfolioId: "PB_SG_GLOBAL_BAL_001",
      asOfDate: "2026-08-21",
      period: "5Y",
      reportingCurrency: "SGD",
    });

    expect(items.find((item) => item.key === "portfolio")?.href).not.toContain(
      "period=",
    );
    expect(items.find((item) => item.key === "positions")?.href).not.toContain(
      "period=",
    );
    expect(items.find((item) => item.key === "reports")?.href).not.toContain(
      "period=",
    );
    expect(items.find((item) => item.key === "performance")?.href).toContain(
      "period=5Y",
    );
  });

  it("keeps five business domains primary and groups the remaining tasks", () => {
    const model = buildPortfolioScreenNavigationModel(
      { portfolioId: "PB_SG_GLOBAL_BAL_001" },
      "income",
    );

    expect(model.primaryItems.map((item) => item.key)).toEqual([
      "portfolio",
      "performance",
      "advisory",
      "reports",
      "manage",
    ]);
    expect(model.currentTask).toMatchObject({
      key: "income",
      label: PORTFOLIO_SCREEN_LABELS.incomeAndActivity,
    });
    expect(
      model.directoryGroups.map((group) => ({
        key: group.key,
        items: group.items.map((item) => item.key),
      })),
    ).toEqual([
      {
        key: "portfolio-records",
        items: ["allocation", "positions", "transactions", "cashflow"],
      },
      { key: "analytics", items: ["risk"] },
      { key: "advice", items: ["proposal"] },
    ]);
  });

  it("uses the canonical business names for portfolio destinations", () => {
    const items = buildPortfolioScreenNavigationItems({
      portfolioId: "PB_SG_GLOBAL_BAL_001",
    });

    expect(items.find((item) => item.key === "positions")?.label).toBe(
      PORTFOLIO_SCREEN_LABELS.positions,
    );
    expect(items.find((item) => item.key === "income")?.label).toBe(
      PORTFOLIO_SCREEN_LABELS.incomeAndActivity,
    );
    expect(items.find((item) => item.key === "cashflow")?.label).toBe(
      PORTFOLIO_SCREEN_LABELS.projectedCashFlow,
    );
    expect(items.find((item) => item.key === "reports")?.label).toBe(
      PORTFOLIO_SCREEN_LABELS.reportCentre,
    );
  });

  it("keeps navigation, page titles, and the screen registry on one name", () => {
    const items = buildPortfolioScreenNavigationItems({
      portfolioId: "PB_SG_GLOBAL_BAL_001",
    });
    const registry = JSON.parse(
      readFileSync(
        join(
          process.cwd(),
          "docs",
          "documentation",
          "workbench-screen-registry.v1.json",
        ),
        "utf8",
      ),
    ) as { surfaces: Array<{ id: string; businessName: string }> };
    const registeredName = (id: string) =>
      registry.surfaces.find((surface) => surface.id === id)?.businessName;

    expect(items.find((item) => item.key === "positions")?.label).toBe(
      getPortfolioRecordScreenCopy("positions").title,
    );
    expect(getPortfolioRecordScreenCopy("positions").title).toBe(
      registeredName("positions"),
    );
    expect(items.find((item) => item.key === "cashflow")?.label).toBe(
      getPortfolioRecordScreenCopy("cashflow").title,
    );
    expect(getPortfolioRecordScreenCopy("cashflow").title).toBe(
      registeredName("projected-cash-movement"),
    );
    expect(items.find((item) => item.key === "reports")?.label).toBe(
      REPORT_CENTRE_TITLE,
    );
    expect(REPORT_CENTRE_TITLE).toBe(registeredName("report-centre"));
  });

  it("does not repeat a primary destination as a separate current task", () => {
    const model = buildPortfolioScreenNavigationModel(
      { portfolioId: "PB_SG_GLOBAL_BAL_001" },
      "performance",
    );

    expect(model.currentTask).toBeNull();
  });

  it("does not duplicate an active specialist task in the workspace directory", () => {
    const model = buildPortfolioScreenNavigationModel(
      { portfolioId: "PB_SG_GLOBAL_BAL_001" },
      "income",
    );

    expect(model.currentTask?.key).toBe("income");
    expect(
      model.directoryGroups.flatMap((group) =>
        group.items.map((item) => item.key),
      ),
    ).not.toContain("income");
  });
});
