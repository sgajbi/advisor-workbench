import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import PortfolioHoldingsGrid from "../../src/apps/portfolio/components/portfolio-holdings-grid";

describe("PortfolioHoldingsGrid empty states", () => {
  it("distinguishes an empty exposure result from an empty portfolio", () => {
    const onClearFilter = vi.fn();

    render(
      <PortfolioHoldingsGrid
        reviewContext={{
          portfolioId: "PB_SG_GLOBAL_BAL_001",
          asOfDate: "2026-04-10",
        }}
        positions={[]}
        baseCurrency="USD"
        columnMode="expanded"
        filterLabel="Sector: Technology"
        onClearFilter={onClearFilter}
      />,
    );

    expect(screen.getByText("No contributing holdings found")).toBeInTheDocument();
    expect(
      screen.getByText("No booked holdings match Sector: Technology."),
    ).toBeInTheDocument();
    expect(screen.queryByText("No holdings in this portfolio")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Clear exposure" }));
    expect(onClearFilter).toHaveBeenCalledOnce();
  });

  it("retains the portfolio onboarding state when the source book is empty", () => {
    render(
      <PortfolioHoldingsGrid
        reviewContext={{
          portfolioId: "PB_SG_GLOBAL_BAL_001",
          asOfDate: "2026-04-10",
        }}
        positions={[]}
        baseCurrency="USD"
        columnMode="essential"
      />,
    );

    expect(screen.getByText("No holdings in this portfolio")).toBeInTheDocument();
    expect(screen.queryByText("No contributing holdings found")).not.toBeInTheDocument();
  });
});
