import { render, screen } from "@testing-library/react";
import { vi } from "vitest";

import PortfolioRecordScreenShell from "../../src/apps/portfolio/components/portfolio-record-screen-shell";
import { buildPortfolioWorkspace } from "../fixtures/portfolio-workspace-component-fixtures";

vi.mock("../../src/apps/portfolio/components/portfolio-screen-rail", () => ({
  default: ({ portfolioId }: { portfolioId: string }) => (
    <nav aria-label="Portfolio recovery navigation">{portfolioId}</nav>
  ),
}));

describe("PortfolioRecordScreenShell", () => {
  it("keeps source identity in the shell review context and out of record content", () => {
    const workspace = buildPortfolioWorkspace();

    render(
      <PortfolioRecordScreenShell
        screen="positions"
        portfolioId={workspace.portfolio.portfolio_id}
        portfolioContext={workspace}
        workspace={workspace}
      />,
    );

    const recordContent = document.querySelector(".portfolio-record-screen-main");
    expect(recordContent).not.toBeNull();
    expect(recordContent).toHaveTextContent("Positions");
    expect(recordContent).toHaveTextContent("Invested");
    expect(recordContent).not.toHaveTextContent("Global Balanced Mandate");
    expect(recordContent).not.toHaveTextContent("CIF_SG_000184");
    expect(recordContent).not.toHaveTextContent("12 May 2026");
  });

  it.each([
    "allocation",
    "positions",
    "transactions",
    "income",
    "cashflow",
  ] as const)(
    "retains confirmed portfolio context while the %s record surface explains recovery",
    (screenKind) => {
      const portfolioContext = buildPortfolioWorkspace();

      render(
        <PortfolioRecordScreenShell
          screen={screenKind}
          portfolioId={portfolioContext.portfolio.portfolio_id}
          portfolioContext={portfolioContext}
          workspace={null}
          reviewContextError="The selected date, period, or reporting currency is not supported for these portfolio records."
        />,
      );

      const reviewContext = screen.getByTestId("review-context-strip");
      expect(reviewContext).toHaveTextContent("Global Balanced Mandate");
      expect(reviewContext).toHaveTextContent("CIF_SG_000184");
      expect(reviewContext).not.toHaveTextContent("Portfolio not confirmed");
      expect(
        screen.getByRole("navigation", {
          name: "Portfolio recovery navigation",
        }),
      ).toHaveTextContent(portfolioContext.portfolio.portfolio_id);
      expect(
        screen.getByText(
          "The selected date, period, or reporting currency is not supported for these portfolio records.",
        ),
      ).toBeInTheDocument();
      expect(
        document.querySelector(".portfolio-record-key-figures"),
      ).not.toBeInTheDocument();
      expect(
        screen.getByRole("link", { name: "Open My book" }),
      ).toHaveAttribute("href", "/book");
    },
  );

  it.each(["income", "positions", "cashflow", "transactions"] as const)(
    "withholds %s portfolio navigation when no source identity is confirmed",
    (screenKind) => {
      render(
        <PortfolioRecordScreenShell
          screen={screenKind}
          portfolioId={null}
          portfolioContext={null}
          workspace={null}
          reviewContextError="Select a source-confirmed portfolio from My book before opening portfolio records."
        />,
      );

      expect(
        screen.queryByRole("navigation", {
          name: "Portfolio recovery navigation",
        }),
      ).not.toBeInTheDocument();
      expect(screen.queryByText("No portfolio")).not.toBeInTheDocument();
      expect(
        screen.getByRole("link", { name: "Open My book" }),
      ).toHaveAttribute("href", "/book");
    },
  );
});
