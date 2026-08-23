import { render, screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import ProposalWorkspaceShell from "@/features/proposals/components/proposal-workspace-shell";
import { buildPortfolioWorkspace } from "../fixtures/portfolio-workspace-component-fixtures";
import { expectReviewContextOwns } from "../review-context-census";

const portfolioApiMocks = vi.hoisted(() => ({
  getPortfolioBook: vi.fn(),
  getPortfolioWorkspaceShell: vi.fn(),
}));

vi.mock("@/apps/portfolio/api", () => portfolioApiMocks);

vi.mock("@/apps/portfolio/components/portfolio-screen-rail", () => ({
  default: () => <nav aria-label="Portfolio workspace navigation" />,
}));

describe("ProposalWorkspaceShell", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    portfolioApiMocks.getPortfolioBook.mockResolvedValue(null);
  });

  it("renders confirmed portfolio context once and keeps the rail decision-focused", async () => {
    const portfolioContext = buildPortfolioWorkspace();
    portfolioApiMocks.getPortfolioWorkspaceShell.mockResolvedValueOnce(portfolioContext);

    render(
      await ProposalWorkspaceShell({
        reviewContext: {
          portfolioId: portfolioContext.portfolio.portfolio_id,
          asOfDate: "2026-04-11",
          period: "YTD",
          reportingCurrency: "SGD",
        },
        activeScreen: "advisory",
        title: "Advisory Overview",
        subtitle: "Prioritise the next client decision.",
        children: <section>Decision workspace</section>,
      }),
    );

    expect(portfolioApiMocks.getPortfolioWorkspaceShell).toHaveBeenCalledTimes(1);
    expect(portfolioApiMocks.getPortfolioWorkspaceShell).toHaveBeenCalledWith(
      portfolioContext.portfolio.portfolio_id,
    );
    expect(portfolioApiMocks.getPortfolioBook).not.toHaveBeenCalled();
    expect(screen.getByTestId("review-context-strip")).toHaveTextContent(
      "Global Balanced Mandate",
    );
    expect(screen.getByTestId("review-context-strip")).toHaveTextContent(
      "Advisory workspace scope",
    );
    expect(screen.getByText("Decision posture")).toBeInTheDocument();
    const decisionSummary = screen.getByLabelText("Advisory decision summary");
    expect(within(decisionSummary).queryByText("Portfolio")).not.toBeInTheDocument();
    expect(screen.getByText("Advisor use only")).toBeInTheDocument();
    expectReviewContextOwns({
      exclusiveFacts: [
        portfolioContext.portfolio.portfolio_id,
        portfolioContext.portfolio.client_id,
        "Singapore",
      ],
      contextualFacts: [{ label: "Business date", value: "12 May 2026" }],
    });
  });

  it("keeps advisory content usable without inventing identity when supporting context fails", async () => {
    portfolioApiMocks.getPortfolioWorkspaceShell.mockResolvedValueOnce(null);

    render(
      await ProposalWorkspaceShell({
        reviewContext: { portfolioId: "PB_REQUESTED_001" },
        activeScreen: "advisory",
        title: "Advisory Overview",
        subtitle: "Prioritise the next client decision.",
        children: <section>Source-owned advisory evidence</section>,
      }),
    );

    expect(screen.getByTestId("review-context-strip")).toHaveTextContent(
      "Portfolio not confirmed",
    );
    expect(screen.getByText("Source-owned advisory evidence")).toBeInTheDocument();
    expect(screen.queryByText("PB_REQUESTED_001")).not.toBeInTheDocument();
  });

  it("aligns partial shell context and proposal content to an identity-matched book", async () => {
    const portfolioContext = buildPortfolioWorkspace();
    const portfolioBook = {
      as_of_date: portfolioContext.as_of_date,
      portfolio: portfolioContext.portfolio,
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
    portfolioApiMocks.getPortfolioWorkspaceShell.mockResolvedValueOnce(null);
    portfolioApiMocks.getPortfolioBook.mockResolvedValueOnce(portfolioBook);

    render(
      await ProposalWorkspaceShell({
        reviewContext: {
          portfolioId: portfolioContext.portfolio.portfolio_id,
          asOfDate: portfolioContext.as_of_date,
          reportingCurrency: portfolioContext.portfolio.base_currency,
        },
        activeScreen: "proposal",
        activeMode: "proposal-builder",
        title: "Proposal Workspace",
        subtitle: "Build and test an advisor-use proposal before routing it for review.",
        workflowContextPresentation: "inline-boundary",
        children: (recoveredContext) => (
          <output
            data-testid="proposal-child-context"
            data-portfolio-id={recoveredContext?.portfolio.portfolio_id}
            data-as-of-date={recoveredContext?.as_of_date}
            data-currency={recoveredContext?.portfolio.base_currency}
          />
        ),
      }),
    );

    expect(portfolioApiMocks.getPortfolioBook).toHaveBeenCalledWith(
      portfolioContext.portfolio.portfolio_id,
      {
        asOfDate: portfolioContext.as_of_date,
        reportingCurrency: portfolioContext.portfolio.base_currency,
      },
    );
    const strip = screen.getByTestId("review-context-strip");
    expect(strip).toHaveAttribute("data-source-state", "partial");
    expect(within(strip).getByText("Global Balanced Mandate")).toBeInTheDocument();
    expect(within(strip).getByText("12 May 2026")).toBeInTheDocument();
    expect(within(strip).getByText("USD")).toBeInTheDocument();
    expect(within(strip).getByText("Mandate context limited")).toBeInTheDocument();
    expect(within(strip).queryByText("Portfolio not confirmed")).not.toBeInTheDocument();
    expect(screen.getByTestId("proposal-child-context")).toHaveAttribute(
      "data-portfolio-id",
      portfolioContext.portfolio.portfolio_id,
    );
    expect(screen.getByTestId("proposal-child-context")).toHaveAttribute(
      "data-as-of-date",
      portfolioContext.as_of_date,
    );
    expect(screen.getByTestId("proposal-child-context")).toHaveAttribute(
      "data-currency",
      portfolioContext.portfolio.base_currency,
    );
  });
});
