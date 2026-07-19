import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

function readSource(relativePath: string): string {
  return readFileSync(resolve(process.cwd(), relativePath), "utf8");
}

describe("performance attribution source authority", () => {
  it("keeps attribution-effect aggregation out of Workbench presentation helpers", () => {
    const helperSource = readSource(
      "src/apps/performance/components/performance-workspace-view-helpers.ts"
    );

    expect(helperSource).not.toContain("row.allocation_pct");
    expect(helperSource).not.toContain("row.selection_pct");
    expect(helperSource).not.toContain("row.interaction_pct");
    expect(helperSource).not.toContain("row.total_effect_pct");
  });

  it("binds attribution table totals directly to the source level contract", () => {
    const breakdownSource = readSource(
      "src/apps/performance/components/performance-analysis-attribution-breakdown.tsx"
    );

    expect(breakdownSource).not.toContain("rows.reduce");
    expect(breakdownSource).toContain("formatAttributionTotal(level.allocation_total_pct)");
    expect(breakdownSource).toContain("formatAttributionTotal(level.selection_total_pct)");
    expect(breakdownSource).toContain("formatAttributionTotal(level.interaction_total_pct)");
    expect(breakdownSource).toContain("formatAttributionTotal(level.total_effect_pct)");
  });
});
