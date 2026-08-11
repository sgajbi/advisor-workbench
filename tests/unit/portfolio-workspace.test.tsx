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

    expect(screen.getByText("Portfolio context unavailable")).toBeInTheDocument();
    expect(screen.getAllByRole("link", { name: "Return to My Book" })).not.toHaveLength(0);
    for (const link of screen.getAllByRole("link", { name: "Return to My Book" })) {
      expect(link).toHaveAttribute("href", "/book");
    }
  });
});
