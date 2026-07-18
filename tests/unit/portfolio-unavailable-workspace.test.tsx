import React from "react";
import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import PortfolioUnavailableWorkspace from "../../src/apps/portfolio/components/portfolio-unavailable-workspace";
import { FALLBACK_WORK_AREAS } from "../../src/apps/portfolio/workspace-config";

describe("PortfolioUnavailableWorkspace", () => {
  it("renders the degraded portfolio shell with fallback work areas", () => {
    render(<PortfolioUnavailableWorkspace />);

    const selector = screen.getByRole("navigation", { name: "Portfolio selector" });
    expect(screen.getByRole("heading", { name: "Selection unavailable" })).toBeInTheDocument();
    expect(selector.closest(".portfolio-selector-rail")).toBeTruthy();
    expect(screen.getByText("Portfolio context could not be confirmed")).toBeInTheDocument();
    expect(
      screen.getByText(/A global list is not substituted when book scope is unavailable/i)
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Open My book" })).toHaveAttribute("href", "/book");
    expect(screen.getByRole("status")).toHaveClass("portfolio-selector-empty");
    expect(screen.getByText("Portfolio context unavailable")).toBeInTheDocument();
    expect(screen.getByText("Source unavailable")).toBeInTheDocument();

    for (const area of FALLBACK_WORK_AREAS) {
      const card = screen.getByRole("heading", { name: area.title }).closest(".section-block");
      expect(card).toBeTruthy();
      expect(screen.getByText(area.note)).toBeInTheDocument();
      expect(screen.getByRole("link", { name: `Open ${area.title}` })).toHaveAttribute("href", area.href);
      expect(screen.getAllByText(area.value).length).toBeGreaterThanOrEqual(1);
    }

    const serviceState = screen.getByRole("heading", { name: "Service State" }).closest(".section-block");
    expect(serviceState).toBeTruthy();
    const stateScope = within(serviceState as HTMLElement);
    expect(stateScope.getByText("Portfolio context")).toBeInTheDocument();
    expect(stateScope.getByText("Unavailable")).toBeInTheDocument();
    expect(stateScope.getByText("Performance area")).toBeInTheDocument();
    expect(stateScope.getAllByText("Available").length).toBeGreaterThanOrEqual(2);
  });
});
