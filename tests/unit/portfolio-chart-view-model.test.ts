import { describe, expect, it } from "vitest";

import {
  buildAreaPath,
  buildLinePath,
  buildProjectedCashflowChartModel,
  buildTopHoldingTooltip,
  formatCashflowNetMovementTitle,
  formatCashflowPointTitle,
  roundSvg,
} from "../../src/apps/portfolio/portfolio-chart-view-model";
import type { PortfolioWorkspace } from "../../src/apps/portfolio/types";

describe("portfolio chart view model", () => {
  it("builds projected cashflow geometry and focus state from source points", () => {
    const cashflow = buildCashflowOutlook();

    const model = buildProjectedCashflowChartModel(cashflow);

    expect(model.chartPoints).toHaveLength(3);
    expect(model.markerPoints).toHaveLength(3);
    expect(model.flowBars).toHaveLength(3);
    expect(model.areaPath).toMatch(/^M 28 164 L 28 /);
    expect(model.linePath).toMatch(/^M 28 /);
    expect(model.zeroLineY).toEqual(expect.any(Number));
    expect(model.positiveNetMovementCount).toBe(2);
    expect(model.negativeNetMovementCount).toBe(1);
    expect(model.totalPositiveNetMovement).toBe(7_500);
    expect(model.totalNegativeNetMovement).toBe(-2_500);
    expect(model.largestPositiveNetMovement?.projection_date).toBe(
      "2026-05-13",
    );
    expect(model.largestNegativeNetMovement?.projection_date).toBe(
      "2026-05-12",
    );
    expect(model.focusPoint?.projection_date).toBe("2026-05-12");
    expect(model.flatCashflow).toBe(false);
  });

  it("handles flat and empty projected cashflow without invalid svg values", () => {
    const flatModel = buildProjectedCashflowChartModel({
      ...buildCashflowOutlook(),
      total_net_cashflow_base: 0,
      upcoming_points: [
        {
          projection_date: "2026-05-12",
          net_cashflow_base: 0,
          projected_cumulative_cashflow_base: 0,
        },
      ],
    });

    expect(flatModel.flatCashflow).toBe(true);
    expect(flatModel.flowBars).toEqual([]);
    expect(flatModel.zeroLineY).toEqual(expect.any(Number));

    const emptyModel = buildProjectedCashflowChartModel({
      ...buildCashflowOutlook(),
      total_net_cashflow_base: 100,
      upcoming_points: [],
    });

    expect(emptyModel.chartPoints).toEqual([]);
    expect(emptyModel.flowBars).toEqual([]);
    expect(emptyModel.areaPath).toBe("");
    expect(emptyModel.linePath).toBe("");
    expect(emptyModel.focusPoint).toBeNull();
  });

  it("formats chart labels and tooltips consistently", () => {
    const cashflowPoint = buildCashflowOutlook().upcoming_points[0];
    expect(formatCashflowNetMovementTitle(cashflowPoint, "USD")).toBe(
      "12 May 2026: net movement -2,500 USD",
    );
    expect(formatCashflowPointTitle(cashflowPoint, "USD")).toBe(
      "12 May 2026: cumulative projected movement -2,500 USD",
    );
    expect(
      buildTopHoldingTooltip(
        {
          security_id: "AAPL",
          instrument_name: "Apple Inc.",
          asset_class: "EQUITY",
          quantity: 12,
          market_value_base: 25000,
          weight_pct: 4.5,
        },
        "weight",
        "USD",
      ),
    ).toContain("Focus metric: 4.50%");
  });

  it("builds deterministic svg path fragments", () => {
    const points = [
      { x: 1.111, y: 2.222 },
      { x: 3.333, y: 4.444 },
    ];

    expect(roundSvg(1.23456)).toBe(1.23);
    expect(buildLinePath(points)).toBe("M 1.111 2.222 L 3.333 4.444");
    expect(buildAreaPath(points)).toBe(
      "M 1.111 164 L 1.111 2.222 L 3.333 4.444 L 3.333 164 Z",
    );
    expect(buildLinePath([])).toBe("");
    expect(buildAreaPath([])).toBe("");
  });
});

function buildCashflowOutlook(): NonNullable<
  PortfolioWorkspace["cashflow_outlook"]
> {
  return {
    as_of_date: "2026-05-12",
    range_end_date: "2026-05-15",
    total_net_cashflow_base: 5000,
    projection_days: 3,
    include_projected: true,
    upcoming_points: [
      {
        projection_date: "2026-05-12",
        net_cashflow_base: -2500,
        projected_cumulative_cashflow_base: -2500,
      },
      {
        projection_date: "2026-05-13",
        net_cashflow_base: 5000,
        projected_cumulative_cashflow_base: 2500,
      },
      {
        projection_date: "2026-05-14",
        net_cashflow_base: 2500,
        projected_cumulative_cashflow_base: 5000,
      },
    ],
  };
}
