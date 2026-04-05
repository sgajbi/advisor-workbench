import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import PortfolioProjectedCashflowModule from "../../src/apps/portfolio/components/portfolio-projected-cashflow-module";

const getPortfolioProjectedCashflow = vi.fn();

vi.mock("../../src/apps/portfolio/api", () => ({
  getPortfolioProjectedCashflow: (...args: unknown[]) => getPortfolioProjectedCashflow(...args),
}));

describe("PortfolioProjectedCashflowModule", () => {
  afterEach(() => {
    getPortfolioProjectedCashflow.mockReset();
  });

  it("cycles the cashflow horizon and refreshes the module from gateway", async () => {
    getPortfolioProjectedCashflow.mockResolvedValue({
      as_of_date: "2026-03-28",
      range_end_date: "2026-04-27",
      total_net_cashflow_base: 1250,
      projection_days: 30,
      include_projected: true,
      upcoming_points: [
        {
          projection_date: "2026-03-29",
          net_cashflow_base: 1250,
          projected_cumulative_cashflow_base: 1250,
        },
      ],
    });

    render(
      <PortfolioProjectedCashflowModule
        portfolioId="MANUAL_PB_USD_001"
        baseCurrency="USD"
        asOfDate="2026-03-28"
        defaultExpanded={false}
        initialCashflowOutlook={{
          as_of_date: "2026-03-28",
          range_end_date: "2026-04-07",
          total_net_cashflow_base: 0,
          projection_days: 10,
          include_projected: true,
          upcoming_points: [],
        }}
      />
    );

    expect(screen.getByText("Next 10 days in USD")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Expand" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Period" }));

    await waitFor(() => {
      expect(getPortfolioProjectedCashflow).toHaveBeenCalledWith("MANUAL_PB_USD_001", {
        asOfDate: "2026-03-28",
        horizonDays: 30,
        includeProjected: true,
      });
    });
    expect(screen.getByText("Next 30 days in USD")).toBeInTheDocument();
  });

  it("uses the shared disclosure action for expanded projected cashflow detail", () => {
    render(
      <PortfolioProjectedCashflowModule
        portfolioId="MANUAL_PB_USD_001"
        baseCurrency="USD"
        asOfDate="2026-03-28"
        defaultExpanded
        initialCashflowOutlook={{
          as_of_date: "2026-03-28",
          range_end_date: "2026-04-07",
          total_net_cashflow_base: 250,
          projection_days: 10,
          include_projected: true,
          upcoming_points: [
            {
              projection_date: "2026-03-29",
              net_cashflow_base: 250,
              projected_cumulative_cashflow_base: 250,
            },
          ],
        }}
      />
    );

    expect(screen.getByRole("button", { name: "Collapse" })).toBeInTheDocument();
    expect(screen.getByRole("table", { name: "Cashflow outlook" })).toBeInTheDocument();
  });

  it("shows an error state when projected cashflow cannot be loaded", async () => {
    getPortfolioProjectedCashflow.mockResolvedValue(null);

    render(
      <PortfolioProjectedCashflowModule
        portfolioId="MANUAL_PB_USD_001"
        baseCurrency="USD"
        asOfDate="2026-03-28"
        defaultExpanded={false}
        initialCashflowOutlook={null}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: "Period" }));

    await waitFor(() => {
      expect(screen.getByText("Projected cashflow unavailable")).toBeInTheDocument();
    });
    expect(document.querySelector(".module-state-panel-error")).toBeTruthy();
  });

  it("renders flat projected cashflow through the shared status-panel contract", () => {
    render(
      <PortfolioProjectedCashflowModule
        portfolioId="MANUAL_PB_USD_001"
        baseCurrency="USD"
        asOfDate="2026-03-28"
        defaultExpanded={false}
        initialCashflowOutlook={{
          as_of_date: "2026-03-28",
          range_end_date: "2026-04-07",
          total_net_cashflow_base: 0,
          projection_days: 10,
          include_projected: true,
          upcoming_points: [
            {
              projection_date: "2026-03-29",
              net_cashflow_base: 0,
              projected_cumulative_cashflow_base: 0,
            },
          ],
        }}
      />
    );

    expect(screen.getByText("Flat projected cashflow")).toBeInTheDocument();
    expect(document.querySelector(".module-state-panel-partial")).toBeTruthy();
  });

  it("does not fetch projected cashflow while parent detailed data is still loading", async () => {
    render(
      <PortfolioProjectedCashflowModule
        portfolioId="MANUAL_PB_USD_001"
        baseCurrency="USD"
        asOfDate="2026-03-28"
        defaultExpanded={false}
        initialCashflowOutlook={null}
        suspendInitialFetch
      />
    );

    expect(screen.getByRole("heading", { name: "Projected Cashflow" })).toBeInTheDocument();
    expect(screen.getByText("Loading projected cashflow")).toBeInTheDocument();
    expect(
      screen.getByText("Projected liquidity is loading for the selected horizon.")
    ).toBeInTheDocument();
    await waitFor(() => expect(getPortfolioProjectedCashflow).not.toHaveBeenCalled());
    expect(getPortfolioProjectedCashflow).not.toHaveBeenCalled();
  });

  it("shows a shared refresh note while horizon data is refreshing over existing cashflow", () => {
    getPortfolioProjectedCashflow.mockImplementation(() => new Promise(() => {}));

    render(
      <PortfolioProjectedCashflowModule
        portfolioId="MANUAL_PB_USD_001"
        baseCurrency="USD"
        asOfDate="2026-03-28"
        defaultExpanded={false}
        initialCashflowOutlook={{
          as_of_date: "2026-03-28",
          range_end_date: "2026-04-07",
          total_net_cashflow_base: 500,
          projection_days: 10,
          include_projected: true,
          upcoming_points: [
            {
              projection_date: "2026-03-29",
              net_cashflow_base: 500,
              projected_cumulative_cashflow_base: 500,
            },
          ],
        }}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: "Period" }));
    expect(screen.getByText("Refreshing projected cashflow…")).toBeInTheDocument();
    expect(document.querySelector(".workbench-inline-refresh-note")).toBeTruthy();
  });
});
