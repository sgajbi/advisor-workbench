import { render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import ProposalWorkspaceShell from "@/features/proposals/components/proposal-workspace-shell";
import { buildPortfolioWorkspace } from "../fixtures/portfolio-workspace-component-fixtures";
import { expectReviewContextOwns } from "../review-context-census";

const portfolioApiMocks = vi.hoisted(() => ({
  getPortfolioWorkspaceShell: vi.fn(),
}));

vi.mock("@/apps/portfolio/api", () => portfolioApiMocks);

vi.mock("@/apps/portfolio/components/portfolio-screen-rail", () => ({
  default: () => <nav aria-label="Portfolio workspace navigation" />,
}));

describe("ProposalWorkspaceShell", () => {
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
});
