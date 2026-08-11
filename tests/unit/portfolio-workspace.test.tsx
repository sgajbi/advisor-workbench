import React from "react";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import PortfolioWorkspaceView from "../../src/apps/portfolio/components/portfolio-workspace";
import { buildPortfolioWorkspaceContext } from "../fixtures/portfolio-workspace-component-fixtures";

describe("PortfolioWorkspaceView", () => {
  it("keeps a visible My Book recovery action when selected portfolio context is unavailable", () => {
    render(
      <PortfolioWorkspaceView
        workspace={null}
        context={buildPortfolioWorkspaceContext()}
      />
    );

    expect(screen.getByText("Selected portfolio unavailable")).toBeInTheDocument();
    expect(screen.getByTestId("portfolio-shell-unavailable")).toHaveTextContent(
      "no other portfolio has been substituted",
    );
    expect(screen.getAllByRole("link", { name: "Open My book" })).not.toHaveLength(0);
    for (const link of screen.getAllByRole("link", { name: "Open My book" })) {
      expect(link).toHaveAttribute("href", "/book");
    }
    expect(screen.getByRole("status")).toHaveTextContent(
      "The selected portfolio is unavailable",
    );
  });

  it("shows source confirmation as loading before terminal recovery actions", () => {
    render(
      <PortfolioWorkspaceView
        workspace={null}
        workspaceStatus="loading"
        context={buildPortfolioWorkspaceContext()}
      />,
    );

    expect(screen.getByText("Preparing portfolio review")).toBeInTheDocument();
    expect(screen.getByText("Confirming the selected portfolio.")).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Open My book" })).not.toBeInTheDocument();
    expect(screen.queryByTestId("portfolio-shell-unavailable")).not.toBeInTheDocument();
  });
});
