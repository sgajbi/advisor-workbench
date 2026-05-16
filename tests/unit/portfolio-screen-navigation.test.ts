import { describe, expect, it } from "vitest";

import {
  buildPortfolioScreenHref,
  buildPortfolioScreenNavigationItems,
} from "../../src/apps/portfolio/portfolio-screen-navigation";

describe("portfolio screen navigation", () => {
  it("builds encoded portfolio-scoped routes for every Workbench screen", () => {
    const items = buildPortfolioScreenNavigationItems("PB SG/001");

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
      "manage",
    ]);
    expect(items.find((item) => item.key === "allocation")?.href).toBe(
      "/allocation?portfolioId=PB%20SG%2F001"
    );
    expect(items.find((item) => item.key === "positions")?.href).toBe(
      "/positions?portfolioId=PB%20SG%2F001"
    );
    expect(items.find((item) => item.key === "income")?.href).toBe(
      "/income?portfolioId=PB%20SG%2F001"
    );
    expect(items.find((item) => item.key === "risk")?.href).toBe(
      "/performance?mode=risk&portfolioId=PB%20SG%2F001"
    );
    expect(items.find((item) => item.key === "advisory")?.href).toBe(
      "/performance?mode=advisor&portfolioId=PB%20SG%2F001"
    );
    expect(items.find((item) => item.key === "manage")?.href).toBe("/workbench/PB%20SG%2F001");
  });

  it("preserves existing query strings when appending portfolio context", () => {
    expect(buildPortfolioScreenHref("/performance?mode=risk", "PB_1")).toBe(
      "/performance?mode=risk&portfolioId=PB_1"
    );
  });
});
