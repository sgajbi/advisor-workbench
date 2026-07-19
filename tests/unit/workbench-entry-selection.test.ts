import { describe, expect, it } from "vitest";

import { resolveWorkbenchFallbackPortfolioIds } from "@/features/workbench-entry-selection";

describe("Workbench entry selection", () => {
  it("uses the governed canonical-first fallback order when configuration is absent", () => {
    expect(resolveWorkbenchFallbackPortfolioIds(undefined)).toEqual([
      "PB_SG_GLOBAL_BAL_001",
      "DEMO_DPM_EUR_001",
      "DEMO_INCOME_CHF_001",
      "DEMO_BALANCED_SGD_001",
      "DEMO_REBAL_USD_001",
      "DEMO_ADV_USD_001",
    ]);
  });

  it("normalizes an explicit fallback order without inventing empty portfolio ids", () => {
    expect(resolveWorkbenchFallbackPortfolioIds(" PORT_1001, ,PORT_1002 ")).toEqual([
      "PORT_1001",
      "PORT_1002",
    ]);
  });

  it("preserves an explicitly empty fallback configuration", () => {
    expect(resolveWorkbenchFallbackPortfolioIds("")).toEqual([]);
  });
});
