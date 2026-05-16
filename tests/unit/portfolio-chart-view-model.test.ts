import { describe, expect, it } from "vitest";

import {
  buildActivityTooltip,
  buildAreaPath,
  buildIncomeTooltip,
  buildLinePath,
  buildProjectedCashflowChartModel,
  buildTopHoldingTooltip,
  describeActivityBucket,
  formatBucketLabel,
  formatCashflowNetFlowTitle,
  formatCashflowPointTitle,
  roundSvg,
} from "../../src/apps/portfolio/portfolio-chart-view-model";
import type { PortfolioIncomeSummaryView, PortfolioWorkspace } from "../../src/apps/portfolio/types";

describe("portfolio chart view model", () => {
  it("builds projected cashflow geometry and focus state from source points", () => {
    const cashflow = buildCashflowOutlook();

    const model = buildProjectedCashflowChartModel(cashflow);

    expect(model.chartPoints).toHaveLength(3);
    expect(model.flowBars).toHaveLength(3);
    expect(model.areaPath).toMatch(/^M 28 164 L 28 /);
    expect(model.linePath).toMatch(/^M 28 /);
    expect(model.zeroLineY).toEqual(expect.any(Number));
    expect(model.finalCumulative).toBe(5000);
    expect(model.positiveFlowCount).toBe(2);
    expect(model.negativeFlowCount).toBe(1);
    expect(model.largestInflow?.projection_date).toBe("2026-05-13");
    expect(model.largestOutflow?.projection_date).toBe("2026-05-12");
    expect(model.focusPoint?.projection_date).toBe("2026-05-13");
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
    expect(flatModel.flowBars[0]).toMatchObject({ height: 2, direction: "positive" });
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
    expect(emptyModel.finalCumulative).toBe(100);
  });

  it("formats chart labels and tooltips consistently", () => {
    const cashflowPoint = buildCashflowOutlook().upcoming_points[0];
    const incomeType = buildIncomeType();

    expect(formatBucketLabel("FIXED_INCOME_COUPON")).toBe("Fixed Income Coupon");
    expect(describeActivityBucket("INFLOWS")).toBe("Window inflow");
    expect(describeActivityBucket("UNKNOWN_BUCKET")).toBe("Window activity");
    expect(formatCashflowNetFlowTitle(cashflowPoint, "USD")).toBe("12 May 2026: net flow -2,500 USD");
    expect(formatCashflowPointTitle(cashflowPoint, "USD")).toBe(
      "12 May 2026: projected cumulative -2,500 USD"
    );
    expect(buildActivityTooltip("OUTFLOWS", -1200, -2500, "USD")).toBe(
      ["Outflows", "Window: -1,200 USD", "YTD: -2,500 USD"].join("\n")
    );
    expect(buildIncomeTooltip(incomeType, "USD")).toContain("Window net: 900 USD");
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
        "USD"
      )
    ).toContain("Focus metric: 4.50%");
  });

  it("builds deterministic svg path fragments", () => {
    const points = [
      { x: 1.111, y: 2.222 },
      { x: 3.333, y: 4.444 },
    ];

    expect(roundSvg(1.23456)).toBe(1.23);
    expect(buildLinePath(points)).toBe("M 1.111 2.222 L 3.333 4.444");
    expect(buildAreaPath(points)).toBe("M 1.111 164 L 1.111 2.222 L 3.333 4.444 L 3.333 164 Z");
    expect(buildLinePath([])).toBe("");
    expect(buildAreaPath([])).toBe("");
  });
});

function buildCashflowOutlook(): NonNullable<PortfolioWorkspace["cashflow_outlook"]> {
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

function buildIncomeType(): PortfolioIncomeSummaryView["income_types"][number] {
  return {
    income_type: "DIVIDEND",
    requested_window: {
      gross: { reporting_currency_amount: 1000, transaction_count: 1 },
      withholding_tax: { reporting_currency_amount: 100, transaction_count: 1 },
      other_deductions: { reporting_currency_amount: 0, transaction_count: 0 },
      net: { reporting_currency_amount: 900, transaction_count: 1 },
    },
    year_to_date: {
      gross: { reporting_currency_amount: 1000, transaction_count: 1 },
      withholding_tax: { reporting_currency_amount: 100, transaction_count: 1 },
      other_deductions: { reporting_currency_amount: 0, transaction_count: 0 },
      net: { reporting_currency_amount: 900, transaction_count: 1 },
    },
  };
}
