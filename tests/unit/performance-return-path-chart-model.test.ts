import { describe, expect, it } from "vitest";

import {
  buildReturnPathChartOption,
  resolveReturnPathTooltipPosition,
} from "../../src/apps/performance/components/performance-return-path-chart-model";

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

  it("adds a compact mobile axis-label configuration for narrow viewports", () => {
    const option = buildReturnPathChartOption({
      points: [
        {
          label: "2026-01",
          frequency: "monthly",
          period_start: "2026-01-01",
          period_end: "2026-01-31",
          portfolio_return_pct: 1.2,
          benchmark_return_pct: 0.8,
          active_return_pct: 0.4,
          cumulative_portfolio_return_pct: 1.2,
          cumulative_benchmark_return_pct: 0.8,
          cumulative_active_return_pct: 0.4,
        },
        {
          label: "2026-02",
          frequency: "monthly",
          period_start: "2026-02-01",
          period_end: "2026-02-28",
          portfolio_return_pct: 2.1,
          benchmark_return_pct: 1.7,
          active_return_pct: 0.4,
          cumulative_portfolio_return_pct: 3.3,
          cumulative_benchmark_return_pct: 2.5,
          cumulative_active_return_pct: 0.8,
        },
      ],
      chartViewMode: "combined",
      hasBenchmarkSeries: true,
    });

    const mobileMedia = option.media?.[0];
    expect(mobileMedia?.query).toMatchObject({ maxWidth: 680 });
    expect(mobileMedia?.option?.grid).toMatchObject({
      left: 58,
      right: 92,
      bottom: 72,
    });

    const formatter = (
      mobileMedia?.option?.xAxis as
        | {
            axisLabel?: {
              formatter?: (value: string) => string;
            };
          }
        | undefined
    )?.axisLabel?.formatter as
      | ((value: string) => string)
      | undefined;
    expect(formatter?.("2026-04")).toBe("Apr\n'26");
  });
});
