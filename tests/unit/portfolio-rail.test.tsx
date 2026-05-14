import React from "react";
import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import PortfolioRail from "@/apps/portfolio/components/portfolio-rail";

describe("PortfolioRail", () => {
  it("renders a semantic portfolio selector with a calm selected state", () => {
    render(
      <PortfolioRail
        selectedPortfolioId="PORT_UI_1002"
        portfolios={[
          {
            portfolio_id: "PORT_UI_1001",
            display_name: "Global Balanced",
            base_currency: "USD",
            client_id: "CIF_1001",
            booking_center_code: "SG",
          },
          {
            portfolio_id: "PORT_UI_1002",
            display_name: "Income Plus",
            base_currency: "CHF",
            client_id: "CIF_1002",
            booking_center_code: "CH",
          },
        ]}
      />
    );

    const selector = screen.getByRole("navigation", { name: "Portfolio selector" });
    expect(selector).toBeInTheDocument();
    expect(within(selector).getByText("Book selector")).toHaveClass("portfolio-selector-kicker");
    expect(within(selector).getByRole("heading", { name: "Portfolios" })).toBeInTheDocument();
    expect(selector.querySelector(".portfolio-selector-list")).toBeTruthy();
    expect(selector.querySelectorAll(".portfolio-selector-list-item")).toHaveLength(2);

    const unselectedPortfolio = within(selector).getByRole("link", { name: /Global Balanced/i });
    expect(unselectedPortfolio).toHaveAttribute("href", "/portfolio?portfolioId=PORT_UI_1001");
    expect(unselectedPortfolio).not.toHaveAttribute("aria-current");
    const selectedPortfolio = within(selector).getByRole("link", { name: /Income Plus/i });
    expect(selectedPortfolio).toHaveAttribute("href", "/portfolio?portfolioId=PORT_UI_1002");
    expect(selectedPortfolio).toHaveAttribute("aria-current", "page");
    expect(selectedPortfolio).toHaveClass("portfolio-rail-item-active");
    expect(within(selectedPortfolio).getByText("PORT_UI_1002")).toBeInTheDocument();
    expect(within(selectedPortfolio).getByText("CHF").closest(".portfolio-rail-item-detail")).toBeTruthy();
    expect(within(selectedPortfolio).getByText("CH")).toBeInTheDocument();
  });
});
