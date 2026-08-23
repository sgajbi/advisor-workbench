import React from "react";
import { render, screen, within } from "@testing-library/react";

import ProposalWorkspaceShell from "@/features/proposals/components/proposal-workspace-shell";
import { buildSimulationProposalWorkflowContext } from "@/features/proposals/proposal-workflow-context-view-model";
import { buildPortfolioWorkspace } from "../fixtures/portfolio-workspace-component-fixtures";

const portfolioApiMocks = vi.hoisted(() => ({
  getPortfolioBook: vi.fn(),
  getPortfolioWorkspaceShell: vi.fn(),
}));

vi.mock("@/apps/portfolio/api", () => portfolioApiMocks);

vi.mock("next/navigation", () => ({
  usePathname: () => "/proposals/simulate",
  useSearchParams: () =>
    new URLSearchParams({
      portfolioId: "PB_SG_GLOBAL_BAL_001",
      asOfDate: "2026-05-12",
      reportingCurrency: "USD",
    }),
}));

describe("proposal workspace shell", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("keeps the shell strip and child workspace aligned to recovered book context", async () => {
    const workspace = buildPortfolioWorkspace();
    const book = {
      as_of_date: workspace.as_of_date,
      portfolio: workspace.portfolio,
      summary: {
        assets_under_management_base: 1_000_000,
        invested_market_value_base: 900_000,
        cash_market_value_base: 100_000,
        cash_weight_pct: 10,
        position_count: 1,
        cash_balance_count: 1,
      },
      cash_balances: [],
      allocation_views: [],
      top_positions: [],
      positions: [],
    };
    portfolioApiMocks.getPortfolioWorkspaceShell.mockResolvedValue(null);
    portfolioApiMocks.getPortfolioBook.mockResolvedValue(book);

    render(
      await ProposalWorkspaceShell({
        reviewContext: {
          portfolioId: workspace.portfolio.portfolio_id,
          asOfDate: workspace.as_of_date,
          reportingCurrency: workspace.portfolio.base_currency,
        },
        activeScreen: "proposal",
        activeMode: "proposal-builder",
        title: "Proposal Workspace",
        subtitle: "Build and test an advisor-use proposal before routing it for review.",
        workflowContext: buildSimulationProposalWorkflowContext({
          portfolioId: workspace.portfolio.portfolio_id,
        }),
        workflowContextPresentation: "inline-boundary",
        children: (portfolioContext) => (
          <output
            data-testid="proposal-child-context"
            data-portfolio-id={portfolioContext?.portfolio.portfolio_id}
            data-as-of-date={portfolioContext?.as_of_date}
            data-currency={portfolioContext?.portfolio.base_currency}
          />
        ),
      }),
    );

    const strip = screen.getByTestId("review-context-strip");
    expect(within(strip).getByText("Global Balanced Mandate")).toBeInTheDocument();
    expect(within(strip).getByText("12 May 2026")).toBeInTheDocument();
    expect(within(strip).getByText("USD")).toBeInTheDocument();
    expect(within(strip).getByText("Mandate context limited")).toBeInTheDocument();
    expect(within(strip).queryByText("Portfolio not confirmed")).not.toBeInTheDocument();
    expect(strip).toHaveAttribute("data-source-state", "partial");

    expect(screen.getByTestId("proposal-child-context")).toHaveAttribute(
      "data-portfolio-id",
      workspace.portfolio.portfolio_id,
    );
    expect(screen.getByTestId("proposal-child-context")).toHaveAttribute(
      "data-as-of-date",
      workspace.as_of_date,
    );
    expect(screen.getByTestId("proposal-child-context")).toHaveAttribute(
      "data-currency",
      workspace.portfolio.base_currency,
    );
  });
});
