import { describe, expect, it } from "vitest";

import {
  buildPortfolioScreenHref,
  buildPortfolioScreenNavigationItems,
  buildPortfolioScreenNavigationModel,
} from "../../src/apps/portfolio/portfolio-screen-navigation";

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
      label: "Income and activity",
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
