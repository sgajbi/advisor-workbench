import { describe, expect, it } from "vitest";

import { getAttributionRankingRows } from "../../src/apps/performance/components/performance-analysis-view-helpers";

describe("performance-analysis-view-helpers", () => {
  it("maps attribution ranking rows onto the shared ranked-bar contract", () => {
    const rows = getAttributionRankingRows([
      {
        key_label: "Equity",
        portfolio_weight_avg_pct: 61,
        benchmark_weight_avg_pct: 58,
        portfolio_return_pct: 7.4,
        benchmark_return_pct: 6.8,
        allocation_pct: 0.18,
        selection_pct: 0.24,
        interaction_pct: 0.03,
        total_effect_pct: -0.45,
      },
    ]);

    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      key: "effect-ranking-Equity",
      title: "Equity",
      value: "-0.45%",
      magnitudePct: 0.45,
      tone: "negative",
    });
    expect(rows[0].subtitle).toContain("Alloc 0.18%");
    expect(rows[0].subtitle).toContain("Select 0.24%");
  });
});
