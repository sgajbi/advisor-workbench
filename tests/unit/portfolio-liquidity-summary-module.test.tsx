import React from "react";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import PortfolioLiquiditySummaryModule from "../../src/apps/portfolio/components/portfolio-liquidity-summary-module";
import { supported, unavailable } from "../../src/shell/workspace-capabilities";

describe("PortfolioLiquiditySummaryModule", () => {
  it("renders contract-backed liquidity metrics when projected cashflow is supported", () => {
    render(
      <PortfolioLiquiditySummaryModule
        capability={supported("Projected cashflow is available in the liquidity payload.")}
        cashflowOutlook={{
          as_of_date: "2026-03-28",
          range_end_date: "2026-04-07",
          total_net_cashflow_base: -25000,
          projection_days: 10,
          include_projected: true,
          upcoming_points: [
            {
              projection_date: "2026-03-29",
              net_cashflow_base: -15000,
              projected_cumulative_cashflow_base: -15000,
            },
          ],
        }}
        totalCashBase={105000}
        cashWeightPct={8.4}
        baseCurrency="USD"
        asOfDate="2026-03-28"
      />
    );

    expect(screen.getByRole("heading", { name: "Liquidity and Projected Cash" })).toBeInTheDocument();
    expect(screen.getByText("105,000 USD")).toBeInTheDocument();
    expect(screen.getByText("8.40%")).toBeInTheDocument();
    expect(screen.getByText("-25,000 USD")).toBeInTheDocument();
    expect(screen.getByText("10 days")).toBeInTheDocument();
    expect(screen.queryByText("Projected cashflow unavailable")).not.toBeInTheDocument();
  });

  it("renders an honest unavailable state instead of fake liquidity metrics when cashflow is unsupported", () => {
    render(
      <PortfolioLiquiditySummaryModule
        capability={unavailable("No projected cashflow outlook is available in the current contract.")}
        cashflowOutlook={null}
        totalCashBase={105000}
        cashWeightPct={8.4}
        baseCurrency="USD"
        asOfDate="2026-03-28"
      />
    );

    expect(screen.getByText("Projected cashflow unavailable")).toBeInTheDocument();
    expect(
      screen.getByText("No projected cashflow outlook is available in the current contract.")
    ).toBeInTheDocument();
    expect(screen.getByText("Publish forward cashflow projections to support projected liquidity review.")).toBeInTheDocument();
    expect(screen.queryByText("N/A")).not.toBeInTheDocument();
  });
});
