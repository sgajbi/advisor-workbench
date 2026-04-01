import React from "react";
import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import PortfolioUnavailableWorkspace from "../../src/apps/portfolio/components/portfolio-unavailable-workspace";
import { FALLBACK_WORK_AREAS } from "../../src/apps/portfolio/workspace-config";

describe("PortfolioUnavailableWorkspace", () => {
  it("renders the degraded portfolio shell with fallback work areas", () => {
    render(<PortfolioUnavailableWorkspace />);

    expect(screen.getByRole("heading", { name: "Portfolios" })).toBeInTheDocument();
    expect(screen.getByText("Catalog unavailable")).toBeInTheDocument();
    expect(screen.getByText("Portfolio unavailable")).toBeInTheDocument();
    expect(screen.getByText("Core feed unavailable")).toBeInTheDocument();

    for (const area of FALLBACK_WORK_AREAS) {
      const card = screen.getByRole("heading", { name: area.title }).closest("article, section, div");
      expect(card).toBeTruthy();
      expect(screen.getByText(area.note)).toBeInTheDocument();
      expect(screen.getByRole("link", { name: `Open ${area.title}` })).toHaveAttribute("href", area.href);
      expect(screen.getAllByText(area.value).length).toBeGreaterThanOrEqual(1);
    }

    const serviceState = screen.getByRole("heading", { name: "Service State" }).closest("article, section, div");
    expect(serviceState).toBeTruthy();
    const stateScope = within(serviceState as HTMLElement);
    expect(stateScope.getByText("Portfolio catalog")).toBeInTheDocument();
    expect(stateScope.getByText("Unavailable")).toBeInTheDocument();
    expect(stateScope.getByText("Performance area")).toBeInTheDocument();
    expect(stateScope.getAllByText("Available").length).toBeGreaterThanOrEqual(2);
  });
});
