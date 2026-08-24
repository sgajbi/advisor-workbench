import React from "react";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { buildMetricDrawer } from "../../src/apps/portfolio/components/portfolio-metric-drawer-builders";
import {
  buildPortfolioWorkspace,
  buildPortfolioWorkspaceContext,
} from "../fixtures/portfolio-workspace-component-fixtures";

describe("portfolio metric drawer builders", () => {
  it("explains the selected portfolio value without presenting it as AUM", () => {
    const drawer = buildMetricDrawer(
      "portfolio_value",
      buildPortfolioWorkspace(),
      buildPortfolioWorkspaceContext(),
    );

    expect(drawer).toMatchObject({
      title: "Portfolio value",
      subtitle:
        "Total portfolio market value in the portfolio base currency at the stated valuation date.",
    });
    expect(drawer.summaryItems).toContainEqual({
      label: "Value",
      value: "1,000,000 USD",
    });

    render(<>{drawer.tabs.find((tab) => tab.key === "definition")?.content}</>);

    expect(
      screen.getByText(
        "Portfolio value is the current base-currency market value of the selected portfolio.",
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        "It combines invested holdings and available cash at the stated valuation date.",
      ),
    ).toBeInTheDocument();
    expect(screen.queryByText(/assets under management/i)).not.toBeInTheDocument();
  });
});
