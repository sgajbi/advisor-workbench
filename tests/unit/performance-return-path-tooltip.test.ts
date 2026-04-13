import { describe, expect, it } from "vitest";

import {
  buildReturnPathTooltipFormatter,
  formatReturnPathTooltip,
} from "../../src/apps/performance/components/performance-return-path-tooltip";

describe("performance-return-path-tooltip", () => {
  it("renders a non-empty fallback tooltip when hovered values are unavailable", () => {
    const html = formatReturnPathTooltip([
      {
        seriesName: "Portfolio",
        value: null,
        axisValue: "2026-03",
        marker: "",
      } as unknown as Parameters<typeof formatReturnPathTooltip>[0] extends infer T
        ? T extends Array<infer U>
          ? U
          : never
        : never,
    ]);

    expect(html).toContain("2026-03");
    expect(html).toContain("No published values are available at this point.");
    expect(html).not.toEqual("");
  });

  it("renders grouped portfolio, benchmark, and active sections for populated tooltip points", () => {
    const formatter = buildReturnPathTooltipFormatter({
      points: [
        {
          label: "2026-03",
          frequency: "monthly",
          period_start: "2026-03-01",
          period_end: "2026-03-31",
          portfolio_return_pct: 1.4,
          benchmark_return_pct: 1.1,
          active_return_pct: 0.3,
          cumulative_portfolio_return_pct: 6.2,
          cumulative_benchmark_return_pct: 5.8,
          cumulative_active_return_pct: 0.4,
        },
      ],
      showAbsoluteSeries: true,
      showBenchmarkSeries: true,
      showActiveSeries: true,
    });

    const html = formatter([
      {
        seriesName: "Portfolio",
        value: 6.2,
        axisValue: "2026-03",
        dataIndex: 0,
        marker: "<span>●</span>",
      } as never,
    ]);

    expect(html).toContain("Portfolio");
    expect(html).toContain("Benchmark");
    expect(html).toContain("Active");
    expect(html).toContain("Period");
    expect(html).toContain("Cumulative");
    expect(html).toContain("6.20%");
    expect(html).toContain("5.80%");
    expect(html).toContain("0.40%");
  });
});
