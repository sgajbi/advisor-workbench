import { describe, expect, it } from "vitest";

import { resolveReturnPathTooltipPosition } from "../../src/apps/performance/components/performance-return-path-chart-model";

describe("performance return path chart model", () => {
  it("prefers left-side tooltip placement near the chart endpoint", () => {
    const [left, top] = resolveReturnPathTooltipPosition([910, 260], {
      contentSize: [260, 180],
      viewSize: [1000, 600],
    });

    expect(left).toBeLessThan(910 - 40);
    expect(top).toBeLessThan(260);
  });

  it("falls below the cursor when there is not enough room above", () => {
    const [left, top] = resolveReturnPathTooltipPosition([220, 90], {
      contentSize: [260, 180],
      viewSize: [1000, 600],
    });

    expect(left).toBeGreaterThan(220);
    expect(top).toBeGreaterThan(90);
  });
});
