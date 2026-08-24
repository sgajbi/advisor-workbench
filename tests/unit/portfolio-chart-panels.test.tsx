import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import {
  PortfolioProjectedCashflowPanel,
  PortfolioTopHoldingsPanel,
} from "../../src/apps/portfolio/components/portfolio-chart-panels";
import type { PortfolioWorkspace } from "../../src/apps/portfolio/types";

describe("portfolio chart panels", () => {
  it("filters top holdings via chart interaction", () => {
    const onSelectionChange = vi.fn();

    render(
      <PortfolioTopHoldingsPanel
        positions={[
          {
            security_id: "EQ_1",
            instrument_name: "Apple Inc",
            asset_class: "Equities",
            quantity: 120,
            market_value_base: 250000,
            weight_pct: 20,
          },
        ]}
        baseCurrency="USD"
        selectedSecurityId={null}
        onSelectionChange={onSelectionChange}
      />,
    );

    fireEvent.click(
      screen.getByRole("listitem", { name: /Apple Inc: 250,000 USD. Select to filter positions./i }),
    );

    expect(onSelectionChange).toHaveBeenCalledWith("EQ_1");
    expect(screen.getByLabelText("Ranked positions chart")).toBeInTheDocument();
    expect(screen.queryByLabelText("Top holdings table")).not.toBeInTheDocument();
    expect(screen.getByText("Ranked positions")).toBeInTheDocument();
    expect(screen.getByText("Market value focus")).toBeInTheDocument();
    expect(screen.getByText("Equities")).toBeInTheDocument();
    expect(screen.getByText("120")).toBeInTheDocument();
  });

  it("renders a truthful empty state when no top positions match the current view", () => {
    const onSelectionChange = vi.fn();

    render(
      <PortfolioTopHoldingsPanel
        positions={[]}
        baseCurrency="USD"
        selectedSecurityId={null}
        onSelectionChange={onSelectionChange}
      />,
    );

    expect(screen.getByRole("status")).toHaveTextContent("No top positions available for this view");
    expect(
      screen.getByText(
        "Ranked positions require source-backed positions with current market values. Adjust the allocation filter or publish valuations to populate this view.",
      ),
    ).toBeInTheDocument();
    expect(screen.queryByLabelText("Ranked positions chart")).not.toBeInTheDocument();
    expect(onSelectionChange).not.toHaveBeenCalled();
  });

  it("renders projected cashflow with business labels", () => {
    render(
      <PortfolioProjectedCashflowPanel
        cashflowOutlook={buildCashflowOutlook()}
        baseCurrency="USD"
      />
    );

    expect(
      screen.getByRole("img", {
        name: "Projected cash movement chart in USD; bars show dated net movement and the line shows cumulative movement",
      }),
    ).toBeInTheDocument();
    expect(screen.getByLabelText("Cash movement chart key")).toHaveTextContent(
      "Bars: dated net movementLine: cumulative movement",
    );
    expect(screen.getByLabelText("Projected cash movement mix")).toHaveTextContent("1 positive movement date");
    expect(screen.getByLabelText("Projected cash movement summary")).toHaveTextContent(
      "Net Projected Movement"
    );
    expect(screen.getByLabelText("Projected cash movement summary")).toHaveTextContent(
      "Largest Negative Movement"
    );
    expect(screen.getByLabelText("Projected cash movement summary")).toHaveTextContent(
      "Positive Net Movement"
    );
    expect(screen.getByLabelText("Projected cash movement summary")).toHaveTextContent(
      "Negative Net Movement"
    );
    expect(screen.queryByText("Ending Cumulative")).not.toBeInTheDocument();
  });
});

function buildCashflowOutlook(): NonNullable<PortfolioWorkspace["cashflow_outlook"]> {
  return {
    as_of_date: "2026-02-24",
    range_end_date: "2026-03-05",
    total_net_cashflow_base: -10000,
    projection_days: 10,
    include_projected: true,
    upcoming_points: [
      {
        projection_date: "2026-02-25",
        net_cashflow_base: -15000,
        projected_cumulative_cashflow_base: -15000,
      },
      {
        projection_date: "2026-02-26",
        net_cashflow_base: 5000,
        projected_cumulative_cashflow_base: -10000,
      },
    ],
  };
}
